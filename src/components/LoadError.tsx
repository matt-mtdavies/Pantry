import styles from './LoadError.module.css'

interface Props {
  title?: string
  message?: string
  onRetry: () => void
  retrying?: boolean
}

/** Shown when a fetch fails — never reuse the empty-state copy for this,
 *  or users think their data is gone when it was just a network blip. */
export default function LoadError({
  title = "Couldn't load this",
  message = 'Something went wrong reaching Pantry. Check your connection and try again.',
  onRetry,
  retrying,
}: Props) {
  return (
    <div className={styles.wrap} role="alert">
      <svg className={styles.icon} width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 16a20 20 0 0 1 28 0" />
        <path d="M11 21.5a12.5 12.5 0 0 1 18 0" />
        <path d="M16 27a5 5 0 0 1 8 0" />
        <line x1="6" y1="6" x2="34" y2="34" />
      </svg>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      <button className={styles.retry} onClick={onRetry} disabled={retrying}>
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  )
}
