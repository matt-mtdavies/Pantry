import { FALLBACK_USD_RATES } from '../../shared/currency'

// Free, keyless daily rates. Cached at the edge so we hit it at most ~twice a day per colo.
const RATES_URL = 'https://open.er-api.com/v6/latest/USD'
const CACHE_KEY = 'https://pantry.internal/fx/usd'
const CACHE_SECONDS = 12 * 60 * 60

export interface FxRates {
  rates: Record<string, number>
  source: 'live' | 'fallback'
}

/** USD-based exchange rates. Never throws — falls back to the static table. */
export async function getRates(): Promise<FxRates> {
  const cache = (caches as unknown as { default: Cache }).default
  try {
    const hit = await cache.match(CACHE_KEY)
    if (hit) return { rates: { ...FALLBACK_USD_RATES, ...(await hit.json() as Record<string, number>) }, source: 'live' }
  } catch { /* cache unavailable (e.g. local dev) */ }

  try {
    const res = await fetch(RATES_URL, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) throw new Error(`fx ${res.status}`)
    const data = await res.json() as { result?: string; rates?: Record<string, number> }
    if (data.result !== 'success' || !data.rates?.USD) throw new Error('fx bad payload')
    try {
      await cache.put(CACHE_KEY, new Response(JSON.stringify(data.rates), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${CACHE_SECONDS}` },
      }))
    } catch { /* ignore */ }
    return { rates: { ...FALLBACK_USD_RATES, ...data.rates }, source: 'live' }
  } catch {
    return { rates: FALLBACK_USD_RATES, source: 'fallback' }
  }
}
