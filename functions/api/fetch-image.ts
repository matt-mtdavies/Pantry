import type { Env } from '../env'

const MAX_BYTES = 10 * 1024 * 1024

function heroKey(recipeId: string, ext: string): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `hero/${recipeId}/${rand}.${ext}`
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string

  let url: string, recipeId: string
  try {
    const body = await ctx.request.json() as { url?: string; recipeId?: string }
    url = (body.url ?? '').trim()
    recipeId = (body.recipeId ?? '').trim()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!url || !recipeId) return json({ error: 'url and recipeId are required' }, 400)

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') throw new Error()
  } catch {
    return json({ error: 'Invalid URL' }, 400)
  }

  const recipe = await ctx.env.DB.prepare(
    'SELECT id FROM recipes WHERE id = ? AND user_id = ?'
  ).bind(recipeId, userId).first<{ id: string }>()
  if (!recipe) return json({ error: 'Recipe not found' }, 404)

  if (!ctx.env.R2) return json({ error: 'Image storage not configured' }, 503)

  let buffer: ArrayBuffer
  let contentType: string
  try {
    const imgRes = await fetch(parsedUrl.toString(), {
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Pantry/1.0)' },
    })
    if (!imgRes.ok) return json({ error: `Image fetch failed (${imgRes.status})` }, 422)
    contentType = imgRes.headers.get('Content-Type') ?? 'image/jpeg'
    if (!contentType.startsWith('image/')) return json({ error: 'URL is not an image' }, 422)
    buffer = await imgRes.arrayBuffer()
    if (buffer.byteLength > MAX_BYTES) return json({ error: 'Image too large (max 10 MB)' }, 422)
  } catch (err) {
    console.error('[fetch-image]', err instanceof Error ? err.message : String(err))
    return json({ error: "Couldn't fetch the image" }, 422)
  }

  const ext = contentType.split('/')[1]?.split(';')[0]?.replace('jpeg', 'jpg') ?? 'jpg'
  const key = heroKey(recipeId, ext)

  await ctx.env.R2.put(key, buffer, {
    httpMetadata: { contentType },
    customMetadata: { recipeId, userId, role: 'hero' },
  })

  await ctx.env.DB.prepare(
    'UPDATE recipes SET hero_image_key = ? WHERE id = ?'
  ).bind(key, recipeId).run()

  return json({ key })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
