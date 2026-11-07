import type { Env } from '../../env'

// Catch-all route: handles keys with slashes like screenshot/recipeId/rand.jpg
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const keyParts = ctx.params['key'] as string | string[]
  const key = Array.isArray(keyParts) ? keyParts.join('/') : keyParts

  if (!ctx.env.R2) {
    return new Response('Image storage not configured', { status: 503 })
  }

  const decoded = decodeURIComponent(key)
  const object = await ctx.env.R2.get(decoded)
  if (!object) {
    // Demo photos ship as static assets too, so the public demo has images
    // even before the demo account has been (re)seeded into R2.
    if (/^demo\/[a-z0-9-]+\.jpg$/.test(decoded) && ctx.env.ASSETS) {
      const res = await ctx.env.ASSETS.fetch(new URL('/' + decoded, ctx.request.url))
      if (res.ok) return new Response(res.body, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } })
    }
    return new Response('Not found', { status: 404 })
  }

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType ?? 'image/jpeg')
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('ETag', object.etag)

  return new Response(object.body, { headers })
}
