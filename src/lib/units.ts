export type UnitSystem = 'metric' | 'imperial'

interface Conversion {
  from: UnitSystem
  to: string
  factor: number
  special?: 'temp'
}

const CONVERSIONS: Record<string, Conversion> = {
  // Weight: metric → imperial
  g:           { from: 'metric',   to: 'oz',    factor: 0.035274 },
  gram:        { from: 'metric',   to: 'oz',    factor: 0.035274 },
  grams:       { from: 'metric',   to: 'oz',    factor: 0.035274 },
  kg:          { from: 'metric',   to: 'lb',    factor: 2.20462  },
  kilogram:    { from: 'metric',   to: 'lb',    factor: 2.20462  },
  kilograms:   { from: 'metric',   to: 'lb',    factor: 2.20462  },
  // Weight: imperial → metric
  oz:          { from: 'imperial', to: 'g',     factor: 28.3495  },
  ounce:       { from: 'imperial', to: 'g',     factor: 28.3495  },
  ounces:      { from: 'imperial', to: 'g',     factor: 28.3495  },
  lb:          { from: 'imperial', to: 'kg',    factor: 0.453592 },
  lbs:         { from: 'imperial', to: 'kg',    factor: 0.453592 },
  pound:       { from: 'imperial', to: 'kg',    factor: 0.453592 },
  pounds:      { from: 'imperial', to: 'kg',    factor: 0.453592 },
  // Volume: metric → imperial (ml→fl oz, l→cups)
  ml:          { from: 'metric',   to: 'fl oz', factor: 0.033814 },
  milliliter:  { from: 'metric',   to: 'fl oz', factor: 0.033814 },
  milliliters: { from: 'metric',   to: 'fl oz', factor: 0.033814 },
  millilitre:  { from: 'metric',   to: 'fl oz', factor: 0.033814 },
  millilitres: { from: 'metric',   to: 'fl oz', factor: 0.033814 },
  l:           { from: 'metric',   to: 'cups',  factor: 4.22675  },
  liter:       { from: 'metric',   to: 'cups',  factor: 4.22675  },
  liters:      { from: 'metric',   to: 'cups',  factor: 4.22675  },
  litre:       { from: 'metric',   to: 'cups',  factor: 4.22675  },
  litres:      { from: 'metric',   to: 'cups',  factor: 4.22675  },
  // Volume: imperial → metric
  'fl oz':        { from: 'imperial', to: 'ml', factor: 29.5735 },
  'fluid oz':     { from: 'imperial', to: 'ml', factor: 29.5735 },
  'fluid ounce':  { from: 'imperial', to: 'ml', factor: 29.5735 },
  'fluid ounces': { from: 'imperial', to: 'ml', factor: 29.5735 },
  // Temperature
  '°c': { from: 'metric',   to: '°F', factor: 0, special: 'temp' },
  '°f': { from: 'imperial', to: '°C', factor: 0, special: 'temp' },
}

function parseAmount(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const frac = t.match(/^(\d+)\/(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  const n = Number(t)
  return isNaN(n) ? null : n
}

function formatAmount(n: number): string {
  if (n === 0) return '0'
  if (n >= 100) return String(Math.round(n))
  if (n >= 10) return String(Math.round(n * 2) / 2)
  if (n >= 1) {
    // try to express as a nice mixed number or fraction
    const whole = Math.floor(n)
    const frac = n - whole
    const niceFrac = toNiceFraction(frac)
    if (niceFrac && whole > 0) return `${whole} ${niceFrac}`
    if (niceFrac && whole === 0) return niceFrac
    return String(Number(n.toFixed(1)))
  }
  return toNiceFraction(n) ?? String(Number(n.toFixed(2)))
}

function toNiceFraction(n: number): string | null {
  const nice: [number, string][] = [
    [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'],
    [0.5, '½'],   [0.667, '⅔'], [0.75, '¾'],
  ]
  for (const [val, str] of nice) {
    if (Math.abs(n - val) < 0.04) return str
  }
  return null
}

export function convertIngredient(
  amount: string,
  unit: string,
  targetSystem: UnitSystem,
): { amount: string; unit: string } {
  const key = unit.trim().toLowerCase()
  const entry = CONVERSIONS[key]
  if (!entry || entry.from === targetSystem) return { amount, unit }

  const n = parseAmount(amount)
  if (n === null || n === 0) return { amount, unit }

  if (entry.special === 'temp') {
    const converted = entry.from === 'metric'
      ? Math.round(n * 9 / 5 + 32)
      : Math.round((n - 32) * 5 / 9)
    return { amount: String(converted), unit: entry.to }
  }

  return { amount: formatAmount(n * entry.factor), unit: entry.to }
}

// Convert temperature mentions embedded in step text (e.g. "preheat to 180°C")
export function convertStepText(text: string, targetSystem: UnitSystem): string {
  if (targetSystem === 'imperial') {
    return text.replace(/(\d+)\s*°C\b/g, (_, c) => `${Math.round(Number(c) * 9 / 5 + 32)}°F`)
  }
  return text.replace(/(\d+)\s*°F\b/g, (_, f) => `${Math.round((Number(f) - 32) * 5 / 9)}°C`)
}
