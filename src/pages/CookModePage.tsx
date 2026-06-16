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

export default function CookModePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set())
  const [servings, setServings] = useState<number>(2)
  const [showIngredients, setShowIngredients] = useState(true)
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
              <Link to={`/recipe/${recipe.id}`} className={`${styles.navBtn} ${styles.navBtnDone}`}>
                All done! ✓
              </Link>
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
    </div>
  )
}
