import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { login, register, forgotPassword } from '../lib/api'
import {
  passkeysSupported, passkeyAutofillSupported, signInWithPasskey, createPasskey, isPasskeyCancel,
  cancelPasskeyRequest, queuePasskeyNudge,
} from '../lib/passkeys'
import { PasskeyIcon } from './icons'
import styles from '../pages/AuthPage.module.css'

type Mode = 'signin' | 'register' | 'forgot' | 'forgot-sent'

interface Props {
  nextPath?: string
  initialMode?: 'signin' | 'register'
  /** Focus the email field on mount (full-page sign-in only — not when embedded in a page). */
  autoFocus?: boolean
}

/** Sign in / create account / forgot password card. Used by /auth and the landing page. */
export default function AuthCard({ nextPath = '/', initialMode = 'signin', autoFocus = false }: Props) {
  const { refetch } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>(initialMode)
  useEffect(() => { setMode(initialMode) }, [initialMode])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'passkey' | 'error'>('idle')
  const [error, setError] = useState('')
  const [canPasskey] = useState(passkeysSupported)
  // Bumped to (re)start the email field's passkey autofill after a manual attempt ends.
  const [autofillRun, setAutofillRun] = useState(0)
  const autofillActive = useRef(false)

  const finishSignIn = useCallback(async (sessionId: string, to: string) => {
    try { localStorage.setItem('pantry_session', sessionId) } catch { /* cookie still works */ }
    await refetch()
    navigate(to, { replace: true })
  }, [refetch, navigate])

  // Passkey autofill (conditional UI): passkeys appear in the email field's suggestions.
  useEffect(() => {
    if (mode !== 'signin' || !canPasskey) return
    let cancelled = false
    passkeyAutofillSupported().then(ok => {
      if (!ok || cancelled) return
      autofillActive.current = true
      signInWithPasskey({ autofill: true })
        .then(({ sessionId }) => { if (!cancelled) return finishSignIn(sessionId, nextPath) })
        .catch(err => {
          if (cancelled || isPasskeyCancel(err)) return
          setStatus('error')
          setError(err instanceof Error ? err.message : 'Passkey sign-in failed. Please try again.')
        })
        .finally(() => { autofillActive.current = false })
    })
    return () => {
      cancelled = true
      if (autofillActive.current) cancelPasskeyRequest()
    }
  }, [mode, canPasskey, autofillRun, finishSignIn, nextPath])

  const handlePasskey = async () => {
    setStatus('passkey')
    setError('')
    try {
      // Starting a new ceremony replaces the pending autofill one.
      const { sessionId } = await signInWithPasskey()
      await finishSignIn(sessionId, nextPath)
    } catch (err) {
      if (isPasskeyCancel(err)) {
        setStatus('idle')
      } else {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Passkey sign-in failed. Please try again.')
      }
      setAutofillRun(n => n + 1)
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setStatus('idle')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Say what's missing instead of leaving a dead, disabled button.
    const missing =
      !email.trim() ? 'Enter your email address.'
      : mode !== 'forgot' && !password ? 'Enter your password.'
      : mode === 'register' && password.length < 8 ? 'Choose a password of at least 8 characters.'
      : ''
    if (missing) {
      setStatus('error')
      setError(missing)
      return
    }
    setStatus('submitting')
    setError('')
    // Retire the pending passkey autofill so it can't abort the post-sign-in passkey upgrade.
    if (autofillActive.current) { autofillActive.current = false; cancelPasskeyRequest() }

    try {
      if (mode === 'forgot') {
        await forgotPassword(email.trim())
        setMode('forgot-sent')
        setStatus('idle')
        return
      }

      const isRegister = mode === 'register'
      const { sessionId } = isRegister
        ? await register(email.trim(), password, displayName.trim() || undefined)
        : await login(email.trim(), password)

      // Offer a passkey next: first a silent upgrade via the password manager the user
      // just used (where supported), else a one-time prompt once they're in.
      queuePasskeyNudge()
      if (!isRegister && canPasskey) createPasskey({ auto: true }).catch(() => {})
      await finishSignIn(sessionId, isRegister ? '/profile' : nextPath)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  if (mode === 'forgot-sent') {
    return (
        <div className={styles.card}>
          <div className={styles.brand}>
            <img src="/pantry-mark.png" alt="" className={styles.brandMark} width="44" height="44" />
            <span className={styles.brandWord}>Pantry</span>
          </div>
          <div className={styles.sentBox}>
            <div className={styles.sentIcon}>✉️</div>
            <h2 className={styles.sentTitle}>Check your inbox</h2>
            <p className={styles.sentText}>
              If an account exists for <strong>{email}</strong>, we've sent a link to reset
              your password. Check your spam folder if it doesn't arrive within a minute.
            </p>
            <p className={styles.sentHint}>
              <button className={styles.resend} onClick={() => switchMode('signin')}>
                Back to sign in
              </button>
            </p>
          </div>
        </div>
    )
  }

  return (
      <div className={styles.card}>
        <div className={styles.brand}>
          <img src="/pantry-mark.png" alt="" className={styles.brandMark} width="44" height="44" />
          <span className={styles.brandWord}>Pantry</span>
        </div>

        {mode !== 'forgot' && (
          <div className={styles.toggle}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${mode === 'signin' ? styles.toggleBtnActive : ''}`}
              onClick={() => switchMode('signin')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${mode === 'register' ? styles.toggleBtnActive : ''}`}
              onClick={() => switchMode('register')}
            >
              Create account
            </button>
          </div>
        )}

        {mode === 'signin' && canPasskey && (
          <>
            <button
              type="button"
              className={styles.passkeyBtn}
              onClick={handlePasskey}
              disabled={status === 'submitting' || status === 'passkey'}
              aria-busy={status === 'passkey'}
            >
              <span className={styles.passkeyBadge}>
                {status === 'passkey'
                  ? <span className={styles.spinner} aria-hidden="true" />
                  : <PasskeyIcon size={20} />}
              </span>
              <span className={styles.passkeyText}>
                <span className={styles.passkeyLabel}>
                  {status === 'passkey' ? 'Waiting for your passkey…' : 'Sign in with a passkey'}
                </span>
                <span className={styles.passkeyHint}>Face ID, fingerprint or screen lock</span>
              </span>
            </button>
            <div className={styles.divider} role="separator"><span>or use your email</span></div>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <h1 className={styles.heading}>Forgot your password?</h1>
            <p className={styles.sub}>
              Enter your email and we'll send you a link to reset it.
            </p>
          </>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {mode === 'register' && (
            <>
              <label htmlFor="displayName" className={styles.label}>
                Your name <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className={styles.input}
                placeholder="e.g. Matt"
                autoComplete="name"
                disabled={status === 'submitting'}
              />
            </>
          )}

          <label htmlFor="email" className={styles.label}>Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={styles.input}
            placeholder="you@example.com"
            // "webauthn" lets the browser offer saved passkeys right in this field.
            autoComplete={mode === 'signin' && canPasskey ? 'username webauthn' : 'email'}
            autoFocus={autoFocus}
            required
            disabled={status === 'submitting'}
          />

          {mode !== 'forgot' && (
            <>
              <label htmlFor="password" className={styles.label}>
                Password{' '}
                {mode === 'register' && (
                  <span className={styles.optional}>(min 8 characters)</span>
                )}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={styles.input}
                placeholder={mode === 'register' ? 'Choose a password' : 'Your password'}
                autoComplete={mode === 'signin' ? 'current-password webauthn' : 'new-password'}
                required
                disabled={status === 'submitting'}
              />
            </>
          )}

          {status === 'error' && (
            <p className={styles.error} role="alert">{error}</p>
          )}

          {mode === 'register' && (
            <p className={styles.legalNote}>
              By creating an account you agree to our{' '}
              <Link to="/terms" className={styles.legalLink} target="_blank">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className={styles.legalLink} target="_blank">Privacy Policy</Link>.
            </p>
          )}

          <button
            type="submit"
            className={styles.submit}
            disabled={status === 'submitting' || status === 'passkey'}
          >
            {status === 'submitting'
              ? mode === 'signin' ? 'Signing in…'
                : mode === 'register' ? 'Creating account…'
                : 'Sending…'
              : mode === 'signin' ? 'Sign in'
                : mode === 'register' ? 'Create account'
                : 'Send reset link'
            }
          </button>

          {mode === 'signin' && (
            <button
              type="button"
              className={styles.forgotLink}
              onClick={() => switchMode('forgot')}
            >
              Forgot your password?
            </button>
          )}

          {mode === 'forgot' && (
            <button
              type="button"
              className={styles.forgotLink}
              onClick={() => switchMode('signin')}
            >
              Back to sign in
            </button>
          )}
        </form>
      </div>
  )
}
