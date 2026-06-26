import { useState } from 'react'
import { submitFeedback } from '../lib/api'
import styles from './FeedbackModal.module.css'

const CATEGORIES = [
  { id: 'idea', label: 'Feature idea' },
  { id: 'bug', label: 'Bug report' },
  { id: 'general', label: 'General' },
] as const

type CategoryId = typeof CATEGORIES[number]['id']

interface Props {
  onClose: () => void
}

export function FeedbackModal({ onClose }: Props) {
  const [category, setCategory] = useState<CategoryId>('idea')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!message.trim() || message.trim().length < 5) {
      setError('Please write a bit more before submitting.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await submitFeedback(category, message.trim())
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Share feedback</h2>
            <p className={styles.sub}>Ideas, bugs, or anything on your mind.</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {done ? (
          <div className={styles.success}>
            <div className={styles.successIcon} aria-hidden="true">✓</div>
            <p className={styles.successTitle}>Thanks for the feedback!</p>
            <p className={styles.successSub}>Every suggestion helps make Pantry better.</p>
            <button className={styles.doneBtn} onClick={onClose}>Done</button>
          </div>
        ) : (
          <div className={styles.form}>
            <div className={styles.categoryRow}>
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  className={`${styles.categoryBtn} ${category === c.id ? styles.categoryBtnActive : ''}`}
                  onClick={() => setCategory(c.id)}
                  aria-pressed={category === c.id}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="feedback-message">
                {category === 'idea' ? 'What would you like to see?' :
                 category === 'bug' ? 'What went wrong?' :
                 'What\'s on your mind?'}
              </label>
              <textarea
                id="feedback-message"
                className={styles.textarea}
                value={message}
                onChange={e => { setMessage(e.target.value); setError(null) }}
                placeholder={
                  category === 'idea' ? 'e.g. It would be great if I could...' :
                  category === 'bug' ? 'e.g. When I tap X, it shows...' :
                  'e.g. I really like...'
                }
                rows={5}
                maxLength={2000}
              />
              <p className={styles.charCount}>{message.length}/2000</p>
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={submitting || !message.trim()}
            >
              {submitting ? 'Sending…' : 'Send feedback'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
