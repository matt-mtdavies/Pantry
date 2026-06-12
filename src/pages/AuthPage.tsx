import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { sendMagicLink } from '../lib/api'
import styles from './AuthPage.module.css'

export default function AuthPage() {
  const { user, loading, refetch } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'error'>('idle')
  const [error, setError] = useState('')

  // Handle magic link token in URL
  useEffect(() => {
    const token = params.get('token')
    if (!token) return
    setStatus('verifying')
    fetch(`/api/auth/verify?token=${token}`, { credentials: 'include' })
      .then(async res => {
        if (res.ok) {
          await refetch()
          navigate('/', { replace: true })
        } else {
          setStatus('error')
          setError('This link has expired or already been used. Please request a new one.')
        }
      })
      .catch(() => {
        setStatus('error')
        setError('Something went wrong. Please try again.')
      })
  }, [params, refetch, navigate])

  // Already signed in
  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [user, loading, navigate])

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
          <div className={styles.spinner} aria-label="Signing you in…" />
          <p className={styles.verifyText}>Signing you in…</p>
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
            {(status === 'error') && (
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
