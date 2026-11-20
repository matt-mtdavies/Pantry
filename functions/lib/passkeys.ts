/**
 * Passkeys (WebAuthn) — shared helpers.
 *
 * Verification is done by @simplewebauthn/server (WebCrypto, runs on Workers).
 * Tables are created lazily (and by /api/admin/migrate), so no migrate step is needed.
 *
 * - Passkeys are discoverable credentials ("resident keys"): sign-in needs no email,
 *   and the browser can offer them in the email field's autofill (conditional UI).
 * - The relying-party ID is the request's own hostname, so passkeys made on
 *   myopenpantry.com work there (preview deployments get their own, separate ones).
 * - Challenges are single-use, server-stored, and expire after 5 minutes.
 */
import type { Env } from '../env'
import { DEMO_USER_ID } from '../../shared/demoIdentity'

export const RP_NAME = 'Pantry'
const CHALLENGE_TTL = 5 * 60

export const CREATE_PASSKEYS = `
  CREATE TABLE IF NOT EXISTS passkeys (
    id TEXT PRIMARY KEY,               -- credential ID (base64url)
    user_id TEXT NOT NULL,
    public_key TEXT NOT NULL,          -- COSE public key (base64url)
    counter INTEGER NOT NULL DEFAULT 0,
    transports TEXT,                   -- JSON array
    device_type TEXT,                  -- 'singleDevice' | 'multiDevice'
    backed_up INTEGER NOT NULL DEFAULT 0,
    aaguid TEXT,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER
  )`
export const CREATE_PASSKEYS_INDEX = `CREATE INDEX IF NOT EXISTS idx_passkeys_user ON passkeys (user_id)`
export const CREATE_WEBAUTHN_CHALLENGES = `
  CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id TEXT PRIMARY KEY,
    challenge TEXT NOT NULL,
    user_id TEXT,                      -- set for registration, null for sign-in
    purpose TEXT NOT NULL,             -- 'register' | 'authenticate'
    expires_at INTEGER NOT NULL
  )`

export interface PasskeyRow {
  id: string
  user_id: string
  public_key: string
  counter: number
  transports: string | null
  device_type: string | null
  backed_up: number
  aaguid: string | null
  name: string
  created_at: number
  last_used_at: number | null
}

let ensured = false
export async function ensurePasskeyTables(db: D1Database): Promise<void> {
  if (ensured) return
  await db.batch([
    db.prepare(CREATE_PASSKEYS),
    db.prepare(CREATE_PASSKEYS_INDEX),
    db.prepare(CREATE_WEBAUTHN_CHALLENGES),
  ])
  ensured = true
}

/** Relying party for this request: hostname + exact origin. */
export function relyingParty(request: Request): { rpID: string; origin: string } {
  const url = new URL(request.url)
  return { rpID: url.hostname, origin: url.origin }
}

export function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function storeChallenge(
  db: D1Database, challenge: string, purpose: 'register' | 'authenticate', userId: string | null,
): Promise<string> {
  const id = randomHex(16)
  const now = Math.floor(Date.now() / 1000)
  await db.batch([
    db.prepare('DELETE FROM webauthn_challenges WHERE expires_at < ?').bind(now),
    db.prepare('INSERT INTO webauthn_challenges (id, challenge, user_id, purpose, expires_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, challenge, userId, purpose, now + CHALLENGE_TTL),
  ])
  return id
}

/** Fetch and delete a challenge in one statement, so it can only ever be used once. */
export async function consumeChallenge(
  db: D1Database, id: string, purpose: 'register' | 'authenticate', userId: string | null,
): Promise<string | null> {
  if (!/^[0-9a-f]{32}$/.test(id)) return null
  const row = await db.prepare(
    'DELETE FROM webauthn_challenges WHERE id = ? AND purpose = ? RETURNING challenge, user_id, expires_at'
  ).bind(id, purpose).first<{ challenge: string; user_id: string | null; expires_at: number }>()
  if (!row || row.expires_at < Math.floor(Date.now() / 1000)) return null
  if (row.user_id !== userId) return null
  return row.challenge
}

/** WebAuthn user handle: the account's UUID bytes. Stable per account, contains no PII. */
export function userHandle(userId: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(userId) as Uint8Array<ArrayBuffer>
}

export function isDemoUser(userId: string): boolean {
  return userId === DEMO_USER_ID
}

/**
 * Friendly provider names for common passkey providers, keyed by AAGUID.
 * Source: the community passkey-authenticator-aaguids list. Unknown → a generic name.
 */
const AAGUID_NAMES: Record<string, string> = {
  'fbfc3007-154e-4ecc-8c0b-6e020557d7bd': 'iCloud Keychain',
  'dd4ec289-e01d-41c9-bb89-70fa845d4bf2': 'iCloud Keychain',
  'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4': 'Google Password Manager',
  'adce0002-35bc-c60a-648b-0b25f1f05503': 'Chrome on Mac',
  'bada5566-a7aa-401f-bd96-45619a55120d': '1Password',
  'd548826e-79b4-db40-a3d8-11116f7e8349': 'Bitwarden',
  '531126d6-e717-415c-9320-3d9aa6981239': 'Dashlane',
  'b84e4048-15dc-4dd0-8640-f4f60813c8af': 'NordPass',
  '0ea242b4-43c4-4a1b-8b17-dd6d0b6baec6': 'Keeper',
  '53414d53-554e-4700-0000-000000000000': 'Samsung Pass',
  '08987058-cadc-4b81-b6e1-30de50dcbe96': 'Windows Hello',
  '9ddd1817-af5a-4672-a2b9-3e3dd95000a9': 'Windows Hello',
  '6028b017-b1d4-4c02-b4b3-afcdafc96bb2': 'Windows Hello',
  '771b48fd-d3d4-4f74-9232-fc157ab0507a': 'Microsoft Edge on Mac',
  'b5397666-4885-aa6b-cebf-e52262a439a2': 'Chromium Browser',
  'f3809540-7f14-49c1-a8b3-8f813b225541': 'Enpass',
  '50726f74-6f6e-5061-7373-50726f746f6e': 'Proton Pass',
  'cc45f64e-52a2-451b-831a-4edd8022a202': 'ToothPic Passkey Provider',
}

export function passkeyName(aaguid: string | undefined, deviceType: string, request: Request): string {
  if (aaguid && AAGUID_NAMES[aaguid]) return AAGUID_NAMES[aaguid]
  if (deviceType === 'singleDevice') return 'Security key'
  // Fall back to the platform the passkey was made on.
  const ua = request.headers.get('User-Agent') ?? ''
  const platform =
    /iPhone|iPad/.test(ua) ? 'iPhone or iPad'
    : /Android/.test(ua) ? 'Android'
    : /Macintosh/.test(ua) ? 'Mac'
    : /Windows/.test(ua) ? 'Windows'
    : ''
  return platform ? `Passkey on ${platform}` : 'Passkey'
}

/** Public shape returned to the app (no key material). */
export function toPublicPasskey(row: PasskeyRow) {
  return {
    id: row.id,
    name: row.name,
    created_at: row.created_at,
    last_used_at: row.last_used_at,
    synced: row.backed_up === 1,
  }
}

export async function createSession(db: D1Database, userId: string): Promise<{ sessionId: string; cookie: string }> {
  const sessionId = randomHex(8)
  const maxAge = 30 * 24 * 60 * 60
  const expires = Math.floor(Date.now() / 1000) + maxAge
  await db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').bind(sessionId, userId, expires).run()
  return {
    sessionId,
    cookie: `pantry_session=${sessionId}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`,
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  })
}

export type { Env }
