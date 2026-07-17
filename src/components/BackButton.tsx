import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from './icons'
import styles from './BackButton.module.css'

interface Props {
  fallback?: string
  variant?: 'ghost' | 'subtle'
  className?: string
}

export function BackButton({ fallback = '/', variant = 'ghost', className }: Props) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(fallback)
    }
  }

  return (
    <button
      className={`${styles.btn} ${variant === 'ghost' ? styles.ghost : styles.subtle} ${className ?? ''}`}
      onClick={handleBack}
      aria-label="Go back"
    >
      <ChevronLeftIcon size={15} />
      <span className={styles.label}>Back</span>
    </button>
  )
}
