const COUNTRY_CURRENCY: Record<string, string> = {
  // Oceania
  'australia': 'AUD', 'au': 'AUD',
  'new zealand': 'NZD', 'nz': 'NZD',
  // Asia
  'china': 'CNY', 'cn': 'CNY',
  'hong kong': 'HKD', 'hk': 'HKD',
  'india': 'INR', 'in': 'INR',
  'indonesia': 'IDR', 'id': 'IDR',
  'israel': 'ILS', 'il': 'ILS',
  'japan': 'JPY', 'jp': 'JPY',
  'malaysia': 'MYR', 'my': 'MYR',
  'pakistan': 'PKR', 'pk': 'PKR',
  'philippines': 'PHP', 'ph': 'PHP',
  'singapore': 'SGD', 'sg': 'SGD',
  'south korea': 'KRW', 'korea': 'KRW', 'kr': 'KRW',
  'sri lanka': 'LKR',
  'taiwan': 'TWD',
  'thailand': 'THB', 'th': 'THB',
  'vietnam': 'VND', 'vn': 'VND',
  // Europe
  'austria': 'EUR', 'belgium': 'EUR', 'cyprus': 'EUR',
  'estonia': 'EUR', 'finland': 'EUR', 'france': 'EUR',
  'germany': 'EUR', 'greece': 'EUR', 'ireland': 'EUR',
  'italy': 'EUR', 'latvia': 'EUR', 'lithuania': 'EUR',
  'luxembourg': 'EUR', 'malta': 'EUR', 'netherlands': 'EUR',
  'portugal': 'EUR', 'slovakia': 'EUR', 'slovenia': 'EUR',
  'spain': 'EUR',
  'denmark': 'DKK', 'dk': 'DKK',
  'czech republic': 'CZK', 'czechia': 'CZK',
  'hungary': 'HUF',
  'norway': 'NOK', 'no': 'NOK',
  'poland': 'PLN', 'pl': 'PLN',
  'romania': 'RON',
  'russia': 'RUB', 'ru': 'RUB',
  'sweden': 'SEK', 'se': 'SEK',
  'switzerland': 'CHF', 'ch': 'CHF',
  'turkey': 'TRY', 'türkiye': 'TRY', 'turkiye': 'TRY', 'tr': 'TRY',
  'ukraine': 'UAH',
  'united kingdom': 'GBP', 'uk': 'GBP', 'great britain': 'GBP', 'england': 'GBP', 'scotland': 'GBP', 'wales': 'GBP',
  // Americas
  'argentina': 'ARS',
  'brazil': 'BRL', 'brasil': 'BRL', 'br': 'BRL',
  'canada': 'CAD', 'ca': 'CAD',
  'chile': 'CLP',
  'colombia': 'COP',
  'mexico': 'MXN', 'méxico': 'MXN', 'mx': 'MXN',
  'peru': 'PEN',
  'united states': 'USD', 'usa': 'USD', 'us': 'USD', 'america': 'USD',
  // Africa
  'egypt': 'EGP',
  'kenya': 'KES',
  'nigeria': 'NGN',
  'south africa': 'ZAR',
}

export const CURRENCY_SYMBOL: Record<string, string> = {
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

export function getCurrency(country: string | null | undefined): string {
  if (!country) return 'USD'
  const key = country.toLowerCase().trim()
  return COUNTRY_CURRENCY[key] ?? 'USD'
}

export function getCurrencySymbol(currency: string | null | undefined): string {
  return CURRENCY_SYMBOL[currency ?? 'USD'] ?? (currency ?? '$')
}
