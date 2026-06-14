import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { resetPassword } from '../lib/api'
import styles from './AuthPage.module.css'

export default function ResetPasswordPage() {
  const { refetch } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [error, setError] = useState('')

  if (!token) {
    navigate('/auth', { replace: true })
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setStatus('error')
      setError('Passwords don't match')
      return
    }
    setStatus('submitting')
    setError('')
    try {
      const { sessionId } = await resetPassword(token, password)
      localStorage.setItem('pantry_session', sessionId)
      await refetch()
      navigate('/', { replace: true })
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>Pantry</div>
        <h1 className={styles.heading}>Choose a new password</h1>
        <p className={styles.sub}>Pick something memorable — at least 8 characters.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="password" className={styles.label}>New password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={styles.input}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            autoFocus
            required
            minLength={8}
            disabled={status === 'submitting'}
          />

          <label htmlFor="confirm" className={styles.label}>Confirm password</label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className={styles.input}
            placeholder="Same password again"
            autoComplete="new-password"
            required
            disabled={status === 'submitting'}
          />

          {status === 'error' && (
            <p className={styles.error} role="alert">{error}</p>
          )}

          <button
            type="submit"
            className={styles.submit}
            disabled={status === 'submitting' || !password || !confirm}
          >
            {status === 'submitting' ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  )
}
