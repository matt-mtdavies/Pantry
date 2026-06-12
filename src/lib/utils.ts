import type { Ingredient } from '../types'

export function formatTime(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function scaleAmount(amount: string, from: number, to: number): string {
  if (from === to) return amount
  const num = parseFloat(amount.replace(',', '.'))
  if (isNaN(num)) return amount
  const scaled = (num * to) / from
  if (scaled === Math.floor(scaled)) return String(Math.floor(scaled))
  const frac = toNiceFraction(scaled)
  return frac ?? scaled.toFixed(1).replace(/\.0$/, '')
}

function toNiceFraction(n: number): string | null {
  const FRACTIONS: [number, string][] = [
    [0.25, '¼'], [0.5, '½'], [0.75, '¾'],
    [0.333, '⅓'], [0.667, '⅔'],
    [0.125, '⅛'], [0.375, '⅜'], [0.625, '⅝'], [0.875, '⅞'],
  ]
  const whole = Math.floor(n)
  const dec = n - whole
  const match = FRACTIONS.find(([v]) => Math.abs(v - dec) < 0.04)
  if (!match) return null
  return whole === 0 ? match[1] : `${whole} ${match[1]}`
}

export function scaleIngredient(ing: Ingredient, from: number, to: number): Ingredient {
  return { ...ing, amount: scaleAmount(ing.amount, from, to) }
}

export function detectTimerMinutes(text: string): number[] {
  const results: number[] = []
  const re = /(\d+(?:\.\d+)?)\s*(?:to\s*\d+\s*)?(?:–\s*\d+\s*)?(minute|min|minutes|mins|hour|hours|hr|hrs|second|seconds|sec|secs)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const val = parseFloat(m[1])
    const unit = m[2].toLowerCase()
    if (unit.startsWith('hour') || unit.startsWith('hr')) results.push(Math.round(val * 60))
    else if (unit.startsWith('sec')) results.push(Math.round(val / 60))
    else results.push(Math.round(val))
  }
  return [...new Set(results)].filter(v => v > 0)
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function pluralise(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export function classNames(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(timestamp * 1000))
}

export function imageUrl(key: string | null): string | null {
  if (!key) return null
  return `/api/images/${encodeURIComponent(key)}`
}
