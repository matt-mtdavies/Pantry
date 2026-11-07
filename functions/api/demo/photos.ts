import type { Env } from '../../env'
import { getDemoPhotoPicks, DEMO_PHOTOS_CACHE_KEY } from '../../lib/demoPhotos'

// GET /api/demo/photos — public, read-only: the hand-picked Unsplash photo and
// credit for each demo recipe ({} until an admin picks some). Used by the
// public demo, tour and landing page. Edge-cached.

const CACHE_TTL = 300

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const cacheKey = new Request(DEMO_PHOTOS_CACHE_KEY)
  let cache: Cache | null = null
  try { cache = (caches as unknown as { default: Cache }).default } catch { /* no Cache API (tests) */ }
  try { const hit = await cache?.match(cacheKey); if (hit) return hit } catch { /* no cache locally */ }

  const picks = await getDemoPhotoPicks(ctx.env)
  const body = Object.fromEntries(Object.entries(picks).map(([id, p]) => [id, {
    url: p.url, alt: p.alt, photographer: p.photographer, photographer_url: p.photographer_url, photo_url: p.photo_url,
  }]))
  const res = new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_TTL}` },
  })
  try { if (cache) ctx.waitUntil(cache.put(cacheKey, res.clone())) } catch { /* no cache locally */ }
  return res
}
