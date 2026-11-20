import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { DEMO_USER_ID } from '../../shared/demoIdentity'
import {
  takePasskeyNudge, clearPasskeyNudge, platformPasskeyAvailable, listPasskeys, createPasskey, isPasskeyCancel,
} from '../lib/passkeys'
import { PasskeyIcon, CheckIcon } from './icons'
import styles from './PasskeyNudge.module.css'

/**
 * One-time sheet after a password or email-link sign-in: "Sign in faster next time".
 * Shown only when this device can make a passkey, the account has none yet, and
 * onboarding isn't on screen. "Not now" snoozes it for 30 days on this device.
 */
export default function PasskeyNudge({ blocked }: { blocked: boolean }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<'ask' | 'creating' | 'done'>('ask')
  const [error, setError] = useState('')
  const primary = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!user || blocked || open || !takePasskeyNudge()) return
    if (user.id === DEMO_USER_ID) { clearPasskeyNudge(); return }
    let cancelled = false
    // Give the page (and any silent passkey upgrade) a moment to settle first.
    const t = window.setTimeout(async () => {
      if (!(await platformPasskeyAvailable())) { clearPasskeyNudge(); return }
      try {
        const { passkeys } = await listPasskeys()
        if (cancelled) return
        if (passkeys.length) { clearPasskeyNudge(); return }
        if (/^\/(auth|reset-password)/.test(location.pathname)) return
        returnFocus.current = document.activeElement as HTMLElement | null
        setOpen(true)
      } catch { /* try again next sign-in */ }
    }, 1500)
    return () => { cancelled = true; window.clearTimeout(t) }
  }, [user, blocked, open])

  useEffect(() => {
    if (!open) return
    primary.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(true) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, state])

  const close = (snooze: boolean) => {
    clearPasskeyNudge({ snooze })
    setOpen(false)
    returnFocus.current?.focus?.()
  }

  const create = async () => {
    setState('creating')
    setError('')
    try {
      await createPasskey()
      setState('done')
      clearPasskeyNudge()
    } catch (err) {
      setState('ask')
      if (err instanceof Error && err.name === 'InvalidStateError') { setState('done'); return }
      if (!isPasskeyCancel(err)) setError(err instanceof Error ? err.message : "We couldn't create a passkey. Please try again.")
    }
  }

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget && state !== 'creating') close(true) }}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="pk-nudge-title" aria-describedby="pk-nudge-desc">
        <div className={styles.handle} aria-hidden="true" />

        <div className={`${styles.art} ${state === 'done' ? styles.artDone : ''}`} aria-hidden="true">
          <span className={styles.ring3} />
          <span className={styles.ring2} />
          <span className={styles.ring1} />
          <span className={styles.core}>
            {state === 'done' ? <CheckIcon size={30} /> : <PasskeyIcon size={34} />}
          </span>
        </div>

        {state === 'done' ? (
          <>
            <h2 id="pk-nudge-title" className={styles.title}>You're all set</h2>
            <p id="pk-nudge-desc" className={styles.text}>
              Next time, tap <strong>Sign in with a passkey</strong> and you're in. Manage passkeys any time in your profile.
            </p>
            <div className={styles.actions}>
              <button ref={primary} className={styles.primary} onClick={() => close(false)}>Done</button>
            </div>
          </>
        ) : (
          <>
            <h2 id="pk-nudge-title" className={styles.title}>Sign in faster next time</h2>
            <p id="pk-nudge-desc" className={styles.text}>
              Save a passkey and use Face ID, your fingerprint or screen lock instead of a password.
              It syncs through your password manager and can't be phished.
            </p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className={styles.actions}>
              <button ref={primary} className={styles.primary} onClick={create} disabled={state === 'creating'}>
                {state === 'creating' ? 'Waiting for your device…' : 'Create a passkey'}
              </button>
              <button className={styles.ghost} onClick={() => close(true)} disabled={state === 'creating'}>Not now</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
