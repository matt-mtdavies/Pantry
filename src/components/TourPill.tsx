import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { readTourProgress, TOUR_SCENE_COUNT, type TourProgress } from '../lib/tourState'
import styles from './TourPill.module.css'

/** Floating entry to the demo tour. Stays on screen on the landing and demo
 *  pages; after a mid-tour exit it becomes "Resume tour" so it's never lost. */
export default function TourPill() {
  const { pathname } = useLocation()
  const [progress, setProgress] = useState<TourProgress | null>(readTourProgress)
  useEffect(() => { setProgress(readTourProgress()) }, [pathname])

  const resumable = progress && !progress.finished && progress.scene > 0
  const label = resumable
    ? `Resume tour · ${progress.scene + 1} of ${TOUR_SCENE_COUNT}`
    : progress?.finished ? 'Watch the tour again' : 'Take the 2-minute tour'
  const to = resumable ? `/tour?scene=${progress.scene + 1}` : '/tour'

  return (
    <>
    {/* In-flow spacer so the fixed pill never covers the end of the page. */}
    <div className={styles.spacer} aria-hidden="true" />
    <Link to={to} className={`${styles.pill} no-print`} state={{ from: pathname }}>
      <span className={styles.play} aria-hidden="true">
        <svg width="10" height="12" viewBox="0 0 10 12"><path d="M0 0l10 6-10 6z" fill="currentColor" /></svg>
      </span>
      {label}
    </Link>
    </>
  )
}
