import type { Env } from './env'

const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/share/',
  '/api/images/',
]

function getCookie(header: string, name: string): string | null {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? match[1] : null
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url)

  // Allow public routes through
  if (PUBLIC_PREFIXES.some(p => url.pathname.startsWith(p))) {
    return ctx.next()
  }

  // Only protect /api/* routes — let the SPA handle everything else
  if (!url.pathname.startsWith('/api/')) {
    return ctx.next()
  }

  const cookieHeader = ctx.request.headers.get('Cookie') ?? ''
  let sessionId = getCookie(cookieHeader, 'pantry_session')

  // Fallback: accept session via Authorization header (used when Safari ITP
  // quarantines cookies set during cross-app link navigation).
  if (!sessionId) {
    const auth = ctx.request.headers.get('Authorization') ?? ''
    if (auth.startsWith('Bearer ')) sessionId = auth.slice(7).trim()
  }

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const now = Math.floor(Date.now() / 1000)
  const row = await ctx.env.DB.prepare(
    'SELECT s.id, s.user_id, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > ?'
  ).bind(sessionId, now).first<{ id: string; user_id: string; email: string }>()

  if (!row) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  ctx.data.userId = row.user_id
  ctx.data.email = row.email
  ctx.data.sessionId = row.id

  return ctx.next()
}
