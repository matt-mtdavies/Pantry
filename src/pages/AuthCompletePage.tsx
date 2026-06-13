import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AuthCompletePage() {
  const navigate = useNavigate()

  useEffect(() => {
    const sessionId = window.location.hash.slice(1)
    if (!sessionId) {
      navigate('/auth?error=missing_token', { replace: true })
      return
    }

    fetch('/api/auth/set-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sessionId }),
    })
      .then(r => r.json() as Promise<{ ok?: boolean; error?: string }>)
      .then(data => {
        if (data.ok) {
          navigate('/', { replace: true })
        } else {
          navigate('/auth?error=server_error', { replace: true })
        }
      })
      .catch(() => navigate('/auth?error=server_error', { replace: true }))
  }, [navigate])

  return null
}
