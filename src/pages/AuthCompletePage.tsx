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
    // Store in localStorage — cookies from cross-app links are quarantined
    // by Safari ITP. localStorage is not subject to the same restriction.
    localStorage.setItem('pantry_session', sessionId)
    navigate('/', { replace: true })
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
