import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import RecipeCard from '../../components/RecipeCard'
import ServingsStepper from '../../components/ServingsStepper'
import UnitToggle from '../../components/UnitToggle'
import SaltGrinder from '../../components/SaltGrinder'
import { CollectionIcon, HeartIcon, CopyIcon, CheckIcon } from '../../components/icons'
import { demoRecipes, demoCollections, getDemoRecipe } from '../../lib/demo'
import { scaleIngredient, imageUrl, formatTime } from '../../lib/utils'
import { convertIngredient } from '../../lib/units'
import type { UnitSystem } from '../../lib/units'
import { DEMO_SHARE_TOKEN } from '../../../shared/demoContent'
import styles from './scenes.module.css'

// Tour scenes. Each renders real Pantry components with the demo content.
// Import and the dinner picker are replays of recorded results (labelled as
// such) so the tour never makes AI calls.

const SHAKSHUKA = 'de300000000000000000000000000001'
const CHILLI = 'de300000000000000000000000000002'

/** Runs `fn` after `ms` while the scene is mounted. */
function useAfter(ms: number, fn: () => void) {
  useEffect(() => { const t = setTimeout(fn, ms); return () => clearTimeout(t) }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

function Replay({ children }: { children: React.ReactNode }) {
  return <span className={styles.replayTag}>{children}</span>
}

// ── 1. The recipe box ───────────────────────────────────────────────────────
export function RecipeBoxScene() {
  return (
    <div className={styles.boxGrid}>
      {[...demoRecipes].sort((a, b) => Number(!!b.hero_image_key) - Number(!!a.hero_image_key)).slice(0, 6).map((r, i) => (
        <div key={r.id} className={styles.rise} style={{ animationDelay: `${i * 120}ms` }}>
          <RecipeCard recipe={r} href={`/demo/recipe/${r.id}`} compact />
        </div>
      ))}
    </div>
  )
}

// ── 2. Import (recorded) ────────────────────────────────────────────────────
const IMPORT_URL = 'https://www.bbcgoodfood.com/recipes/chilli-con-carne-recipe'
const IMPORT_STEPS = ['Fetching the recipe page…', 'Reading the ingredients…', 'Extracting the cooking steps…', 'Checking amounts and timings…']

export function ImportScene() {
  const chilli = getDemoRecipe(CHILLI)!
  const [typed, setTyped] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'extracting' | 'done'>('typing')
  const [msg, setMsg] = useState(0)

  useEffect(() => {
    if (phase !== 'typing') return
    if (typed >= IMPORT_URL.length) { const t = setTimeout(() => setPhase('extracting'), 500); return () => clearTimeout(t) }
    const t = setTimeout(() => setTyped(n => n + 2), 35)
    return () => clearTimeout(t)
  }, [typed, phase])

  useEffect(() => {
    if (phase !== 'extracting') return
    if (msg >= IMPORT_STEPS.length - 1) { const t = setTimeout(() => setPhase('done'), 1100); return () => clearTimeout(t) }
    const t = setTimeout(() => setMsg(m => m + 1), 1100)
    return () => clearTimeout(t)
  }, [msg, phase])

  return (
    <div className={styles.importStage}>
      <div className={styles.fakeField} aria-label="Recipe link">
        <span className={styles.fakeFieldText}>{IMPORT_URL.slice(0, typed)}<span className={styles.caret} /></span>
        <span className={styles.fakeBtn}>Import →</span>
      </div>

      {phase === 'extracting' && (
        <div className={styles.extracting} role="status">
          <SaltGrinder size={44} />
          <span>{IMPORT_STEPS[msg]}</span>
        </div>
      )}

      {phase === 'done' && (
        <div className={`${styles.importResult} ${styles.rise}`}>
          <img src={imageUrl(chilli.hero_image_key)!} alt="" className={styles.importImg} />
          <div className={styles.importBody}>
            <p className={styles.importTitle}>{chilli.title}</p>
            <p className={styles.importMeta}>
              Prep {formatTime(chilli.prep_time)} · Cook {formatTime(chilli.cook_time)} · Serves {chilli.servings}
            </p>
            <p className={styles.importMeta}>{chilli.ingredients.length} ingredients · {chilli.steps.length} steps · source link kept</p>
            <ul className={styles.importIngs}>
              {chilli.ingredients.slice(0, 5).map((ing, i) => (
                <li key={i}><strong>{[ing.amount, ing.unit].filter(Boolean).join(' ')}</strong> {ing.name}</li>
              ))}
              <li className={styles.more}>+ {chilli.ingredients.length - 5} more</li>
            </ul>
          </div>
        </div>
      )}
      <Replay>Replay of a real import · sped up</Replay>
    </div>
  )
}

// ── 3. Reading + scaling ────────────────────────────────────────────────────
export function ScaleScene() {
  const r = getDemoRecipe(SHAKSHUKA)!
  const [servings, setServings] = useState(r.servings!)
  const [units, setUnits] = useState<UnitSystem>('metric')
  const touched = useRef(false)
  const touch = () => { touched.current = true }

  // Demonstrate once, unless the viewer has started playing with it.
  useAfter(2500, () => { if (!touched.current) setServings(4) })
  useAfter(6500, () => { if (!touched.current) setUnits('imperial') })

  const ings = useMemo(() => r.ingredients.map(ing => {
    const c = convertIngredient(scaleIngredient(ing, r.servings!, servings).amount, ing.unit, units)
    return { ...ing, amount: c.amount, unit: c.unit }
  }), [r, servings, units])

  return (
    <div className={styles.scaleStage}>
      <div className={styles.scaleHead}>
        <img src={imageUrl(r.hero_image_key)!} alt="" className={styles.scaleImg} />
        <div>
          <p className={styles.scaleTitle}>{r.title}</p>
          <div className={styles.scaleControls} onPointerDown={touch} onKeyDown={touch}>
            <ServingsStepper value={servings} onChange={setServings} base={r.servings} />
            <UnitToggle value={units} onChange={setUnits} />
          </div>
        </div>
      </div>
      <ul className={styles.scaleList}>
        {ings.slice(0, 8).map((ing, i) => (
          <li key={i}>
            <span key={`${ing.amount}${ing.unit}`} className={styles.flash}>{ing.amount} {ing.unit}</span>
            <span>{ing.name}</span>
          </li>
        ))}
      </ul>
      <Replay>Live — try the buttons</Replay>
    </div>
  )
}

// ── 4. Cook mode ────────────────────────────────────────────────────────────
export function CookScene() {
  const r = getDemoRecipe(SHAKSHUKA)!
  const [step, setStep] = useState(0)
  const [checked, setChecked] = useState(0)
  const [secs, setSecs] = useState(8 * 60)
  const timerOn = step >= 1

  useEffect(() => { const t = setInterval(() => setChecked(c => Math.min(c + 1, 4)), 900); return () => clearInterval(t) }, [])
  useAfter(4200, () => setStep(1))
  useAfter(12000, () => setStep(2))
  useEffect(() => {
    if (!timerOn) return
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [timerOn])

  return (
    <div className={styles.cookStage}>
      <aside className={styles.cookSide}>
        <p className={styles.cookSideTitle}>Ingredients</p>
        <ul>
          {r.ingredients.slice(0, 6).map((ing, i) => (
            <li key={i} className={i < checked ? styles.cookChecked : ''}>
              <span className={styles.cookBox}>{i < checked && <CheckIcon size={11} />}</span>
              {[ing.amount, ing.unit].filter(Boolean).join(' ')} {ing.name}
            </li>
          ))}
        </ul>
      </aside>
      <div className={styles.cookMain}>
        <p className={styles.cookStepNo}>Step {step + 1} of {r.steps.length}</p>
        <p key={step} className={`${styles.cookStep} ${styles.fadeIn}`}>{r.steps[step]}</p>
        {timerOn && (
          <span className={styles.cookTimer}>
            ⏱ {String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}
          </span>
        )}
      </div>
    </div>
  )
}

// ── 5. Dinner picker (recorded) ─────────────────────────────────────────────
const PICKER_INPUT = ['eggs', 'spinach', 'feta']
const PICKER_IDEAS = [
  { title: 'Spinach & feta omelette', time: '10 min', shopping: [] as string[] },
  { title: 'Green shakshuka', time: '25 min', shopping: ['1 leek', '1 lemon'] },
  { title: 'Spinach & feta filo pie', time: '50 min', shopping: ['270g filo pastry', '1 bunch dill'] },
]

export function PickerScene() {
  const [shown, setShown] = useState(0)
  const [thinking, setThinking] = useState(false)
  useAfter(1800, () => setThinking(true))
  useAfter(4200, () => { setThinking(false); setShown(1) })
  useAfter(5000, () => setShown(2))
  useAfter(5800, () => setShown(3))

  return (
    <div className={styles.pickerStage}>
      <p className={styles.pickerQ}>What's in the kitchen?</p>
      <div className={styles.pickerChips}>
        {PICKER_INPUT.map((c, i) => (
          <span key={c} className={`${styles.chip} ${styles.rise}`} style={{ animationDelay: `${i * 300}ms` }}>{c}</span>
        ))}
      </div>
      {thinking && <div className={styles.extracting} role="status"><SaltGrinder size={40} /><span>Finding ideas…</span></div>}
      <ol className={styles.ideas}>
        {PICKER_IDEAS.slice(0, shown).map(idea => (
          <li key={idea.title} className={`${styles.idea} ${styles.rise}`}>
            <span className={styles.ideaTitle}>{idea.title}</span>
            <span className={styles.ideaMeta}>
              {idea.time} · {idea.shopping.length ? `Shopping list: ${idea.shopping.join(', ')}` : 'Nothing to buy'}
            </span>
          </li>
        ))}
      </ol>
      <Replay>Example result</Replay>
    </div>
  )
}

// ── 6. Collections + sharing ────────────────────────────────────────────────
export function OrganiseScene() {
  const [active, setActive] = useState<string>(demoCollections[0].id)
  const [copied, setCopied] = useState(false)
  const col = demoCollections.find(c => c.id === active)!
  const shareUrl = `${window.location.origin}/share/${DEMO_SHARE_TOKEN}`
  useAfter(5000, () => setActive(demoCollections[1].id))

  const copy = async () => {
    await navigator.clipboard?.writeText(shareUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.organiseStage}>
      <div className={styles.colChips}>
        <span className={styles.colChip}><HeartIcon size={12} /> Favourites</span>
        {demoCollections.map(c => (
          <button key={c.id} type="button" onClick={() => setActive(c.id)}
            className={`${styles.colChip} ${c.id === active ? styles.colChipActive : ''}`} aria-pressed={c.id === active}>
            <CollectionIcon size={12} /> {c.name}
          </button>
        ))}
      </div>
      <div className={styles.colGrid}>
        {col.recipe_ids.slice(0, 4).map(id => {
          const r = getDemoRecipe(id)!
          return <div key={id} className={styles.rise}><RecipeCard recipe={r} href={`/demo/recipe/${id}`} compact /></div>
        })}
      </div>
      <div className={styles.sharePanel}>
        <span className={styles.shareLabel}>Share Shakshuka</span>
        <span className={styles.shareUrl}>{shareUrl.replace(/^https?:\/\//, '')}</span>
        <button type="button" className={styles.shareCopy} onClick={copy}>
          {copied ? <><CheckIcon size={13} /> Copied</> : <><CopyIcon size={13} /> Copy</>}
        </button>
        <Link to={`/share/${DEMO_SHARE_TOKEN}`} className={styles.shareOpen}>Open as a guest →</Link>
      </div>
    </div>
  )
}

// ── 7. End card ─────────────────────────────────────────────────────────────
export function EndScene({ onReplay }: { onReplay: () => void }) {
  return (
    <div className={styles.endStage}>
      <h1 className={styles.endTitle}>That's Pantry.</h1>
      <p className={styles.endText}>
        Save recipes from anywhere, cook them step by step, and keep the good ones close.
        It's free.
      </p>
      <div className={styles.endCtas}>
        <Link to="/?signup=1#get-started" className={styles.endPrimary}>Create your free account</Link>
        <Link to="/demo" className={styles.endSecondary}>Explore the demo yourself</Link>
      </div>
      <button type="button" className={styles.endReplay} onClick={onReplay}>↺ Watch the tour again</button>
    </div>
  )
}
