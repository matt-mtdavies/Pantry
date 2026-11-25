import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Up to two cook-mode timers ("lanes"), counted from timestamps so they stay
 * accurate when iOS throttles a backgrounded tab, and kept in sessionStorage so
 * a quick trip away from cook mode doesn't lose them.
 */
export type Lane = 'a' | 'b'

export interface CookTimer {
  id: string
  lane: Lane
  label: string
  /** Step that started it (null for quick-set / custom timers). */
  step: number | null
  /** Minutes value the step asked for, so the step button can show "time left". */
  sourceMins: number | null
  totalMs: number
  /** Set while running. */
  endsAt: number | null
  /** Set while paused. */
  pausedLeftMs: number | null
  done: boolean
}

export interface StartOpts { minutes: number; label: string; step?: number | null; sourceMins?: number | null }

export const MAX_TIMERS = 2

export function timeLeftMs(t: CookTimer, now: number): number {
  if (t.done) return 0
  if (t.endsAt != null) return Math.max(0, t.endsAt - now)
  return t.pausedLeftMs ?? 0
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

const STOP = new Set(['the', 'a', 'an', 'your', 'it', 'them', 'in', 'on', 'for', 'to', 'with', 'and', 'of', 'until', 'then', 'into', 'over', 'at', 'about', 'or', 'while', 'from', 'up', 'out', 'off', 'is', 'are', 'all', 'this', 'that', 'each', 'some', 'another', 'more', 'again', 'further', 'least'])

// Verbs that usually carry a cooking time ("simmer for 20 minutes").
const TIMED_VERBS = new Set([
  'bake', 'boil', 'braise', 'brown', 'chill', 'cook', 'cool', 'fry', 'freeze', 'grill', 'knead', 'leave',
  'marinate', 'microwave', 'poach', 'prove', 'reduce', 'refrigerate', 'rest', 'rise', 'roast', 'saute', 'sauté',
  'sear', 'set', 'simmer', 'soak', 'soften', 'steam', 'steep', 'stir', 'toast', 'warm', 'whisk', 'blend', 'beat',
  'chargrill', 'caramelise', 'caramelize', 'stand', 'sit', 'proof', 'blanch', 'stew', 'smoke', 'griddle', 'drain',
])
const DURATION = /\d+(?:[.,]\d+)?\s*(?:[–-]\s*\d+\s*)?(?:to\s*\d+\s*)?(?:minute|min|hour|hr|second|sec)/i

const cap = (w: string) => w[0].toUpperCase() + w.slice(1).toLowerCase()
const clean = (w: string) => w.toLowerCase().replace(/[^a-zà-ÿ'-]/g, '')

/**
 * A short lane name for a step's timer, from the verb that carries the time:
 * "Chill the sauce for 5 minutes" → "Chill sauce"; "Add the onion and cook for
 * 8 minutes" → "Cook · step 2". Falls back to "Step N".
 */
export function timerLabelFromStep(text: string, stepIndex: number): string {
  const stepTag = `step ${stepIndex + 1}`
  const sentences = text.split(/(?<=[.!?;])\s+/)
  const sentence = sentences.find(x => DURATION.test(x)) ?? sentences[0] ?? ''
  const words = sentence.split(/\s+/).filter(Boolean)
  const durAt = words.findIndex(w => /\d/.test(w))
  const end = durAt === -1 ? words.length : durAt
  let verbAt = -1
  for (let i = end - 1; i >= 0; i--) if (TIMED_VERBS.has(clean(words[i]))) { verbAt = i; break }
  if (verbAt === -1 && words.length && !/\d/.test(words[0])) verbAt = 0
  if (verbAt === -1) return `Step ${stepIndex + 1}`

  const out = [cap(clean(words[verbAt]) || words[verbAt])]
  // Its object: up to two words after the verb, skipping articles ("the sauce").
  let i = verbAt + 1
  while (i < end && STOP.has(clean(words[i]))) i++
  for (; i < end && out.length < 3; i++) {
    const w = clean(words[i])
    if (!w || STOP.has(w) || TIMED_VERBS.has(w)) break
    out.push(w)
    if (/[,]$/.test(words[i])) break
  }
  if (out.length === 1) return `${out[0]} · ${stepTag}`
  const label = out.join(' ')
  return label.length > 24 ? out.slice(0, 2).join(' ') : label
}

/** How a finished timer is spoken: "Cook, step 2" rather than "Cook · step 2". */
export const spokenLabel = (label: string) => label.replace(' · ', ', ')

function load(key: string): CookTimer[] {
  try {
    const raw = sessionStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) as CookTimer[] : []
    return Array.isArray(parsed) ? parsed.slice(0, MAX_TIMERS) : []
  } catch { return [] }
}

export function useCookTimers(storageKey: string, onDone: (t: CookTimer) => void) {
  const [timers, setTimers] = useState<CookTimer[]>(() => {
    // Anything that finished while we were away comes back as done (silently).
    const now = Date.now()
    return load(storageKey).map(t => (t.endsAt != null && t.endsAt <= now ? { ...t, endsAt: null, done: true } : t))
  })
  const [now, setNow] = useState(() => Date.now())
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const timersRef = useRef(timers)
  timersRef.current = timers

  useEffect(() => {
    try {
      if (timers.length) sessionStorage.setItem(storageKey, JSON.stringify(timers))
      else sessionStorage.removeItem(storageKey)
    } catch { /* storage blocked: timers still work for this visit */ }
  }, [timers, storageKey])

  const anyRunning = timers.some(t => t.endsAt != null && !t.done)

  // One clock for both lanes; also catch up immediately when the tab returns.
  useEffect(() => {
    if (!anyRunning) return
    const tick = () => {
      const t = Date.now()
      setNow(t)
      const finished = timersRef.current.filter(x => !x.done && x.endsAt != null && x.endsAt <= t).map(x => x.id)
      if (!finished.length) return
      const done = timersRef.current.map(x => (finished.includes(x.id) ? { ...x, endsAt: null, pausedLeftMs: null, done: true } : x))
      timersRef.current = done
      setTimers(done)
      done.filter(x => finished.includes(x.id)).forEach(x => onDoneRef.current(x))
    }
    tick()
    const iv = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', tick) }
  }, [anyRunning])

  const make = (o: StartOpts, lane: Lane): CookTimer => {
    const totalMs = Math.max(1000, Math.round(o.minutes * 60_000))
    return {
      id: Math.random().toString(36).slice(2, 10),
      lane,
      label: o.label,
      step: o.step ?? null,
      sourceMins: o.sourceMins ?? null,
      totalMs,
      endsAt: Date.now() + totalMs,
      pausedLeftMs: null,
      done: false,
    }
  }

  const sortLanes = (list: CookTimer[]) => [...list].sort((x, y) => (x.lane < y.lane ? -1 : 1))

  /** Starts a timer in a free lane. Returns false when both lanes are busy. */
  const start = useCallback((o: StartOpts): boolean => {
    const prev = timersRef.current
    if (prev.length >= MAX_TIMERS) return false
    const lane: Lane = prev.some(t => t.lane === 'a') ? 'b' : 'a'
    const next = sortLanes([...prev, make(o, lane)])
    timersRef.current = next
    setNow(Date.now())
    setTimers(next)
    return true
  }, [])

  const replace = useCallback((id: string, o: StartOpts) => {
    const prev = timersRef.current
    const old = prev.find(t => t.id === id)
    if (!old) return
    const next = sortLanes([...prev.filter(t => t.id !== id), make(o, old.lane)])
    timersRef.current = next
    setNow(Date.now())
    setTimers(next)
  }, [])

  const toggle = useCallback((id: string) => {
    const n = Date.now()
    setNow(n)
    setTimers(prev => prev.map(t => {
      if (t.id !== id || t.done) return t
      return t.endsAt != null
        ? { ...t, endsAt: null, pausedLeftMs: Math.max(0, t.endsAt - n) }
        : { ...t, endsAt: n + (t.pausedLeftMs ?? 0), pausedLeftMs: null }
    }))
  }, [])

  /** Adds time; on a finished timer it starts it again for that long. */
  const addTime = useCallback((id: string, minutes: number) => {
    const extra = minutes * 60_000
    const n = Date.now()
    setNow(n)
    setTimers(prev => prev.map(t => {
      if (t.id !== id) return t
      if (t.done) return { ...t, done: false, totalMs: extra, endsAt: n + extra, pausedLeftMs: null }
      return t.endsAt != null
        ? { ...t, endsAt: t.endsAt + extra, totalMs: t.totalMs + extra }
        : { ...t, pausedLeftMs: (t.pausedLeftMs ?? 0) + extra, totalMs: t.totalMs + extra }
    }))
  }, [])

  const clear = useCallback((id: string) => setTimers(prev => prev.filter(t => t.id !== id)), [])

  return { timers, now, start, replace, toggle, addTime, clear }
}
