import type { Env } from '../env'
import { getRates } from '../lib/fx'
import { CURRENCY_SYMBOL } from '../lib/currency'

// GET /api/fx — USD-based rates for the currencies Pantry supports.
export const onRequestGet: PagesFunction<Env> = async () => {
  const { rates, source } = await getRates()
  const supported: Record<string, number> = {}
  for (const code of Object.keys(CURRENCY_SYMBOL)) {
    if (rates[code]) supported[code] = rates[code]
  }
  return new Response(JSON.stringify({ base: 'USD', rates: supported, source }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': source === 'live' ? 'public, max-age=3600' : 'no-store',
    },
  })
}
