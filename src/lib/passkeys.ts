/**
 * Passkeys (WebAuthn) on the client.
 *
 * The browser ceremony is run by @simplewebauthn/browser; the server half lives in
 * functions/api/auth/passkey/* (sign-in) and functions/api/passkeys/* (manage).
 */
import {
  startAuthentication, startRegistration, browserSupportsWebAuthn, browserSupportsWebAuthnAutofill,
  WebAuthnAbortService,
} from '@simplewebauthn/browser'
import { ApiError } from './api'

export interface Passkey {
  id: string
  name: string
  created_at: number
  last_used_at: number | null
  synced: boolean
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({})) as T & { error?: string; code?: string }
  if (!res.ok) throw new ApiError(data.error ?? `HTTP ${res.status}`, data.code, res.status)
  return data
}

export const passkeysSupported = (): boolean => browserSupportsWebAuthn()
export const passkeyAutofillSupported = (): Promise<boolean> => browserSupportsWebAuthnAutofill()

/** True when this device can make a passkey itself (Face ID, Touch ID, Windows Hello, Android). */
export async function platformPasskeyAvailable(): Promise<boolean> {
  if (!browserSupportsWebAuthn()) return false
  try { return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable() } catch { return false }
}

/** The user dismissed the system sheet, or another ceremony replaced this one. Not an error to show. */
export function isPasskeyCancel(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  // WebAuthnError takes the DOMException's name (NotAllowedError when the sheet is dismissed).
  return err.name === 'NotAllowedError' || err.name === 'AbortError'
    || (err as { code?: string }).code === 'ERROR_CEREMONY_ABORTED'
}

/** Stop a pending autofill (conditional) request, e.g. before a manual ceremony or on unmount. */
export function cancelPasskeyRequest(): void {
  WebAuthnAbortService.cancelCeremony()
}

// WebAuthn Signal API (Chrome 132+, Safari 26+): keeps password managers in sync with
// the server, so removed passkeys stop being offered. Feature-detected; no-ops elsewhere.
type SignalPKC = typeof PublicKeyCredential & {
  signalUnknownCredential?: (o: { rpId: string; credentialId: string }) => Promise<void>
  signalAllAcceptedCredentials?: (o: { rpId: string; userId: string; allAcceptedCredentialIds: string[] }) => Promise<void>
}
const signals = (): SignalPKC | null => (typeof PublicKeyCredential !== 'undefined' ? PublicKeyCredential as SignalPKC : null)

/**
 * Sign in with a passkey. `autofill` waits quietly for the user to pick a passkey from
 * the email field's autofill menu (conditional UI); otherwise the system sheet opens now.
 */
export async function signInWithPasskey({ autofill = false } = {}): Promise<{ sessionId: string }> {
  const { challengeId, options } = await post<{ challengeId: string; options: Parameters<typeof startAuthentication>[0]['optionsJSON'] }>(
    '/api/auth/passkey/options', {},
  )
  const response = await startAuthentication({ optionsJSON: options, useBrowserAutofill: autofill })
  try {
    return await post<{ sessionId: string }>('/api/auth/passkey/verify', { challengeId, response })
  } catch (err) {
    if (err instanceof ApiError && err.code === 'unknown_credential') {
      signals()?.signalUnknownCredential?.({ rpId: location.hostname, credentialId: response.id }).catch(() => {})
    }
    throw err
  }
}

/**
 * Create a passkey for the signed-in account. `auto` asks the password manager the user
 * just signed in with to upgrade silently (conditional create) — it fails quietly if it won't.
 */
export async function createPasskey({ auto = false } = {}): Promise<Passkey> {
  const { challengeId, options } = await post<{ challengeId: string; options: Parameters<typeof startRegistration>[0]['optionsJSON'] }>(
    '/api/passkeys', { step: 'options' },
  )
  const response = await startRegistration({ optionsJSON: options, useAutoRegister: auto })
  const { passkey } = await post<{ passkey: Passkey }>('/api/passkeys', { step: 'verify', challengeId, response })
  return passkey
}

export async function listPasskeys(): Promise<{ passkeys: Passkey[]; userHandle: string }> {
  const res = await fetch('/api/passkeys', { credentials: 'include' })
  const data = await res.json().catch(() => ({})) as { passkeys?: Passkey[]; userHandle?: string; error?: string }
  if (!res.ok) throw new ApiError(data.error ?? `HTTP ${res.status}`, undefined, res.status)
  return { passkeys: data.passkeys ?? [], userHandle: data.userHandle ?? '' }
}

export async function renamePasskey(id: string, name: string): Promise<Passkey> {
  const res = await fetch(`/api/passkeys/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  const data = await res.json().catch(() => ({})) as { passkey?: Passkey; error?: string }
  if (!res.ok || !data.passkey) throw new ApiError(data.error ?? `HTTP ${res.status}`, undefined, res.status)
  return data.passkey
}

export async function deletePasskey(id: string, userHandle: string): Promise<void> {
  const res = await fetch(`/api/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
  const data = await res.json().catch(() => ({})) as { remainingIds?: string[]; error?: string }
  if (!res.ok) throw new ApiError(data.error ?? `HTTP ${res.status}`, undefined, res.status)
  if (userHandle && data.remainingIds) {
    signals()?.signalAllAcceptedCredentials?.({
      rpId: location.hostname, userId: userHandle, allAcceptedCredentialIds: data.remainingIds,
    }).catch(() => {})
  }
}

// ── Post-sign-in nudge ───────────────────────────────────────────────────────
// After a password or email-link sign-in we offer a passkey; "Not now" snoozes it for 30 days.
const NUDGE_PENDING = 'pantry_passkey_nudge'
const NUDGE_DISMISSED = 'passkey-nudge-dismissed'
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000

export function queuePasskeyNudge(): void {
  try { sessionStorage.setItem(NUDGE_PENDING, '1') } catch { /* storage blocked */ }
}
export function takePasskeyNudge(): boolean {
  try {
    const dismissed = Number(localStorage.getItem(NUDGE_DISMISSED) ?? 0)
    if (Date.now() - dismissed < SNOOZE_MS) { sessionStorage.removeItem(NUDGE_PENDING); return false }
    return sessionStorage.getItem(NUDGE_PENDING) === '1'
  } catch { return false }
}
export function clearPasskeyNudge({ snooze = false } = {}): void {
  try {
    sessionStorage.removeItem(NUDGE_PENDING)
    if (snooze) localStorage.setItem(NUDGE_DISMISSED, String(Date.now()))
  } catch { /* storage blocked */ }
}
