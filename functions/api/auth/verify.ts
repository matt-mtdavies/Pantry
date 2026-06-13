import type { Env } from '../../env'

function generateId(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Called as a same-origin fetch from AuthPage.tsx.
// Returns JSON + Set-Cookie on success so the client can navigate without
// a server-side redirect (which was being intercepted by the SW / CDN).
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url = new URL(ctx.request.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return json({ error: 'missing_token' }, 400)
    }

    const now = Math.floor(Date.now() / 1000)

    const magicToken = await ctx.env.DB.prepare(
      'SELECT token, email, expires_at, used FROM magic_tokens WHERE token = ?'
    ).bind(token).first<{ token: string; email: string; expires_at: number; used: number }>()

    if (!magicToken || magicToken.used || magicToken.expires_at <= now) {
      return json({ error: 'expired' }, 401)
    }

    await ctx.env.DB.prepare(
      'UPDATE magic_tokens SET used = 1 WHERE token = ?'
    ).bind(token).run()

    let user = await ctx.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(magicToken.email).first<{ id: string }>()

    if (!user) {
      const userId = generateId()
      await ctx.env.DB.prepare(
        'INSERT INTO users (id, email, avatar_id, default_servings) VALUES (?, ?, ?, ?)'
      ).bind(userId, magicToken.email, 'herb', 2).run()
      user = { id: userId }
    }

    const sessionId = generateId()
    const sessionExpiry = now + 60 * 60 * 24 * 30

    await ctx.env.DB.prepare(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(sessionId, user.id, sessionExpiry).run()

    const cookie = `pantry_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${60 * 60 * 24 * 30}`

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[verify] error:', message)
    return json({ error: 'server_error', detail: message }, 500)
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
