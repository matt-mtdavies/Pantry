import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './useAuth'
import { FALLBACK_USD_RATES, convertAmount, currencyForCountry, formatMoney } from '../lib/currency'

interface CurrencyCtx {
  /** The viewer's currency: from their profile country, else their browser region. */
  currency: string
  /** Convert an amount from its stored currency into the viewer's currency. */
  convert: (amount: number, from: string | null | undefined) => number | null
  /** Convert + format, e.g. formatCost(4.25, 'USD') → "A$6.46" for an Australian profile. */
  formatCost: (amount: number, from: string | null | undefined) => string
}

const Ctx = createContext<CurrencyCtx | null>(null)

function localeCurrency(): string | null {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region
    return currencyForCountry(region)
  } catch {
    return null
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_USD_RATES)

  useEffect(() => {
    fetch('/api/fx')
      .then(res => res.ok ? res.json() as Promise<{ rates: Record<string, number> }> : null)
      .then(data => { if (data?.rates) setRates({ ...FALLBACK_USD_RATES, ...data.rates }) })
      .catch(() => { /* keep fallback rates */ })
  }, [])

  const currency = currencyForCountry(user?.country) ?? localeCurrency() ?? 'USD'

  const convert = useCallback(
    (amount: number, from: string | null | undefined) => convertAmount(amount, from, currency, rates),
    [currency, rates],
  )

  const formatCost = useCallback((amount: number, from: string | null | undefined) => {
    const converted = convertAmount(amount, from, currency, rates)
    // Unknown source currency: show it as stored rather than guess.
    return converted == null ? formatMoney(amount, from || 'USD') : formatMoney(converted, currency)
  }, [currency, rates])

  const value = useMemo(() => ({ currency, convert, formatCost }), [currency, convert, formatCost])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCurrency(): CurrencyCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider')
  return ctx
}
