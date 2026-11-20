import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { queuePasskeyNudge } from '../lib/passkeys'
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
    // Signed in by email link: offer a passkey once they land.
    queuePasskeyNudge()
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
        <div className={styles.brand}>
          <img src="/pantry-mark.png" alt="" className={styles.brandMark} width="44" height="44" />
          <span className={styles.brandWord}>Pantry</span>
        </div>
        <h1 className={styles.heading}>Signing you in…</h1>
        <p className={styles.sub}>Just a moment.</p>
      </div>
    </div>
  )
}
