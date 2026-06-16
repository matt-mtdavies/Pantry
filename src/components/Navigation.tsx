import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from './Avatar'
import { resendVerificationEmail } from '../lib/api'
import styles from './Navigation.module.css'

// ── SVG Tab Icons ─────────────────────────────────────────────────────────────

type IP = { active: boolean }

/** Recipe card — rectangle with content lines */
function IconRecipes({ active }: IP) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2.5"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 8h8M8 12h8M8 16h5"
        stroke={active ? '#FAF7F2' : 'currentColor'} strokeWidth="1.75" />
    </svg>
  )
}

/** Compass with north/south needle */
function IconCompass({ active }: IP) {
  const circleFill = active ? 'currentColor' : 'none'
  const nFill = active ? '#FAF7F2' : 'currentColor'
  const sFill = active ? 'rgba(250,247,242,0.38)' : 'rgba(107,100,89,0.38)'
  const dotFill = active ? '#FAF7F2' : 'currentColor'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5"
        fill={circleFill} stroke="currentColor" strokeWidth="1.75" />
      {/* North needle — bright */}
      <path d="M12 4.5L15 12.5L12 10.5L9 12.5Z" fill={nFill} />
      {/* South needle — dimmed */}
      <path d="M12 19.5L9 11.5L12 13.5L15 11.5Z" fill={sFill} />
      {/* Centre dot */}
      <circle cx="12" cy="12" r="1.4" fill={dotFill} />
    </svg>
  )
}

/** Podium bars — 2nd · 1st · 3rd */
function IconPodium({ active }: IP) {
  const fill = active ? 'currentColor' : 'none'
  const sw = '1.75'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="1.5" y="10.5" width="6" height="10.5" rx="1.5"
        fill={fill} stroke="currentColor" strokeWidth={sw} />
      <rect x="9" y="4.5" width="6" height="16.5" rx="1.5"
        fill={fill} stroke="currentColor" strokeWidth={sw} />
      <rect x="16.5" y="14.5" width="6" height="6.5" rx="1.5"
        fill={fill} stroke="currentColor" strokeWidth={sw} />
    </svg>
  )
}

/** Person silhouette */
function IconPerson({ active }: IP) {
  const fill = active ? 'currentColor' : 'none'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      strokeLinecap="round">
      <circle cx="12" cy="8" r="4"
        fill={fill} stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 21c0-4.5 3.6-7.5 8-7.5s8 3 8 7.5"
        fill={fill} stroke={active ? 'none' : 'currentColor'} strokeWidth="1.75" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Navigation() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const p = location.pathname
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const showBanner = user != null && user.email_verified === false

  useEffect(() => {
    document.body.classList.toggle('has-verify-banner', showBanner)
    return () => { document.body.classList.remove('has-verify-banner') }
  }, [showBanner])

  const handleResend = async () => {
    setResending(true)
    try {
      await resendVerificationEmail()
      setResent(true)
    } catch { /* ignore */ } finally {
      setResending(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/auth')
  }

  return (
    <>
      {showBanner && (
        <div className={styles.verifyBanner} role="alert">
          <span className={styles.verifyBannerText}>
            Please verify your email address to access all features.
          </span>
          {resent ? (
            <span className={styles.verifyBannerBtn} style={{ cursor: 'default', textDecoration: 'none' }}>
              Email sent ✓
            </span>
          ) : (
            <button
              className={styles.verifyBannerBtn}
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? 'Sending…' : 'Resend email'}
            </button>
          )}
        </div>
      )}
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
              Community
            </Link>
            <Link to="/import" className={`${styles.link} ${p === '/import' ? styles.active : ''}`}>
              Add Recipe
            </Link>
          </nav>

          {user && (
            <div className={styles.user}>
              <Link to="/profile" className={styles.profileLink} aria-label="My profile">
                <Avatar imageKey={user.avatar_image_key} avatarId={user.avatar_id} size={40} className={styles.avatar} />
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
          <IconRecipes active={p === '/'} />
          <span className={styles.tabLabel}>Recipes</span>
        </Link>
        <Link to="/explore" className={`${styles.tab} ${p === '/explore' ? styles.tabActive : ''}`}>
          <IconCompass active={p === '/explore'} />
          <span className={styles.tabLabel}>Explore</span>
        </Link>
        <Link to="/import" className={`${styles.tab} ${styles.tabAdd} ${p === '/import' ? styles.tabActive : ''}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" />
          </svg>
        </Link>
        <Link to="/leaderboard" className={`${styles.tab} ${p === '/leaderboard' ? styles.tabActive : ''}`}>
          <IconPodium active={p === '/leaderboard'} />
          <span className={styles.tabLabel}>Board</span>
        </Link>
        <Link to="/profile" className={`${styles.tab} ${p === '/profile' ? styles.tabActive : ''}`}>
          <IconPerson active={p === '/profile'} />
          <span className={styles.tabLabel}>Profile</span>
        </Link>
      </nav>
    </>
  )
}
