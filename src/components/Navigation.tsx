import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './Navigation.module.css'

export default function Navigation() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/auth')
  }

  return (
    <header className={styles.nav}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandWord}>Pantry</span>
        </Link>

        <nav className={styles.links} aria-label="Main navigation">
          <Link
            to="/"
            className={`${styles.link} ${location.pathname === '/' ? styles.active : ''}`}
          >
            My Recipes
          </Link>
          <Link
            to="/import"
            className={`${styles.link} ${location.pathname === '/import' ? styles.active : ''}`}
          >
            Add Recipe
          </Link>
        </nav>

        {user && (
          <div className={styles.user}>
            <Link to="/profile" className={styles.profileLink} aria-label="My profile">
              <span className={styles.avatar}>{AVATARS[user.avatar_id] ?? '🌿'}</span>
              <span className={styles.userName}>
                {user.display_name || user.email.split('@')[0]}
              </span>
            </Link>
            <button onClick={handleLogout} className={styles.signOut}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

const AVATARS: Record<string, string> = {
  herb: '🌿',
  lemon: '🍋',
  pepper: '🌶️',
  apple: '🍎',
  mushroom: '🍄',
  carrot: '🥕',
}
