import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { saveTourProgress, TOUR_SCENE_COUNT } from '../../lib/tourState'
import {
  RecipeBoxScene, ImportScene, ScaleScene, CookScene, PickerScene, OrganiseScene, EndScene,
} from './scenes'
import styles from './TourPage.module.css'

// The demo tour: 7 scenes in 5 chapters, ~2 minutes on autoplay. Skippable
// throughout (next / back / chapter jump / skip to end / exit), keyboard
// operable, and it pauses itself while the viewer interacts with a scene.

interface Scene {
  chapter: string
  title: string
  caption: string
  seconds: number | null // null = no auto-advance (end card)
}

const SCENES: Scene[] = [
  { chapter: 'Save', title: 'Your recipe box', seconds: 12,
    caption: 'Every recipe you keep, in one place — with photos, times, servings and a cost estimate at a glance.' },
  { chapter: 'Save', title: 'Import from any site', seconds: 18,
    caption: 'Paste a link and Pantry pulls out the ingredients, steps and timings. No retyping. It keeps the source link, too.' },
  { chapter: 'Cook', title: 'Scale it, switch units', seconds: 16,
    caption: 'Cooking for four instead of two? Every quantity follows — in metric or imperial.' },
  { chapter: 'Cook', title: 'Cook mode', seconds: 20,
    caption: 'One step at a time, big and readable from across the kitchen, with an ingredient checklist and timers that spot the times in each step.' },
  { chapter: 'Plan', title: "What's for dinner tonight?", seconds: 16,
    caption: 'Tell Pantry what you have. You get three ideas, and a shopping list for anything that\'s missing.' },
  { chapter: 'Share', title: 'Collections and sharing', seconds: 18,
    caption: 'Group recipes into collections. Send any recipe as a link — the person you send it to doesn\'t need an account.' },
  { chapter: 'Start', title: 'Your turn', seconds: null, caption: '' },
]

const CHAPTERS = [...new Set(SCENES.map(s => s.chapter))]

export default function TourPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const from = (location.state as { from?: string } | null)?.from ?? '/demo'

  const start = Math.min(Math.max((parseInt(params.get('scene') ?? '1', 10) || 1) - 1, 0), SCENES.length - 1)
  const [index, setIndex] = useState(start)
  const [playing, setPlaying] = useState(true)
  const [elapsed, setElapsed] = useState(0) // ms into the current scene
  const [run, setRun] = useState(0)         // bumps to remount a scene on replay
  const scene = SCENES[index]
  const isEnd = scene.seconds == null
  const stageRef = useRef<HTMLDivElement>(null)

  useDocumentMeta({
    title: 'Pantry tour · 2 minutes',
    description: 'A two-minute guided tour of Pantry: import, scaling, cook mode, dinner ideas, collections and sharing.',
    path: '/tour',
  })

  const go = useCallback((i: number) => {
    const next = Math.min(Math.max(i, 0), SCENES.length - 1)
    setIndex(next)
    setElapsed(0)
    setRun(r => r + 1)
  }, [])

  // Remember progress so the entry pill can offer "Resume" after an exit.
  useEffect(() => {
    saveTourProgress({ scene: index, finished: index === SCENES.length - 1 })
  }, [index])

  // Autoplay clock.
  useEffect(() => {
    if (!playing || isEnd) return
    const t = setInterval(() => setElapsed(e => e + 100), 100)
    return () => clearInterval(t)
  }, [playing, isEnd, index])

  useEffect(() => {
    if (scene.seconds != null && elapsed >= scene.seconds * 1000) go(index + 1)
  }, [elapsed, scene.seconds, index, go])

  const exit = useCallback(() => navigate(from), [navigate, from])

  // Keyboard: ←/→ scenes, space pause, Esc exit.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowRight') go(index + 1)
      else if (e.key === 'ArrowLeft') go(index - 1)
      else if (e.key === 'Escape') exit()
      else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLAnchorElement)) {
        e.preventDefault(); setPlaying(p => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, exit, index])

  const progress = isEnd ? 1 : Math.min(elapsed / (scene.seconds! * 1000), 1)
  const chapterIndex = CHAPTERS.indexOf(scene.chapter)

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link to="/" className={styles.brand} aria-label="Pantry home">
          <img src="/pantry-mark.png" alt="" width={26} height={26} />
          <span>Pantry tour</span>
        </Link>
        <nav className={styles.chapters} aria-label="Tour chapters">
          {CHAPTERS.map((c, ci) => {
            const first = SCENES.findIndex(s => s.chapter === c)
            const state = ci < chapterIndex ? styles.chapterDone : ci === chapterIndex ? styles.chapterNow : ''
            return (
              <button key={c} type="button" className={`${styles.chapter} ${state}`} onClick={() => go(first)}
                aria-current={ci === chapterIndex ? 'step' : undefined}>
                <span className={styles.chapterBar}>
                  <span className={styles.chapterFill} style={{
                    width: ci < chapterIndex ? '100%' : ci > chapterIndex ? '0%'
                      : `${((index - first + progress) / SCENES.filter(s => s.chapter === c).length) * 100}%`,
                  }} />
                </span>
                <span className={styles.chapterLabel}>{c}</span>
              </button>
            )
          })}
        </nav>
        <button type="button" className={styles.exit} onClick={exit}>Exit tour</button>
      </header>

      <main className={styles.main}>
        {!isEnd && (
          <div className={styles.copy}>
            <p className={styles.counter}>{index + 1} / {TOUR_SCENE_COUNT}</p>
            <h1 className={styles.title}>{scene.title}</h1>
            <p className={styles.caption} aria-live="polite">{scene.caption}</p>
          </div>
        )}
        <div
          ref={stageRef}
          key={`${index}-${run}`}
          className={`${styles.stage} ${isEnd ? styles.stageEnd : ''}`}
          // Interacting with a scene pauses autoplay so it doesn't move on mid-click.
          onPointerDown={() => !isEnd && setPlaying(false)}
        >
          {index === 0 && <RecipeBoxScene />}
          {index === 1 && <ImportScene />}
          {index === 2 && <ScaleScene />}
          {index === 3 && <CookScene />}
          {index === 4 && <PickerScene />}
          {index === 5 && <OrganiseScene />}
          {index === 6 && <EndScene onReplay={() => { setPlaying(true); go(0) }} />}
        </div>
      </main>

      {!isEnd && (
        <footer className={styles.controls}>
          <button type="button" className={styles.ctrl} onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous scene">‹ Back</button>
          <button type="button" className={`${styles.ctrl} ${styles.ctrlPlay}`} onClick={() => setPlaying(p => !p)}
            aria-label={playing ? 'Pause tour' : 'Play tour'}>
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button type="button" className={`${styles.ctrl} ${styles.ctrlNext}`} onClick={() => go(index + 1)} aria-label="Next scene">Next ›</button>
          <button type="button" className={styles.skip} onClick={() => go(SCENES.length - 1)}>Skip to the end</button>
        </footer>
      )}
    </div>
  )
}
