import { Link } from 'react-router-dom'
import styles from './DemoBar.module.css'

/** Sticky top bar on every /demo page: says it's a read-only demo, offers sign-up. */
export default function DemoBar({ back }: { back?: { to: string; label: string } }) {
  return (
    <div className={`${styles.bar} no-print`}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <img src="/pantry-mark.png" alt="" width={26} height={26} />
          <span>Pantry</span>
        </Link>
        <span className={styles.text}>
          {back
            ? <Link to={back.to} className={styles.back}>← {back.label}</Link>
            : <>You're exploring a demo pantry. Look around — nothing here can be changed.</>}
        </span>
        <Link to="/?signup=1#get-started" className={styles.cta}>Create free account</Link>
      </div>
    </div>
  )
}
