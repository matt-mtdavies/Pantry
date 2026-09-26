import styles from './ServingsStepper.module.css'

interface Props {
  value: number
  onChange: (n: number) => void
  /** The recipe's own serving count — shows a reset link when scaled away from it. */
  base?: number | null
}

export default function ServingsStepper({ value, onChange, base }: Props) {
  const scaled = base != null && value !== base
  return (
    <div className={styles.wrap} role="group" aria-label="Servings">
      <span className={styles.label}>Serves</span>
      <button
        className={styles.btn}
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Decrease servings"
      >−</button>
      <span className={styles.value} aria-live="polite">{value}</span>
      <button
        className={styles.btn}
        onClick={() => onChange(value + 1)}
        aria-label="Increase servings"
      >+</button>
      {scaled && (
        <button className={styles.reset} onClick={() => onChange(base)}>
          Reset to {base}
        </button>
      )}
    </div>
  )
}
