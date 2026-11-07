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

/** Cache key for GET /api/demo/photos; cleared when an admin saves picks. */
export const DEMO_PHOTOS_CACHE_KEY = 'https://cache.internal/demo-photos'

// ── Default picks ────────────────────────────────────────────────────────────
// Hand-vetted Unsplash photos (free Unsplash License), applied automatically
// the first time the demo photos are read on a deployment with
// UNSPLASH_ACCESS_KEY set: each is resolved through the official API
// (GET /photos/:id), its download endpoint is pinged, and it's saved as a
// pick. Runs once ever (demo_photos_meta), so an admin's later changes in
// the picker — including "use the bundled photo" — are never overwritten.
export const DEFAULT_DEMO_PHOTOS: Record<string, string> = {
  de300000000000000000000000000001: 'gWkvURhoMlA', // Shakshuka — Toa Heftiba
  de300000000000000000000000000002: 'VvK110DOOac', // Chilli con carne — American Heritage Chocolate
  de300000000000000000000000000003: 'wDtErSkmevs', // Chicken traybake — Tadahiro Higuchi
  de300000000000000000000000000004: 'jL3X9oeQ3Ps', // Spaghetti aglio e olio — Youjeen Cho
  de300000000000000000000000000005: '7m0b7YwvnvI', // Chickpea curry — Green And Great
  de300000000000000000000000000006: 'UBvMCte4IIo', // Pancakes — Stavros Papadimitriou
  de300000000000000000000000000007: 'mmnKI8kMxpc', // Salmon — Ella Olsson
  de300000000000000000000000000008: 'D9fAmtjC284', // Mushroom risotto — Max Griss
  de300000000000000000000000000009: 'N0u8bLrB_-g', // Spinach omelette — Igor Miske
  de30000000000000000000000000000a: 'vaNnGDFyOz8', // Banana muffins — Donjah Haberman
}

const CREATE_DEMO_PHOTOS_META = `CREATE TABLE IF NOT EXISTS demo_photos_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`

/**
 * Apply DEFAULT_DEMO_PHOTOS once. Cheap no-op after the first success
 * (one indexed read). Never throws: on any failure the bundled photos stay.
 */
export async function ensureDefaultDemoPhotos(env: Env, demoUserId: string): Promise<void> {
  if (!env.UNSPLASH_ACCESS_KEY) return
  const db = env.DB
  try {
    await db.prepare(CREATE_DEMO_PHOTOS_META).run()
    const done = await db.prepare("SELECT value FROM demo_photos_meta WHERE key = 'defaults'").first<{ value: string }>()
    if (done?.value === 'applied') { await syncDemoAccountOnce(env, demoUserId); return }
    // Claim the job so concurrent requests don't all call Unsplash (stale claims expire after 2 min).
    const now = Math.floor(Date.now() / 1000)
    if (done && Number(done.value.split(':')[1]) > now - 120) return
    await db.prepare("INSERT OR REPLACE INTO demo_photos_meta (key, value) VALUES ('defaults', ?)").bind(`pending:${now}`).run()

    await db.prepare(CREATE_DEMO_PHOTOS).run()
    const existing = await getDemoPhotoPicks(env)
    const stmts: D1PreparedStatement[] = []
    for (const [recipeId, photoId] of Object.entries(DEFAULT_DEMO_PHOTOS)) {
      if (existing[recipeId]) continue // an admin already chose
      const res = await fetch(`https://api.unsplash.com/photos/${encodeURIComponent(photoId)}`, {
        headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}`, 'Accept-Version': 'v1' },
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) throw new Error(`Unsplash /photos/${photoId}: ${res.status}`)
      const p = await res.json() as UnsplashResult
      await trackUnsplashDownload(env, p.links.download_location)
      const url = displayUrl(p.urls.raw)
      stmts.push(db.prepare(`INSERT OR IGNORE INTO demo_photos
          (recipe_id, unsplash_id, url, thumb, alt, photographer, photographer_url, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(recipeId, p.id, url, p.urls.small, p.alt_description, p.user.name, `${p.user.links.html}?${UNSPLASH_UTM}`, `${p.links.html}?${UNSPLASH_UTM}`))
      // Point the demo account's copy at it (only rows still on the bundled photo).
      stmts.push(db.prepare("UPDATE recipes SET hero_image_key = ? WHERE id = ? AND user_id = ? AND (hero_image_key IS NULL OR hero_image_key LIKE 'demo/%')")
        .bind(url, recipeId, demoUserId))
    }
    stmts.push(db.prepare("INSERT OR REPLACE INTO demo_photos_meta (key, value) VALUES ('defaults', 'applied')"))
    await db.batch(stmts)
    await syncDemoAccountOnce(env, demoUserId)
  } catch (e) {
    console.error('[demo photos] defaults not applied:', e instanceof Error ? e.message : e)
    try { await db.prepare("DELETE FROM demo_photos_meta WHERE key = 'defaults' AND value LIKE 'pending:%'").run() } catch { /* ignore */ }
  }
}

/**
 * One-off: point the demo account's recipes at the current picks, replacing
 * any photo that isn't already a hotlinked pick (e.g. stale copies made by
 * "Add missing photos" during reviews). Same effect as an admin reseed, for
 * photos only. Runs once (demo_photos_meta 'account-sync-1'), so a reviewer's
 * later photo changes are left alone.
 */
async function syncDemoAccountOnce(env: Env, demoUserId: string): Promise<void> {
  const db = env.DB
  const done = await db.prepare("SELECT 1 AS x FROM demo_photos_meta WHERE key = 'account-sync-1'").first()
  if (done) return
  const picks = await getDemoPhotoPicks(env)
  const stmts: D1PreparedStatement[] = Object.values(picks).map(p =>
    db.prepare("UPDATE recipes SET hero_image_key = ? WHERE id = ? AND user_id = ? AND (hero_image_key IS NULL OR hero_image_key NOT LIKE 'https://images.unsplash.com/%')")
      .bind(p.url, p.recipe_id, demoUserId))
  stmts.push(db.prepare("INSERT OR REPLACE INTO demo_photos_meta (key, value) VALUES ('account-sync-1', 'done')"))
  await db.batch(stmts)
}
