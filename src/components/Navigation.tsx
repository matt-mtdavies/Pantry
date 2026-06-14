import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { avatarEmoji } from '../lib/avatars'
import styles from './Navigation.module.css'

export default function Navigation() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const p = location.pathname

  const handleLogout = async () => {
    await logout()
    navigate('/auth')
  }

  return (
    <>
      <header className={styles.nav}>
        <div className={styles.inner}>
          <Link to="/" className={styles.brand}>
            <span className={styles.brandWord}>Pantry</span>
          </Link>

          <nav className={styles.links} aria-label="Main navigation">
            <Link to="/" className={`${styles.link} ${p === '/' ? styles.active : ''}`}>
              My Recipes
            </Link>
            <Link to="/explore" className={`${styles.link} ${p === '/explore' ? styles.active : ''}`}>
              Explore
            </Link>
            <Link to="/leaderboard" className={`${styles.link} ${p === '/leaderboard' ? styles.active : ''}`}>
              Leaderboard
            </Link>
            <Link to="/import" className={`${styles.link} ${p === '/import' ? styles.active : ''}`}>
              Add Recipe
            </Link>
          </nav>

          {user && (
            <div className={styles.user}>
              <Link to="/profile" className={styles.profileLink} aria-label="My profile">
                <span className={styles.avatar}>{avatarEmoji(user.avatar_id)}</span>
                <span className={styles.userName}>
                  {user.display_name || user.email.split('@')[0]}
                </span>
              </Link>
              <button onClick={handleLogout} className={styles.signOut}>Sign out</button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        <Link to="/" className={`${styles.tab} ${p === '/' ? styles.tabActive : ''}`}>
          <span className={styles.tabIcon}>🏠</span>
          <span className={styles.tabLabel}>Recipes</span>
        </Link>
        <Link to="/explore" className={`${styles.tab} ${p === '/explore' ? styles.tabActive : ''}`}>
          <span className={styles.tabIcon}>🔍</span>
          <span className={styles.tabLabel}>Explore</span>
        </Link>
        <Link to="/import" className={`${styles.tab} ${styles.tabAdd} ${p === '/import' ? styles.tabActive : ''}`}>
          <span className={styles.tabAddIcon}>+</span>
        </Link>
        <Link to="/leaderboard" className={`${styles.tab} ${p === '/leaderboard' ? styles.tabActive : ''}`}>
          <span className={styles.tabIcon}>🏆</span>
          <span className={styles.tabLabel}>Board</span>
        </Link>
        <Link to="/profile" className={`${styles.tab} ${p === '/profile' ? styles.tabActive : ''}`}>
          <span className={styles.tabAvatarIcon}>{user ? avatarEmoji(user.avatar_id) : '👤'}</span>
          <span className={styles.tabLabel}>Profile</span>
        </Link>
      </nav>
    </>
  )
}
