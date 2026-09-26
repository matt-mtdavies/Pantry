export * from '../../shared/currency'
import { getCurrencySymbol } from '../../shared/currency'

/** Locale-aware cost in the given currency, e.g. "$4.50", "¥250", "₩3,200". */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
  } catch {
    return `${getCurrencySymbol(currency)}${amount.toFixed(2)}`
  }
}
