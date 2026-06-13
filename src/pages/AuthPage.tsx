import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { sendMagicLink } from '../lib/api'
import styles from './AuthPage.module.css'

const ERROR_MESSAGES: Record<string, string> = {
  expired: 'That sign-in link has expired or already been used. Please request a new one.',
  missing_token: 'Invalid sign-in link. Please request a new one.',
  server_error: 'The server hit an unexpected error. Please try again.',
}

export default function AuthPage() {
  const { user, loading, refetch } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const verifyAttempted = useRef(false)

  const token = params.get('token')
  const serverError = params.get('error')

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'verifying' | 'sending' | 'sent' | 'error'>(
    token ? 'verifying' : serverError ? 'error' : 'idle'
  )
  const [error, setError] = useState(
    serverError ? (ERROR_MESSAGES[serverError] ?? 'Something went wrong. Please try again.') : ''
  )

  // Redirect home if already signed in
  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [user, loading, navigate])

  // Client-side token verification — called once when ?token= is present
  useEffect(() => {
    if (!token || verifyAttempted.current) return
    verifyAttempted.current = true

    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`, {
          credentials: 'include',
        })
        const data = await res.json() as { ok?: boolean; error?: string; detail?: string }
        if (data.ok) {
          await refetch()
          navigate('/', { replace: true })
        } else {
          const key = data.error ?? 'expired'
          setError(ERROR_MESSAGES[key] ?? data.detail ?? 'Something went wrong. Please try again.')
          setStatus('error')
        }
      } catch {
        setError('Could not reach the server. Please check your connection and try again.')
        setStatus('error')
      }
    }

    verify()
  }, [token, navigate, refetch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    setError('')
    try {
      await sendMagicLink(email.trim())
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  if (status === 'verifying') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.brand}>Pantry</div>
          <h1 className={styles.heading}>Signing you in…</h1>
          <p className={styles.sub}>Just a moment.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>Pantry</div>
        <h1 className={styles.heading}>Welcome to your kitchen</h1>
        <p className={styles.sub}>
          Enter your email and we'll send you a sign-in link — no password needed.
        </p>

        {status === 'sent' ? (
          <div className={styles.sentBox}>
            <div className={styles.sentIcon}>✉️</div>
            <h2 className={styles.sentTitle}>Check your inbox</h2>
            <p className={styles.sentText}>
              We've sent a sign-in link to <strong>{email}</strong>. Tap it to continue.
            </p>
            <p className={styles.sentHint}>
              Don't see it? Check your spam folder, or{' '}
              <button className={styles.resend} onClick={() => setStatus('idle')}>try again</button>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
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
              disabled={status === 'sending'}
            />
            {status === 'error' && (
              <p className={styles.error} role="alert">{error}</p>
            )}
            <button
              type="submit"
              className={styles.submit}
              disabled={status === 'sending' || !email.trim()}
            >
              {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
