// Shared by the app (src/) and the API (functions/). Pure — no runtime deps.

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
  'sri lanka': 'LKR', 'lk': 'LKR',
  'taiwan': 'TWD', 'tw': 'TWD',
  'united arab emirates': 'AED', 'uae': 'AED', 'ae': 'AED',
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
  'at': 'EUR', 'be': 'EUR', 'cy': 'EUR', 'ee': 'EUR', 'fi': 'EUR', 'fr': 'EUR',
  'de': 'EUR', 'gr': 'EUR', 'ie': 'EUR', 'it': 'EUR', 'lv': 'EUR', 'lt': 'EUR',
  'lu': 'EUR', 'mt': 'EUR', 'nl': 'EUR', 'pt': 'EUR', 'sk': 'EUR', 'si': 'EUR',
  'es': 'EUR', 'croatia': 'EUR', 'hr': 'EUR',
  'cz': 'CZK', 'hu': 'HUF', 'ro': 'RON', 'ua': 'UAH',
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
  'united kingdom': 'GBP', 'uk': 'GBP', 'gb': 'GBP', 'great britain': 'GBP', 'england': 'GBP', 'scotland': 'GBP', 'wales': 'GBP',
  // Americas
  'argentina': 'ARS', 'ar': 'ARS',
  'brazil': 'BRL', 'brasil': 'BRL', 'br': 'BRL',
  'canada': 'CAD', 'ca': 'CAD',
  'chile': 'CLP', 'cl': 'CLP',
  'colombia': 'COP', 'co': 'COP',
  'mexico': 'MXN', 'méxico': 'MXN', 'mx': 'MXN',
  'peru': 'PEN', 'pe': 'PEN',
  'united states': 'USD', 'united states of america': 'USD', 'usa': 'USD', 'us': 'USD', 'america': 'USD',
  // Africa
  'egypt': 'EGP', 'eg': 'EGP',
  'kenya': 'KES', 'ke': 'KES',
  'nigeria': 'NGN', 'ng': 'NGN',
  'south africa': 'ZAR', 'za': 'ZAR',
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

/** Approximate units per 1 USD. Used until live rates load, or if the rate
 *  provider is unreachable. Costs are rough estimates, so this is fine as a
 *  fallback — refresh occasionally. */
export const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1, AED: 3.67, ARS: 1150, AUD: 1.52, BRL: 5.5, CAD: 1.37,
  CHF: 0.8, CLP: 940, CNY: 7.2, COP: 4000, CZK: 21.5, DKK: 6.4,
  EGP: 49, EUR: 0.86, GBP: 0.75, HKD: 7.8, HUF: 345, IDR: 16300,
  ILS: 3.5, INR: 86, JPY: 147, KES: 129, KRW: 1380, LKR: 300,
  MXN: 18.8, MYR: 4.25, NGN: 1530, NOK: 10.1, NZD: 1.67, PEN: 3.55,
  PHP: 57, PKR: 283, PLN: 3.65, RON: 4.35, RUB: 80, SEK: 9.6,
  SGD: 1.28, THB: 32.5, TRY: 40, TWD: 29.5, UAH: 41.5, VND: 26000,
  ZAR: 17.8,
}

/** Currency for a free-text country (name or ISO-2 code), or null if unknown. */
export function currencyForCountry(country: string | null | undefined): string | null {
  if (!country) return null
  return COUNTRY_CURRENCY[country.toLowerCase().trim()] ?? null
}

export function getCurrency(country: string | null | undefined): string {
  return currencyForCountry(country) ?? 'USD'
}

export function getCurrencySymbol(currency: string | null | undefined): string {
  return CURRENCY_SYMBOL[currency ?? 'USD'] ?? (currency ?? '$')
}

/** Convert between currencies using USD-based rates. Returns null when either
 *  rate is unknown (caller should then show the original currency). */
export function convertAmount(
  amount: number,
  from: string | null | undefined,
  to: string,
  rates: Record<string, number>,
): number | null {
  const src = from || 'USD'
  if (src === to) return amount
  const rFrom = rates[src]
  const rTo = rates[to]
  if (!rFrom || !rTo) return null
  return (amount / rFrom) * rTo
}
