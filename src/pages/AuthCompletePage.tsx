import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './AuthPage.module.css'

export default function AuthCompletePage() {
  const navigate = useNavigate()

  useEffect(() => {
    const sessionId = window.location.hash.slice(1)
    if (!sessionId) {
      navigate('/auth?error=missing_token', { replace: true })
      return
    }
    localStorage.setItem('pantry_session', sessionId)
    // Full reload so AuthProvider's initial fetchMe runs after localStorage is set,
    // avoiding the race where fetchMe fires before we save the session.
    window.location.replace('/')
  }, [navigate])

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
