import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AuthCard from '../components/AuthCard'
import styles from './AuthPage.module.css'

export default function AuthPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextPath = searchParams.get('next') || '/'

  useEffect(() => {
    if (!loading && user) navigate(nextPath, { replace: true })
  }, [user, loading, navigate, nextPath])

  return (
    <div className={styles.page}>
      <AuthCard
        nextPath={nextPath}
        initialMode={searchParams.get('mode') === 'register' ? 'register' : 'signin'}
        autoFocus
      />
    </div>
  )
}
