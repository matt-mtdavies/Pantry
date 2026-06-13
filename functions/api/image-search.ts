import type { Env } from '../env'

interface UnsplashPhoto {
  urls: { regular: string; small: string }
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const q = new URL(ctx.request.url).searchParams.get('q') ?? ''

  if (!q.trim() || !ctx.env.UNSPLASH_ACCESS_KEY) return json([])

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=4&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${ctx.env.UNSPLASH_ACCESS_KEY}` } }
  )

  if (!res.ok) return json([])

  const data = await res.json() as { results: UnsplashPhoto[] }
  return json(
    (data.results ?? []).slice(0, 4).map(p => ({
      url: p.urls.regular,
      thumb: p.urls.small,
    }))
  )
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
