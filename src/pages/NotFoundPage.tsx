import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DishIcon } from '../components/icons'
import { useAuth } from '../hooks/useAuth'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  const { user } = useAuth()

  useEffect(() => {
    const prev = document.title
    document.title = 'Page not found · Pantry'
    return () => { document.title = prev }
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link to="/" className={styles.brand}>
          <img src="/pantry-mark.png" alt="" width={28} height={28} />
          <span>Pantry</span>
        </Link>
      </header>
      <main className={styles.body}>
        <DishIcon size={56} className={styles.icon} />
        <h1 className={styles.title}>This page isn't on the menu</h1>
        <p className={styles.text}>
          The link may be mistyped, or the page may have moved.
        </p>
        <Link to="/" className={styles.homeLink}>
          {user ? 'Back to your recipes' : 'Go to Pantry'}
        </Link>
      </main>
    </div>
  )
}
