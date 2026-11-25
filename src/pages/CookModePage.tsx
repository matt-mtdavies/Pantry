import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import SaltGrinder from '../components/SaltGrinder'
import { getRecipe } from '../lib/api'
import { scaleIngredient, detectTimerMinutes } from '../lib/utils'
import { useWakeLock } from '../hooks/useWakeLock'
import { useUnitSystem } from '../hooks/useUnitSystem'
import { convertIngredient, convertStepText } from '../lib/units'
import type { Recipe, Ingredient } from '../types'
import { useCookTimers, timerLabelFromStep, spokenLabel, timeLeftMs, formatClock, type CookTimer, type StartOpts } from '../hooks/useCookTimers'
import TimerDock, { ReplaceTimerSheet, TimerRing, ClockGlyph } from './cook/TimerDock'
import styles from './CookModePage.module.css'


const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

// Matches the CSS breakpoint where the ingredients sidebar stacks above the step.
const NARROW_QUERY = '(max-width: 768px)'
const isNarrow = () => typeof window !== 'undefined' && window.matchMedia?.(NARROW_QUERY).matches

function formatTimerLabel(mins: number): string {
  if (mins < 60) return `${mins}:00`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

/** Three soft two-tone chimes through the shared AudioContext. `pitch` lowers the second lane's chime. */
function playChime(ctx: AudioContext, pitch = 1) {
  const now = ctx.currentTime
  for (let i = 0; i < 3; i++) {
    for (const [offset, freq] of [[0, 880], [0.18, 1318.5]] as const) {
      const t = now + i * 0.9 + offset
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq * pitch
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.75)
    }
  }
}

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const lang = (navigator.language || 'en').split('-')[0]
  return (
    voices.find(v => v.lang.startsWith(lang) && /enhanced|premium|natural/i.test(v.name)) ??
    voices.find(v => v.lang.startsWith(lang) && v.localService && !v.default) ??
    voices.find(v => v.lang.startsWith(lang) && v.default) ??
    voices.find(v => v.lang.startsWith('en') && /enhanced|premium|natural/i.test(v.name)) ??
    voices.find(v => v.lang.startsWith('en')) ??
    null
  )
}

/** `demo`: cook a recipe from the public read-only demo (no account, no API). */
export default function CookModePage({ demo = false }: { demo?: boolean }) {
  const recipeBase = demo ? '/demo/recipe' : '/recipe'
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set())
  const [servings, setServings] = useState<number>(2)
  // Collapsed on phones so the current step isn't pushed below the fold.
  const [showIngredients, setShowIngredients] = useState(() => !isNarrow())
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [ttsSpeaking, setTtsSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [showCelebration, setShowCelebration] = useState(false)
  const celebBtnRef = useRef<HTMLAnchorElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const audioCacheRef = useRef<Map<string, AudioBuffer>>(new Map())
  const { acquire, release } = useWakeLock()
  const [unitPref] = useUnitSystem()

  // Celebration overlay: focus its main action, and let Escape dismiss it
  // (back to the last step) so it is never a single-exit takeover.
  useEffect(() => {
    if (!showCelebration) return
    celebBtnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowCelebration(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showCelebration])

  // Cook timers: up to two named lanes (see useCookTimers / TimerDock).
  const [replaceFor, setReplaceFor] = useState<StartOpts | null>(null)
  const [openLane, setOpenLane] = useState<{ id: string; nonce: number } | null>(null)
  const [timerAnnounce, setTimerAnnounce] = useState('')
  const { timers, now, start, replace, toggle, addTime, clear } = useCookTimers(
    `pantry_cook_timers:${demo ? 'demo:' : ''}${id}`,
    (t: CookTimer) => {
      if (navigator.vibrate) navigator.vibrate([300, 150, 300])
      const ctx = audioCtxRef.current
      if (ctx) { try { playChime(ctx, t.lane === 'b' ? 0.75 : 1) } catch { /* ignore */ } }
      setTimerAnnounce(`${spokenLabel(t.label)} timer is done`)
      if (ttsEnabled) void speakText(`${spokenLabel(t.label)} is done`)
    },
  )

  useEffect(() => {
    if (!id) return
    const load = demo
      ? Promise.all([import('../lib/demo'), import('../lib/demoPhotos').then(m => m.loadDemoPhotos())])
          .then(([m]) => m.getDemoRecipe(id) ?? Promise.reject(new Error('not found')))
      : getRecipe(id)
    load
      .then(r => {
        setRecipe(r)
        // Carry over servings scaled on the recipe page (?serves=N).
        const requested = parseInt(searchParams.get('serves') ?? '', 10)
        setServings(requested > 0 ? requested : r.servings ?? 2)
      })
      .catch(() => navigate(demo ? '/demo' : '/'))
      .finally(() => setLoading(false))
  }, [id, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Screen always stays on while cooking
  useEffect(() => {
    acquire()
    return () => release()
  }, [acquire, release])

  // Create/resume the shared AudioContext. Must run synchronously inside a
  // click handler (before any await) or iOS won't let it make sound later.
  const ensureAudioCtx = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      if (audioCtxRef.current.state === 'suspended') void audioCtxRef.current.resume()
    } catch { /* Web Audio unavailable — vibration + visual state still work */ }
    return audioCtxRef.current
  }

  const startQuickTimer = (mins: number) => {
    ensureAudioCtx()
    const label = timers.some(t => t.label === 'Timer') ? 'Timer 2' : 'Timer'
    start({ minutes: mins, label })
  }

  const startStepTimer = (mins: number) => {
    if (!recipe) return
    ensureAudioCtx()
    const opts: StartOpts = {
      minutes: mins,
      label: timerLabelFromStep(recipe.steps[currentStep] ?? '', currentStep),
      step: currentStep,
      sourceMins: mins,
    }
    if (!start(opts)) setReplaceFor(opts)
  }

  // Load system voices for Web Speech fallback
  useEffect(() => {
    if (!ttsSupported) return
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  // Cleanup all audio and timer on unmount
  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) { try { sourceNodeRef.current.stop() } catch { /* */ } }
      audioRef.current?.pause()
      audioCtxRef.current?.close()
      if (ttsSupported) window.speechSynthesis.cancel()
    }
  }, [])

  const scaledIngredients = useMemo<Ingredient[]>(() => {
    if (!recipe) return []
    const base = recipe.servings ?? servings
    return recipe.ingredients.map(ing => {
      const scaled = scaleIngredient(ing, base, servings)
      const c = convertIngredient(scaled.amount, scaled.unit, unitPref)
      return { ...scaled, amount: c.amount, unit: c.unit }
    })
  }, [recipe, servings, unitPref])

  // ── TTS ─────────────────────────────────────────────────────────────────────

  const fallbackSpeak = (text: string) => {
    if (!ttsSupported) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voice = pickVoice(voices)
    if (voice) utterance.voice = voice
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop() } catch { /* already ended */ }
      sourceNodeRef.current = null
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (ttsSupported) window.speechSynthesis.cancel()
    setTtsSpeaking(false)
  }

  const speakText = async (text: string, hd = false) => {
    if (!audioCtxRef.current) return
    const ctx = audioCtxRef.current
    stopAudio()
    setTtsSpeaking(true)
    try {
      const cacheKey = hd ? `hd:${text}` : text
      let buffer = audioCacheRef.current.get(cacheKey)
      if (!buffer) {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, ...(hd && { hd: true }) }),
        })
        if (!res.ok) throw new Error('TTS API unavailable')
        buffer = await ctx.decodeAudioData(await res.arrayBuffer())
        audioCacheRef.current.set(cacheKey, buffer)
      }
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.onended = () => setTtsSpeaking(false)
      sourceNodeRef.current = source
      source.start()
    } catch {
      setTtsSpeaking(false)
      fallbackSpeak(text)
    }
  }

  const speakStep = async (stepIndex: number) => {
    if (!recipe) return
    const text = convertStepText(recipe.steps[stepIndex], unitPref)
    await speakText(text)
  }

  const handleTtsToggle = async () => {
    if (ttsEnabled) {
      stopAudio()
      setTtsEnabled(false)
      return
    }
    // Create and resume AudioContext synchronously within the user gesture —
    // this is what unlocks audio on iOS before the async fetch happens.
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume()
    setTtsEnabled(true)
    await speakStep(currentStep)
  }

  const goToStep = (step: number) => {
    setCurrentStep(step)
    if (ttsEnabled) speakStep(step)
  }

  // ────────────────────────────────────────────────────────────────────────────

  const toggleIngredient = (i: number) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}><SaltGrinder /></div>
      </div>
    )
  }

  if (!recipe) return null

  const step = convertStepText(recipe.steps[currentStep], unitPref)
  const stepTimers = detectTimerMinutes(recipe.steps[currentStep] ?? '')
  const ttsLabel = !ttsEnabled ? 'Read steps aloud' : ttsSpeaking ? 'Reading…' : 'Stop reading'
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={`${recipeBase}/${recipe.id}`} className={styles.exit} aria-label="Exit cook mode">
          ← Exit
        </Link>
        <div className={styles.headerTitle}>
          <span className={styles.recipeTitle}>{recipe.title}</span>
        </div>
      </header>

      <TimerDock
        timers={timers}
        now={now}
        currentStep={currentStep}
        requestOpen={openLane}
        onQuickStart={startQuickTimer}
        onToggle={toggle}
        onAdd={addTime}
        onClear={clear}
        onGoToStep={goToStep}
      />
      <p className="sr-only" aria-live="assertive">{timerAnnounce}</p>

      <div className={styles.scaler}>
        <span className={styles.scalerLabel}>Serves</span>
        <button
          className={styles.scalerBtn}
          onClick={() => setServings(s => Math.max(1, s - 1))}
          aria-label="Decrease servings"
          disabled={servings <= 1}
        >−</button>
        <span className={styles.scalerNum}>{servings}</span>
        <button
          className={styles.scalerBtn}
          onClick={() => setServings(s => s + 1)}
          aria-label="Increase servings"
        >+</button>
      </div>

      <div className={styles.body}>
        <section className={`${styles.sidebar} ${showIngredients ? '' : styles.sidebarHidden}`}>
          <button
            className={styles.sidebarToggle}
            onClick={() => setShowIngredients(v => !v)}
            aria-expanded={showIngredients}
          >
            {showIngredients ? '▴ Hide' : '▾ Ingredients'}
          </button>

          {showIngredients && (
            <ul className={styles.ingredients}>
              {scaledIngredients.map((ing, i) => (
                <li key={i} className={styles.ingredient}>
                  <label className={`${styles.ingLabel} ${checkedIngredients.has(i) ? styles.ingChecked : ''}`}>
                    <input
                      type="checkbox"
                      checked={checkedIngredients.has(i)}
                      onChange={() => toggleIngredient(i)}
                      className={styles.ingCheckbox}
                    />
                    <span className={styles.ingText}>
                      <strong>{ing.amount} {ing.unit}</strong> {ing.name}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        <main className={styles.main}>
          <h1 className="sr-only">{recipe.title}</h1>
          <div className={styles.stepCounter}>
            Step {currentStep + 1} of {recipe.steps.length}
          </div>

          <div className={styles.progressBar} role="progressbar" aria-label="Recipe progress"
            aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={recipe.steps.length}>
            <div
              className={styles.progressFill}
              style={{ width: `${((currentStep + 1) / recipe.steps.length) * 100}%` }}
            />
          </div>

          <p className={styles.stepText}>{step}</p>

          {stepTimers.length > 0 && (
            <div className={styles.stepTimers}>
              {stepTimers.map(mins => {
                const linked = timers.find(t => !t.done && t.step === currentStep && t.sourceMins === mins)
                if (linked) {
                  const left = timeLeftMs(linked, now)
                  return (
                    <button
                      key={mins}
                      className={`${styles.stepTimerLinked} ${linked.lane === 'b' ? styles.laneB : ''}`}
                      onClick={() => setOpenLane({ id: linked.id, nonce: Date.now() })}
                      aria-label={`${linked.label} timer: ${formatClock(left)} left. Show timer options`}
                    >
                      <span className={styles.stepTimerRing}>
                        <TimerRing fraction={left / linked.totalMs} size={32} r={13} stroke={3} />
                      </span>
                      <span><strong className={styles.stepTimerLeft}>{formatClock(left)}</strong> left on this step</span>
                    </button>
                  )
                }
                return (
                  <button
                    key={mins}
                    className={styles.stepTimerChip}
                    onClick={() => startStepTimer(mins)}
                    aria-label={`Start a ${mins} minute timer`}
                  >
                    <ClockGlyph size={14} />
                    Start {formatTimerLabel(mins)} timer
                  </button>
                )
              })}
            </div>
          )}

          {/* Prominent labelled TTS pill — visible right below the step text */}
          <button
            className={`${styles.ttsToggle} ${ttsEnabled ? styles.ttsToggleOn : ''}`}
            onClick={handleTtsToggle}
            aria-label={ttsLabel}
            aria-pressed={ttsEnabled}
          >
            {ttsEnabled ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
            {ttsLabel}
          </button>

          <div className={styles.stepNav}>
            <button
              className={styles.navBtn}
              onClick={() => goToStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              ← Previous
            </button>

            {currentStep < recipe.steps.length - 1 ? (
              <button
                className={`${styles.navBtn} ${styles.navBtnNext}`}
                onClick={() => goToStep(currentStep + 1)}
              >
                Next →
              </button>
            ) : (
              <button
                className={`${styles.navBtn} ${styles.navBtnDone}`}
                onClick={() => {
                  setShowCelebration(true)
                  if (ttsEnabled) speakText('Nicely done. Enjoy your meal!', true)
                }}
              >
                All done! ✓
              </button>
            )}
          </div>

          <div className={styles.dots} role="tablist" aria-label="Steps">
            {recipe.steps.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === currentStep}
                className={[
                  styles.dot, i === currentStep ? styles.dotActive : '', i < currentStep ? styles.dotDone : '',
                  timers.some(t => !t.done && t.step === i) ? (timers.find(t => !t.done && t.step === i)!.lane === 'b' ? styles.dotTimerB : styles.dotTimerA) : '',
                ].join(' ')}
                onClick={() => goToStep(i)}
                aria-label={`Go to step ${i + 1}${timers.some(t => !t.done && t.step === i) ? ' (timer running)' : ''}`}
              />
            ))}
          </div>
        </main>
      </div>

      {replaceFor && (
        <ReplaceTimerSheet
          timers={timers}
          now={now}
          label={replaceFor.label}
          minutes={replaceFor.minutes}
          onReplace={tid => { replace(tid, replaceFor); setReplaceFor(null) }}
          onCancel={() => setReplaceFor(null)}
        />
      )}

      {showCelebration && (
        <div className={styles.celebration} role="dialog" aria-modal="true" aria-label="Recipe complete">
          <button
            type="button"
            className={styles.celebClose}
            onClick={() => setShowCelebration(false)}
            aria-label="Close and stay in cook mode"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="4" y1="4" x2="14" y2="14" /><line x1="14" y1="4" x2="4" y2="14" />
            </svg>
          </button>
          <div className={styles.clocheScene}>
            <svg viewBox="0 0 200 200" className={styles.clocheSvg} aria-hidden="true">
              <ellipse cx="100" cy="179" rx="82" ry="11" fill="#3A3530" />
              <ellipse cx="100" cy="177" rx="78" ry="10" fill="#6A6058" />
              <ellipse cx="100" cy="174" rx="65" ry="8.5" fill="#D4CCC4" />
              <ellipse cx="100" cy="172" rx="56" ry="7"   fill="#FAF7F2" />

              <g className={styles.revealFood}>
                <ellipse cx="100" cy="169" rx="24" ry="5.5" fill="#A0522D" />
                <circle cx="72"  cy="169" r="5.5" fill="#7A8B6F" />
                <circle cx="128" cy="169" r="5.5" fill="#7A8B6F" />
                <circle cx="87"  cy="166.5" r="2.5" fill="#E8A87C" />
                <circle cx="113" cy="166.5" r="2.5" fill="#E8A87C" />
              </g>

              <path className={`${styles.steam} ${styles.steam1}`}
                d="M 88 158 Q 83 145 88 132 Q 93 119 88 106"
                fill="none" stroke="rgba(250,247,242,0.45)" strokeWidth="2.5" strokeLinecap="round" />
              <path className={`${styles.steam} ${styles.steam2}`}
                d="M 100 155 Q 96 142 100 129 Q 104 116 100 103"
                fill="none" stroke="rgba(250,247,242,0.45)" strokeWidth="2.5" strokeLinecap="round" />
              <path className={`${styles.steam} ${styles.steam3}`}
                d="M 112 158 Q 117 145 112 132 Q 107 119 112 106"
                fill="none" stroke="rgba(250,247,242,0.45)" strokeWidth="2.5" strokeLinecap="round" />

              <g className={styles.cloche}>
                <ellipse cx="100" cy="172" rx="70" ry="9" fill="#28231E" />
                <path d="M 30 172 C 30 120 70 82 100 82 C 130 82 170 120 170 172 Z" fill="#B4ACA4" />
                <path d="M 55 160 C 55 110 76 86 100 86 C 124 86 145 110 145 160"
                  fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                <ellipse cx="100" cy="88" rx="14" ry="5.5" fill="#7A7068" />
                <ellipse cx="100" cy="84" rx="11" ry="8"   fill="#9C9490" />
                <ellipse cx="100" cy="81" rx="8"  ry="5"   fill="#C4BCB4" />
              </g>
            </svg>
          </div>
          <h2 className={styles.celebHeading}>Nicely done!</h2>
          <p className={styles.celebSub}>{recipe.title}</p>
          <Link ref={celebBtnRef} to={`${recipeBase}/${recipe.id}`} className={styles.celebBtn}>
            Back to recipe →
          </Link>
        </div>
      )}
    </div>
  )
}
