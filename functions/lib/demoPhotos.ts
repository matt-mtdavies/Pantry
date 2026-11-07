import type { Env } from '../env'

// Hand-picked Unsplash photos for the demo recipes. Chosen once by an admin
// at /api/admin/demo-photos and kept here, so reseeding and the public demo
// always use the same photo. Images are hotlinked from images.unsplash.com and
// credited, per the Unsplash API guidelines.

export const UNSPLASH_UTM = 'utm_source=pantry&utm_medium=referral'

export const CREATE_DEMO_PHOTOS = `
  CREATE TABLE IF NOT EXISTS demo_photos (
    recipe_id TEXT PRIMARY KEY,
    unsplash_id TEXT NOT NULL,
    url TEXT NOT NULL,
    thumb TEXT NOT NULL,
    alt TEXT,
    photographer TEXT NOT NULL,
    photographer_url TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    chosen_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`

export interface DemoPhotoPick {
  recipe_id: string
  unsplash_id: string
  url: string
  thumb: string
  alt: string | null
  photographer: string
  photographer_url: string
  photo_url: string
}

export async function getDemoPhotoPicks(env: Env): Promise<Record<string, DemoPhotoPick>> {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM demo_photos').all<DemoPhotoPick>()
    return Object.fromEntries((results ?? []).map(r => [r.recipe_id, r]))
  } catch {
    return {} // table not created yet
  }
}

/** Search terms per demo recipe, tuned for food photography. */
export const DEMO_PHOTO_QUERIES: Record<string, string> = {
  de300000000000000000000000000001: 'shakshuka',
  de300000000000000000000000000002: 'chili con carne',
  de300000000000000000000000000003: 'roast chicken thighs potatoes',
  de300000000000000000000000000004: 'spaghetti aglio olio',
  de300000000000000000000000000005: 'chickpea curry',
  de300000000000000000000000000006: 'pancakes stack',
  de300000000000000000000000000007: 'salmon fillet greens',
  de300000000000000000000000000008: 'mushroom risotto',
  de300000000000000000000000000009: 'spinach omelette',
  de30000000000000000000000000000a: 'banana muffins',
}

export interface UnsplashResult {
  id: string
  alt_description: string | null
  likes: number
  urls: { raw: string; small: string; regular: string }
  links: { html: string; download_location: string }
  user: { name: string; links: { html: string } }
}

/** Hotlinkable display URL (Unsplash supports imgix params on `raw`). */
export const displayUrl = (raw: string) => `${raw}${raw.includes('?') ? '&' : '?'}w=1400&q=80&auto=format&fit=crop`

export async function searchUnsplash(env: Env, query: string, perPage = 9): Promise<UnsplashResult[]> {
  if (!env.UNSPLASH_ACCESS_KEY) return []
  const u = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&content_filter=high`
  const res = await fetch(u, { signal: AbortSignal.timeout(10_000), headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}`, 'Accept-Version': 'v1' } })
  if (!res.ok) throw new Error(`Unsplash search failed (${res.status})`)
  const data = await res.json() as { results?: UnsplashResult[] }
  return data.results ?? []
}

/** Required by the Unsplash API guidelines whenever a photo is chosen for use. */
export async function trackUnsplashDownload(env: Env, downloadLocation: string): Promise<void> {
  if (!env.UNSPLASH_ACCESS_KEY || !downloadLocation.startsWith('https://api.unsplash.com/')) return
  await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` }, signal: AbortSignal.timeout(10_000) }).catch(() => {})
}
