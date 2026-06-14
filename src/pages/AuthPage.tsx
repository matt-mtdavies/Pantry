import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { login, register, forgotPassword } from '../lib/api'
import styles from './AuthPage.module.css'

type Mode = 'signin' | 'register' | 'forgot' | 'forgot-sent'

export default function AuthPage() {
  const { user, loading, refetch } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [user, loading, navigate])

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setStatus('idle')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setError('')

    try {
      if (mode === 'forgot') {
        await forgotPassword(email.trim())
        setMode('forgot-sent')
        setStatus('idle')
        return
      }

      const { sessionId } = mode === 'signin'
        ? await login(email.trim(), password)
        : await register(email.trim(), password, displayName.trim() || undefined)

      localStorage.setItem('pantry_session', sessionId)
      await refetch()
      navigate('/', { replace: true })
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  if (mode === 'forgot-sent') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.brand}>Pantry</div>
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
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>Pantry</div>

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

        {mode === 'forgot' && (
          <>
            <h1 className={styles.heading}>Forgot your password?</h1>
            <p className={styles.sub}>
              Enter your email and we'll send you a link to reset it.
            </p>
          </>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
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
            autoComplete="email"
            autoFocus
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
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                disabled={status === 'submitting'}
              />
            </>
          )}

          {status === 'error' && (
            <p className={styles.error} role="alert">{error}</p>
          )}

          <button
            type="submit"
            className={styles.submit}
            disabled={
              status === 'submitting' ||
              !email.trim() ||
              (mode !== 'forgot' && !password.trim())
            }
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
    </div>
  )
}
