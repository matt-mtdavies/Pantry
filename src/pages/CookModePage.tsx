import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import SaltGrinder from '../components/SaltGrinder'
import { getRecipe } from '../lib/api'
import { detectTimerMinutes, scaleIngredient, formatTime } from '../lib/utils'
import { useWakeLock } from '../hooks/useWakeLock'
import { useAuth } from '../hooks/useAuth'
import { convertIngredient, convertStepText } from '../lib/units'
import type { Recipe, Ingredient } from '../types'
import styles from './CookModePage.module.css'

function Timer({ initialMinutes, label }: { initialMinutes: number; label: string }) {
  const [seconds, setSeconds] = useState(initialMinutes * 60)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => setSeconds(s => {
        if (s <= 1) {
          setRunning(false)
          clearInterval(intervalRef.current!)
          return 0
        }
        return s - 1
      }), 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const done = seconds === 0

  return (
    <div className={`${styles.timer} ${done ? styles.timerDone : ''}`}>
      <span className={styles.timerLabel}>{label}</span>
      <span className={styles.timerTime}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
      <div className={styles.timerBtns}>
        {!done && (
          <button
            className={styles.timerBtn}
            onClick={() => setRunning(r => !r)}
          >
            {running ? 'Pause' : 'Start'}
          </button>
        )}
        {done ? (
          <span className={styles.timerDoneLabel}>Done! ✓</span>
        ) : (
          <button
            className={styles.timerReset}
            onClick={() => { setRunning(false); setSeconds(initialMinutes * 60) }}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}

const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const lang = (navigator.language || 'en').split('-')[0]
  // iOS/macOS Enhanced voices, Edge Natural voices — all clearly better than the default
  return (
    voices.find(v => v.lang.startsWith(lang) && /enhanced|premium|natural/i.test(v.name)) ??
    voices.find(v => v.lang.startsWith(lang) && v.localService && !v.default) ??
    voices.find(v => v.lang.startsWith(lang) && v.default) ??
    voices.find(v => v.lang.startsWith('en') && /enhanced|premium|natural/i.test(v.name)) ??
    voices.find(v => v.lang.startsWith('en')) ??
    null
  )
}

export default function CookModePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set())
  const [servings, setServings] = useState<number>(2)
  const [showIngredients, setShowIngredients] = useState(true)
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [showCelebration, setShowCelebration] = useState(false)
  const { isActive, acquire, release, supported } = useWakeLock()
  const { user } = useAuth()

  useEffect(() => {
    if (!id) return
    getRecipe(id)
      .then(r => {
        setRecipe(r)
        setServings(r.servings ?? 2)
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  useEffect(() => {
    acquire()
    return () => release()
  }, [acquire, release])

  const scaledIngredients = useMemo<Ingredient[]>(() => {
    if (!recipe) return []
    const base = recipe.servings ?? servings
    const unitPref = user?.unit_system ?? 'metric'
    return recipe.ingredients.map(ing => {
      const scaled = scaleIngredient(ing, base, servings)
      const c = convertIngredient(scaled.amount, scaled.unit, unitPref)
      return { ...scaled, amount: c.amount, unit: c.unit }
    })
  }, [recipe, servings, user?.unit_system])

  const stepTimers = useMemo(() => {
    if (!recipe) return []
    return recipe.steps.map(step => detectTimerMinutes(step))
  }, [recipe])

  useEffect(() => {
    if (!ttsSupported) return
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  useEffect(() => {
    if (!ttsSupported) return
    if (!ttsEnabled || !recipe) {
      window.speechSynthesis.cancel()
      return
    }
    const text = convertStepText(recipe.steps[currentStep], user?.unit_system ?? 'metric')
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voice = pickVoice(voices)
    if (voice) utterance.voice = voice
    utterance.rate = 0.9
    utterance.pitch = 1.0
    window.speechSynthesis.speak(utterance)
  }, [ttsEnabled, currentStep, recipe, user?.unit_system, voices])

  useEffect(() => {
    return () => { if (ttsSupported) window.speechSynthesis.cancel() }
  }, [])

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

  const step = convertStepText(recipe.steps[currentStep], user?.unit_system ?? 'metric')
  const timers = stepTimers[currentStep]

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <Link to={`/recipe/${recipe.id}`} className={styles.exit} aria-label="Exit cook mode">
          ← Exit
        </Link>
        <div className={styles.headerTitle}>
          <span className={styles.recipeTitle}>{recipe.title}</span>
        </div>
        {ttsSupported && (
          <button
            className={`${styles.ttsBtn} ${ttsEnabled ? styles.ttsBtnOn : ''}`}
            onClick={() => setTtsEnabled(v => !v)}
            aria-label={ttsEnabled ? 'Turn off read aloud' : 'Read steps aloud'}
            title={ttsEnabled ? 'Read aloud on — tap to turn off' : 'Tap to read steps aloud'}
          >
            {ttsEnabled ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
          </button>
        )}
        {supported && (
          <button
            className={`${styles.wakeLock} ${isActive ? styles.wakeLockOn : ''}`}
            onClick={isActive ? release : acquire}
            aria-label={isActive ? 'Screen will stay on' : 'Tap to keep screen on'}
            title={isActive ? 'Screen on — tap to release' : 'Tap to keep screen on'}
          >
            {isActive ? '☀️' : '🌙'}
          </button>
        )}
      </header>

      {/* Servings scaler */}
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
        {/* Ingredient checklist */}
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

        {/* Step view */}
        <section className={styles.main}>
          <div className={styles.stepCounter}>
            Step {currentStep + 1} of {recipe.steps.length}
          </div>

          <div className={styles.progressBar} role="progressbar"
            aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={recipe.steps.length}>
            <div
              className={styles.progressFill}
              style={{ width: `${((currentStep + 1) / recipe.steps.length) * 100}%` }}
            />
          </div>

          <p className={styles.stepText}>{step}</p>

          {timers.length > 0 && (
            <div className={styles.timers}>
              {timers.map((mins, i) => (
                <Timer
                  key={`${currentStep}-${i}`}
                  initialMinutes={mins}
                  label={formatTime(mins)}
                />
              ))}
            </div>
          )}

          <div className={styles.stepNav}>
            <button
              className={styles.navBtn}
              onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
              disabled={currentStep === 0}
            >
              ← Previous
            </button>

            {currentStep < recipe.steps.length - 1 ? (
              <button
                className={`${styles.navBtn} ${styles.navBtnNext}`}
                onClick={() => setCurrentStep(s => s + 1)}
              >
                Next →
              </button>
            ) : (
              <button
                className={`${styles.navBtn} ${styles.navBtnDone}`}
                onClick={() => setShowCelebration(true)}
              >
                All done! ✓
              </button>
            )}
          </div>

          {/* Step dots */}
          <div className={styles.dots} role="tablist" aria-label="Steps">
            {recipe.steps.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === currentStep}
                className={`${styles.dot} ${i === currentStep ? styles.dotActive : ''} ${i < currentStep ? styles.dotDone : ''}`}
                onClick={() => setCurrentStep(i)}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </section>
      </div>

      {showCelebration && (
        <div className={styles.celebration} role="dialog" aria-modal="true" aria-label="Recipe complete">
          <div className={styles.clocheScene}>
            <svg viewBox="0 0 200 200" className={styles.clocheSvg} aria-hidden="true">
              {/* Tray (static) */}
              <ellipse cx="100" cy="179" rx="82" ry="11" fill="#3A3530" />
              <ellipse cx="100" cy="177" rx="78" ry="10" fill="#6A6058" />
              <ellipse cx="100" cy="174" rx="65" ry="8.5" fill="#D4CCC4" />
              <ellipse cx="100" cy="172" rx="56" ry="7"   fill="#FAF7F2" />

              {/* Food revealed after lid lifts */}
              <g className={styles.revealFood}>
                <ellipse cx="100" cy="169" rx="24" ry="5.5" fill="#C4633E" />
                <circle cx="72"  cy="169" r="5.5" fill="#7A8B6F" />
                <circle cx="128" cy="169" r="5.5" fill="#7A8B6F" />
                <circle cx="87"  cy="166.5" r="2.5" fill="#E8A87C" />
                <circle cx="113" cy="166.5" r="2.5" fill="#E8A87C" />
              </g>

              {/* Steam rises after lid is gone */}
              <path className={`${styles.steam} ${styles.steam1}`}
                d="M 88 158 Q 83 145 88 132 Q 93 119 88 106"
                fill="none" stroke="rgba(250,247,242,0.45)" strokeWidth="2.5" strokeLinecap="round" />
              <path className={`${styles.steam} ${styles.steam2}`}
                d="M 100 155 Q 96 142 100 129 Q 104 116 100 103"
                fill="none" stroke="rgba(250,247,242,0.45)" strokeWidth="2.5" strokeLinecap="round" />
              <path className={`${styles.steam} ${styles.steam3}`}
                d="M 112 158 Q 117 145 112 132 Q 107 119 112 106"
                fill="none" stroke="rgba(250,247,242,0.45)" strokeWidth="2.5" strokeLinecap="round" />

              {/* Cloche dome — lifts up */}
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
          <Link to={`/recipe/${recipe.id}`} className={styles.celebBtn}>
            Back to recipe →
          </Link>
        </div>
      )}
    </div>
  )
}
