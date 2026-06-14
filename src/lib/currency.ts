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
