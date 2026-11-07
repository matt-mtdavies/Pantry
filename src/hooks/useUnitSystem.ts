import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import type { UnitSystem } from '../lib/units'

// Which units to show recipes in.
//   1. A choice made with <UnitToggle> on this device (localStorage), else
//   2. the signed-in user's Profile → Unit system, else
//   3. a guess from the browser region (US/LR/MM → imperial).
// Saving the Profile setting clears the device choice (clearUnitOverride),
// so the profile stays the source of truth for the default.

const KEY = 'pantry-units'
const EVENT = 'pantry-units-change'

function readOverride(): UnitSystem | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'metric' || v === 'imperial' ? v : null
  } catch { return null }
}

function regionDefault(): UnitSystem {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region
    return region && ['US', 'LR', 'MM'].includes(region) ? 'imperial' : 'metric'
  } catch { return 'metric' }
}

export function clearUnitOverride() {
  try { localStorage.removeItem(KEY) } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVENT))
}

export function useUnitSystem(): [UnitSystem, (u: UnitSystem) => void] {
  const { user } = useAuth()
  const [override, setOverride] = useState<UnitSystem | null>(readOverride)

  useEffect(() => {
    const sync = () => setOverride(readOverride())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync) }
  }, [])

  const set = useCallback((u: UnitSystem) => {
    try { localStorage.setItem(KEY, u) } catch { /* storage unavailable: still applies this session */ }
    setOverride(u)
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return [override ?? user?.unit_system ?? regionDefault(), set]
}
