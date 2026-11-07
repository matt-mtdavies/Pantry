import type { DemoPhotoCredit } from '../lib/demoPhotos'
import styles from './PhotoCredit.module.css'

const UNSPLASH = 'https://unsplash.com/?utm_source=pantry&utm_medium=referral'

/** "Photo by X on Unsplash" — required attribution for hotlinked Unsplash photos. */
export default function PhotoCredit({ credit, overlay = false }: { credit: DemoPhotoCredit; overlay?: boolean }) {
  return (
    <p className={`${styles.credit} ${overlay ? styles.overlay : ''}`}>
      Photo by <a href={credit.photographer_url} target="_blank" rel="noopener noreferrer">{credit.photographer}</a> on{' '}
      <a href={UNSPLASH} target="_blank" rel="noopener noreferrer">Unsplash</a>
    </p>
  )
}
