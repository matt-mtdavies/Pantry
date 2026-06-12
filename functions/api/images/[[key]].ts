import type { Env } from '../../env'

// Catch-all route: handles keys with slashes like screenshot/recipeId/rand.jpg
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const keyParts = ctx.params['key'] as string | string[]
  const key = Array.isArray(keyParts) ? keyParts.join('/') : keyParts

  if (!ctx.env.R2) {
    return new Response('Image storage not configured', { status: 503 })
  }

  const object = await ctx.env.R2.get(decodeURIComponent(key))
  if (!object) {
    return new Response('Not found', { status: 404 })
  }

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType ?? 'image/jpeg')
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('ETag', object.etag)

  return new Response(object.body, { headers })
}
