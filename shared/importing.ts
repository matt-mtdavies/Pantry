// Helpers shared by the app and the API for URL imports.

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|mc_|igshid$|si$|ref$|ref_src$)/i

/**
 * Canonical form of a recipe URL for duplicate detection: lower-case host
 * without "www.", no protocol, hash, tracking params or trailing slash.
 * Returns null for anything that isn't an http(s) URL.
 */
export function normalizeSourceUrl(raw: string): string | null {
  let u: URL
  try { u = new URL(raw.trim()) } catch { return null }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  const host = u.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '')
  const params: [string, string][] = []
  u.searchParams.forEach((v, k) => { params.push([k, v]) })
  const kept = params.filter(([k]) => !TRACKING_PARAMS.test(k)).sort(([a], [b]) => a.localeCompare(b))
  const query = kept.length ? '?' + kept.map(([k, v]) => `${k}=${v}`).join('&') : ''
  const path = u.pathname.replace(/\/+$/, '')
  return `${host}${path}${query}`
}

/**
 * Remove site and "recipe" suffixes that recipe pages put in their titles:
 *   "Chilli con carne recipe"              → "Chilli con carne"
 *   "Best banana bread | BBC Good Food"    → "Best banana bread"
 *   "Recipe: Lemon tart"                   → "Lemon tart"
 * A separator suffix is only removed when it names the source site, so
 * titles like "Fish – the easy way" are left alone.
 */
export function cleanImportedTitle(title: string, sourceUrl?: string | null, sourceName?: string | null): string {
  let t = title.trim()
  const siteWords: string[] = []
  if (sourceName) siteWords.push(sourceName.toLowerCase())
  if (sourceUrl) {
    try {
      const host = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, '')
      siteWords.push(host, host.split('.')[0])
    } catch { /* ignore */ }
  }
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const sites = siteWords.map(squash).filter(s => s.length >= 3)

  const sep = t.match(/^(.*\S)\s+[|–—·-]\s+(.+)$/)
  if (sep) {
    const suffix = squash(sep[2])
    if (sites.some(s => suffix.includes(s) || s.includes(suffix))) t = sep[1].trim()
  }
  t = t.replace(/^recipe:\s*/i, '')
  const stripped = t.replace(/\s+recipe$/i, '')
  if (stripped.length >= 3) t = stripped
  return t || title.trim()
}
