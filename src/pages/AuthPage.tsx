import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { sendMagicLink } from '../lib/api'
import styles from './AuthPage.module.css'

const ERROR_MESSAGES: Record<string, string> = {
  expired: 'That sign-in link has expired or already been used. Please request a new one.',
  missing_token: 'Invalid sign-in link. Please request a new one.',
}

export default function AuthPage() {
  const { user, loading, refetch } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const serverError = params.get('error')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    serverError ? 'error' : 'idle'
  )
  const [error, setError] = useState(
    serverError ? (ERROR_MESSAGES[serverError] ?? 'Something went wrong. Please try again.') : ''
  )

  // Already signed in — redirect home
  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [user, loading, navigate])

  // After a server-side redirect back to / the auth provider might need a nudge
  useEffect(() => {
    refetch()
  }, [refetch])

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
