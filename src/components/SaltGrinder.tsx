import styles from './SaltGrinder.module.css'

export default function SaltGrinder({ size = 48 }: { size?: number }) {
  const h = Math.round(size * 1.6)
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 56 90"
      className={styles.grinder}
      aria-label="Loading"
      role="img"
    >
      {/* Body — translucent glass cylinder */}
      <rect x="8" y="22" width="40" height="42" rx="9" className={styles.body} />

      {/* Label band detail */}
      <rect x="8" y="38" width="40" height="9" rx="0" className={styles.band} />

      {/* Cap — solid, this part twists */}
      <rect x="13" y="3" width="30" height="21" rx="8" className={styles.cap} />

      {/* Knob on top of cap */}
      <rect x="21" y="0" width="14" height="6" rx="3" className={styles.knob} />

      {/* Grind mechanism at base */}
      <rect x="18" y="60" width="20" height="10" rx="5" className={styles.base} />

      {/* Salt crystals falling */}
      <circle cx="24" cy="73" r="2.2" className={`${styles.crystal} ${styles.cr1}`} />
      <circle cx="28" cy="76" r="1.8" className={`${styles.crystal} ${styles.cr2}`} />
      <circle cx="32" cy="71" r="2"   className={`${styles.crystal} ${styles.cr3}`} />
      <circle cx="26" cy="80" r="1.5" className={`${styles.crystal} ${styles.cr4}`} />
    </svg>
  )
}
