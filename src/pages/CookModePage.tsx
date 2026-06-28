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


const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

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
  const [ttsSpeaking, setTtsSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [showCelebration, setShowCelebration] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const audioCacheRef = useRef<Map<string, AudioBuffer>>(new Map())
  const { acquire, release } = useWakeLock()
  const { user } = useAuth()

  // Global persistent timer
  const [timerSecs, setTimerSecs] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerInitialSecs, setTimerInitialSecs] = useState(0)
  const [timerDone, setTimerDone] = useState(false)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerDoneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!id) return
    getRecipe(id)
      .then(r => { setRecipe(r); setServings(r.servings ?? 2) })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  // Screen always stays on while cooking
  useEffect(() => {
    acquire()
    return () => release()
  }, [acquire, release])

  // Global timer
  useEffect(() => {
    if (!timerRunning) return
    timerIntervalRef.current = setInterval(() => {
      setTimerSecs(s => {
        if (s <= 1) {
          setTimerRunning(false)
          setTimerDone(true)
          if (timerDoneTimeoutRef.current) clearTimeout(timerDoneTimeoutRef.current)
          timerDoneTimeoutRef.current = setTimeout(() => setTimerDone(false), 5000)
          if (navigator.vibrate) navigator.vibrate([300, 150, 300])
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current) }
  }, [timerRunning])

  const loadTimer = (mins: number) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    if (timerDoneTimeoutRef.current) clearTimeout(timerDoneTimeoutRef.current)
    const secs = mins * 60
    setTimerDone(false)
    setTimerSecs(secs)
    setTimerInitialSecs(secs)
    setTimerRunning(true)
  }

  const clearTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    if (timerDoneTimeoutRef.current) clearTimeout(timerDoneTimeoutRef.current)
    setTimerRunning(false)
    setTimerSecs(0)
    setTimerInitialSecs(0)
    setTimerDone(false)
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
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      if (timerDoneTimeoutRef.current) clearTimeout(timerDoneTimeoutRef.current)
    }
  }, [])

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
    const text = convertStepText(recipe.steps[stepIndex], user?.unit_system ?? 'metric')
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

  const step = convertStepText(recipe.steps[currentStep], user?.unit_system ?? 'metric')
  const timers = stepTimers[currentStep]
  const ttsLabel = !ttsEnabled ? 'Read steps aloud' : ttsSpeaking ? 'Reading…' : 'Stop reading'
  const timerM = Math.floor(timerSecs / 60)
  const timerS = timerSecs % 60
  const timerDisplay = `${String(timerM).padStart(2, '0')}:${String(timerS).padStart(2, '0')}`
  const showTimer = timerSecs > 0 || timerDone

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={`/recipe/${recipe.id}`} className={styles.exit} aria-label="Exit cook mode">
          ← Exit
        </Link>
        <div className={styles.headerTitle}>
          <span className={styles.recipeTitle}>{recipe.title}</span>
        </div>
        {showTimer && (
          <div className={`${styles.globalTimerPill} ${timerDone ? styles.globalTimerPillDone : ''}`}>
            {timerDone ? (
              <span className={styles.globalTimerDone}>Done ✓</span>
            ) : (
              <>
                <span className={styles.globalTimerTime}>{timerDisplay}</span>
                <button
                  className={styles.globalTimerCtrl}
                  onClick={() => setTimerRunning(r => !r)}
                  aria-label={timerRunning ? 'Pause timer' : 'Resume timer'}
                >
                  {timerRunning ? '⏸' : '▶'}
                </button>
                <button
                  className={styles.globalTimerCtrl}
                  onClick={() => { setTimerRunning(false); setTimerSecs(timerInitialSecs) }}
                  aria-label="Reset timer"
                >↩</button>
              </>
            )}
            <button className={styles.globalTimerCtrl} onClick={clearTimer} aria-label="Clear timer">✕</button>
          </div>
        )}
      </header>

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

          {timers.length > 0 && (
            <div className={styles.timers}>
              {timers.map((mins, i) => (
                <button
                  key={i}
                  className={styles.timerSuggestion}
                  onClick={() => loadTimer(mins)}
                  aria-label={`Start ${formatTime(mins)} timer`}
                >
                  <span className={styles.timerSuggestionTime}>
                    {String(Math.floor(mins)).padStart(2, '0')}:00
                  </span>
                  <div className={styles.timerSuggestionInfo}>
                    <span className={styles.timerSuggestionLabel}>{formatTime(mins)}</span>
                    <span className={styles.timerSuggestionCta}>
                      {timerRunning && timerInitialSecs === mins * 60 ? 'Running ▶' : '→ Start timer'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

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
                  if (ttsEnabled) speakText('Nice job you little champion! Enjoy your fabulous creation!', true)
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
                className={`${styles.dot} ${i === currentStep ? styles.dotActive : ''} ${i < currentStep ? styles.dotDone : ''}`}
                onClick={() => goToStep(i)}
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
              <ellipse cx="100" cy="179" rx="82" ry="11" fill="#3A3530" />
              <ellipse cx="100" cy="177" rx="78" ry="10" fill="#6A6058" />
              <ellipse cx="100" cy="174" rx="65" ry="8.5" fill="#D4CCC4" />
              <ellipse cx="100" cy="172" rx="56" ry="7"   fill="#FAF7F2" />

              <g className={styles.revealFood}>
                <ellipse cx="100" cy="169" rx="24" ry="5.5" fill="#C4633E" />
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
          <Link to={`/recipe/${recipe.id}`} className={styles.celebBtn}>
            Back to recipe →
          </Link>
        </div>
      )}
    </div>
  )
}
