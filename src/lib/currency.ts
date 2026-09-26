const CURRENCY_SYMBOL: Record<string, string> = {
  AED: 'AED', ARS: '$', AUD: 'A$', BRL: 'R$', CAD: 'C$',
  CHF: 'Fr', CLP: '$', CNY: '¥', COP: '$', CZK: 'Kč',
  DKK: 'kr', EGP: 'E£', EUR: '€', GBP: '£', HKD: 'HK$',
  HUF: 'Ft', IDR: 'Rp', ILS: '₪', INR: '₹', JPY: '¥',
  KES: 'KSh', KRW: '₩', LKR: 'Rs', MXN: '$', MYR: 'RM',
  NGN: '₦', NOK: 'kr', NZD: 'NZ$', PEN: 'S/', PHP: '₱',
  PKR: 'Rs', PLN: 'zł', RON: 'lei', RUB: '₽', SEK: 'kr',
  SGD: 'S$', THB: '฿', TRY: '₺', TWD: 'NT$', UAH: '₴',
  USD: '$', VND: '₫', ZAR: 'R',
}

export function getCurrencySymbol(currency: string | null | undefined): string {
  return CURRENCY_SYMBOL[currency ?? 'USD'] ?? (currency ?? '$')
}

/** Locale-aware cost, e.g. "$4.50", "¥250", "₩3,200". Zero-decimal currencies
 *  (JPY, KRW, VND…) get no decimals; unknown codes fall back to symbol + toFixed. */
export function formatCost(amount: number, currency: string | null | undefined): string {
  const code = currency || 'USD'
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
    }).format(amount)
  } catch {
    return `${getCurrencySymbol(code)}${amount.toFixed(2)}`
  }
}
