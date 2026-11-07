import type { UnitSystem } from '../lib/units'
import styles from './UnitToggle.module.css'

interface Props {
  value: UnitSystem
  onChange: (u: UnitSystem) => void
}

/** Metric / Imperial segmented switch for recipe quantities. */
export default function UnitToggle({ value, onChange }: Props) {
  return (
    <div className={`${styles.wrap} no-print`} role="group" aria-label="Units">
      {(['metric', 'imperial'] as const).map(u => (
        <button
          key={u}
          type="button"
          className={`${styles.opt} ${value === u ? styles.active : ''}`}
          aria-pressed={value === u}
          onClick={() => onChange(u)}
        >
          {u === 'metric' ? 'Metric' : 'Imperial'}
        </button>
      ))}
    </div>
  )
}
