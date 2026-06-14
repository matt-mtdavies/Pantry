import type { Env } from '../../env'

interface UnsplashPhoto {
  urls: { regular: string }
}

interface RecipeRow {
  id: string
  title: string
}

function heroKey(recipeId: string, ext: string): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `hero/${recipeId}/${rand}.${ext}`
}

async function fetchAndStoreImage(
  r2: R2Bucket,
  imageUrl: string,
  recipeId: string,
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Pantry/1.0)' },
    })
    if (!res.ok) return null
    const contentType = res.headers.get('Content-Type') ?? 'image/jpeg'
    if (!contentType.startsWith('image/')) return null
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength > 10 * 1024 * 1024) return null
    const ext = contentType.split('/')[1]?.split(';')[0]?.replace('jpeg', 'jpg') ?? 'jpg'
    const key = heroKey(recipeId, ext)
    await r2.put(key, buffer, { httpMetadata: { contentType }, customMetadata: { recipeId, role: 'hero' } })
    return key
  } catch {
    return null
  }
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string

  if (!ctx.env.UNSPLASH_ACCESS_KEY) {
    return json({ error: 'Image search not configured (UNSPLASH_ACCESS_KEY missing)' }, 503)
  }
  if (!ctx.env.R2) {
    return json({ error: 'Image storage not configured' }, 503)
  }

  // Find up to 10 of this user's recipes without a hero image
  const { results } = await ctx.env.DB.prepare(`
    SELECT id, title FROM recipes
    WHERE user_id = ? AND is_deleted = 0 AND hero_image_key IS NULL
    ORDER BY updated_at DESC
    LIMIT 10
  `).bind(userId).all<RecipeRow>()

  if (!results.length) {
    return json({ updated: 0, message: 'All recipes already have photos' })
  }

  let updated = 0
  for (const recipe of results) {
    // Search Unsplash
    let imageUrl: string | null = null
    try {
      const searchRes = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(recipe.title)}&per_page=1&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${ctx.env.UNSPLASH_ACCESS_KEY}` } }
      )
      if (searchRes.ok) {
        const data = await searchRes.json() as { results: UnsplashPhoto[] }
        imageUrl = data.results?.[0]?.urls?.regular ?? null
      }
    } catch { /* skip */ }

    if (!imageUrl) continue

    const key = await fetchAndStoreImage(ctx.env.R2, imageUrl, recipe.id)
    if (!key) continue

    await ctx.env.DB.prepare(
      'UPDATE recipes SET hero_image_key = ? WHERE id = ? AND user_id = ?'
    ).bind(key, recipe.id, userId).run()
    updated++
  }

  return json({
    updated,
    has_more: results.length === 10,
    message: updated === 0
      ? 'Could not find photos for these recipes'
      : `Added photos to ${updated} recipe${updated !== 1 ? 's' : ''}`,
  })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
