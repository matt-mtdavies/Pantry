import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styles from './AuthPage.module.css'

export default function AuthCompletePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  useEffect(() => {
    const sessionId = params.get('s')
    if (!sessionId) {
      navigate('/auth?error=missing_token', { replace: true })
      return
    }
    try {
      localStorage.setItem('pantry_session', sessionId)
    } catch {
      // localStorage unavailable — cookie fallback will handle auth
    }
    // Full reload so AuthProvider's initial fetchMe runs after localStorage is
    // populated, avoiding the race where fetchMe fires before we save the session.
    window.location.replace('/')
  }, [navigate, params])

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
