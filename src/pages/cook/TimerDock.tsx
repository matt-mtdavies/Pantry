import { useEffect, useRef, useState } from 'react'
import { type CookTimer, timeLeftMs, formatClock, MAX_TIMERS } from '../../hooks/useCookTimers'
import styles from './TimerDock.module.css'

const PRESETS = [1, 5, 10, 15, 20]
const RING_R = 18


interface Props {
  timers: CookTimer[]
  now: number
  currentStep: number
  /** Lane to open from outside (e.g. the step's "time left" button). Bump `openNonce` to re-open. */
  requestOpen: { id: string; nonce: number } | null
  onQuickStart: (minutes: number) => void
  onToggle: (id: string) => void
  onAdd: (id: string, minutes: number) => void
  onClear: (id: string) => void
  onGoToStep: (step: number) => void
}

export function ClockGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="13" r="8" /><polyline points="12 9 12 13 15 15" /><line x1="9" y1="3" x2="15" y2="3" />
    </svg>
  )
}

/** Progress ring: full when started, empties as time runs out. */
export function TimerRing({ fraction, size = 44, r = RING_R, stroke = 3, children }: {
  fraction: number; size?: number; r?: number; stroke?: number; children?: React.ReactNode
}) {
  const c = 2 * Math.PI * r
  const mid = size / 2
  return (
    <>
      <svg className={styles.ringSvg} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className={styles.ringTrack} cx={mid} cy={mid} r={r} strokeWidth={stroke} />
        <circle className={styles.ringArc} cx={mid} cy={mid} r={r} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, fraction)))} />
      </svg>
      {children}
    </>
  )
}

/**
 * Cook-mode timer bar: quick-set chips when idle, then up to two named lanes.
 * Lanes keep their position; sienna is lane A, saffron lane B, sage means done.
 */
export default function TimerDock({ timers, now, currentStep, requestOpen, onQuickStart, onToggle, onAdd, onClear, onGoToStep }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customMins, setCustomMins] = useState('')
  const [customSecs, setCustomSecs] = useState('')
  const collapseRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const armCollapse = () => {
    if (collapseRef.current) clearTimeout(collapseRef.current)
    collapseRef.current = setTimeout(() => { setOpenId(null); setAdding(false) }, 5000)
  }
  useEffect(() => () => { if (collapseRef.current) clearTimeout(collapseRef.current) }, [])

  useEffect(() => {
    if (!requestOpen) return
    setOpenId(requestOpen.id)
    setAdding(false)
    armCollapse()
  }, [requestOpen])

  // A cleared lane can't stay open.
  useEffect(() => {
    if (openId && !timers.some(t => t.id === openId)) setOpenId(null)
  }, [timers, openId])

  const quick = (mins: number) => {
    onQuickStart(mins)
    setAdding(false)
    setCustomOpen(false)
    setCustomMins('')
    setCustomSecs('')
  }

  const setCustom = () => {
    const secs = parseInt(customMins || '0', 10) * 60 + parseInt(customSecs || '0', 10)
    if (secs >= 1) quick(secs / 60)
  }

  const picker = (
    <>
      <div className={styles.pickerRow}>
        <div className={styles.pickerChips}>
          {PRESETS.map(m => (
            <button key={m} className={styles.chip} onClick={() => quick(m)} aria-label={`Set ${m} minute timer`}>{m}m</button>
          ))}
        </div>
        <button
          className={`${styles.iconBtn} ${customOpen ? styles.iconBtnOpen : ''}`}
          onClick={() => { setCustomOpen(v => !v); if (collapseRef.current) clearTimeout(collapseRef.current) }}
          aria-label="Set custom time"
          aria-expanded={customOpen}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      {customOpen && (
        <form className={styles.customRow} onSubmit={e => { e.preventDefault(); setCustom() }}>
          <label className={styles.customField}>
            <input type="number" min="0" max="999" inputMode="numeric" className={styles.customInput}
              value={customMins} onChange={e => setCustomMins(e.target.value)} placeholder="00" aria-label="Minutes" autoFocus />
            <span className={styles.customUnit}>m</span>
          </label>
          <span className={styles.customSep}>:</span>
          <label className={styles.customField}>
            <input type="number" min="0" max="59" inputMode="numeric" className={styles.customInput}
              value={customSecs} onChange={e => setCustomSecs(e.target.value)} placeholder="00" aria-label="Seconds" />
            <span className={styles.customUnit}>s</span>
          </label>
          <button type="submit" className={styles.customSet} disabled={!customMins && !customSecs}>Set →</button>
        </form>
      )}
    </>
  )

  if (!timers.length) {
    return (
      <div className={styles.dock}>
        <div className={styles.idle}>
          <span className={styles.idleIcon}><ClockGlyph /></span>
          <div className={styles.idleBody}>{picker}</div>
        </div>
      </div>
    )
  }

  const open = timers.find(t => t.id === openId) ?? null

  return (
    <div className={styles.dock} role="group" aria-label="Timers">
      <div className={`${styles.lanes} ${timers.length === 1 ? styles.lanesOne : ''}`}>
        {timers.map(t => {
          const left = timeLeftMs(t, now)
          const running = t.endsAt != null && !t.done
          const paused = !running && !t.done
          const isOpen = openId === t.id
          const showStep = t.step != null && timers.length === 1 && !t.label.includes(' · ')
          return (
            <div
              key={t.id}
              className={[
                styles.lane, t.lane === 'b' ? styles.laneB : '', t.done ? styles.laneDone : '',
                paused ? styles.lanePaused : '', isOpen ? styles.laneOpen : '',
                running && left <= 60_000 ? styles.laneLast : '',
              ].join(' ')}
            >
              <button
                className={styles.ring}
                onClick={() => (t.done ? onClear(t.id) : onToggle(t.id))}
                aria-label={t.done ? `Dismiss ${t.label} timer` : running ? `Pause ${t.label} timer` : `Resume ${t.label} timer`}
              >
                <TimerRing fraction={t.done ? 1 : left / t.totalMs}>
                  <span className={styles.ringIcon}>
                    {t.done ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                    ) : running ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" /></svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
                    )}
                  </span>
                </TimerRing>
              </button>
              <button
                className={styles.laneBody}
                onClick={() => { setOpenId(isOpen ? null : t.id); setAdding(false); armCollapse() }}
                aria-expanded={isOpen}
                aria-label={`${t.label}: ${t.done ? 'done' : `${formatClock(left)} left${paused ? ', paused' : ''}`}. Show options`}
              >
                <span className={styles.time}>{t.done ? 'Done' : formatClock(left)}</span>
                <span className={styles.label}>
                  {t.label}{showStep && <span className={styles.labelStep}> · step {t.step! + 1}</span>}
                </span>
              </button>
            </div>
          )
        })}
        {timers.length < MAX_TIMERS && (
          <button
            className={`${styles.ghost} ${adding ? styles.ghostOpen : ''}`}
            onClick={() => { setAdding(v => !v); setOpenId(null); armCollapse() }}
            aria-expanded={adding}
          >
            <span aria-hidden="true">+</span> Second timer
          </button>
        )}
      </div>

      {open && (
        <div className={`${styles.tray} ${open.lane === 'b' ? styles.laneB : ''} ${open.done ? styles.laneDone : ''}`}>
          <button className={`${styles.chip} ${styles.chipTint}`} onClick={() => { onAdd(open.id, 1); armCollapse() }}>+1m</button>
          {!open.done && <button className={`${styles.chip} ${styles.chipTint}`} onClick={() => { onAdd(open.id, 5); armCollapse() }}>+5m</button>}
          {open.step != null && open.step !== currentStep && (
            <button className={styles.chip} onClick={() => { onGoToStep(open.step!); setOpenId(null) }}>Go to step {open.step + 1}</button>
          )}
          <button className={`${styles.chip} ${styles.chipEnd}`} onClick={() => onClear(open.id)}>{open.done ? 'Dismiss' : 'Clear'}</button>
        </div>
      )}

      {adding && !open && <div className={styles.trayPicker}>{picker}</div>}
    </div>
  )
}



/** Both lanes busy: ask which timer the new one should replace. */
export function ReplaceTimerSheet({ timers, now, label, minutes, onReplace, onCancel }: {
  timers: CookTimer[]; now: number; label: string; minutes: number
  onReplace: (id: string) => void; onCancel: () => void
}) {
  const firstRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef(onCancel)
  cancelRef.current = onCancel
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    firstRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelRef.current() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [])

  return (
    <div className={styles.sheetOverlay} onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="replace-timer-title">
        <h2 id="replace-timer-title" className={styles.sheetTitle}>Both timers are running</h2>
        <p className={styles.sheetText}>Replace one with {label} ({formatClock(minutes * 60_000)})?</p>
        {timers.map((t, i) => (
          <button
            key={t.id}
            ref={i === 0 ? firstRef : undefined}
            className={`${styles.pick} ${t.lane === 'b' ? styles.laneB : ''} ${t.done ? styles.laneDone : ''}`}
            onClick={() => onReplace(t.id)}
          >
            <span>Replace {t.label}</span>
            <span className={styles.pickTime}>{t.done ? 'Done' : formatClock(timeLeftMs(t, now))}</span>
          </button>
        ))}
        <button className={styles.sheetCancel} onClick={onCancel}>Keep both</button>
      </div>
    </div>
  )
}
