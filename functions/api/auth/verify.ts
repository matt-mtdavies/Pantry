import type { Env } from '../../env'

function generateId(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Server-side verification: processes the token on the edge, sets the session
// cookie in the 302 response, then redirects to /. This means auth is complete
// before any client JS runs — no blank-page race condition.
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url = new URL(ctx.request.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return redirect('/auth?error=missing_token')
    }

    const now = Math.floor(Date.now() / 1000)

    const magicToken = await ctx.env.DB.prepare(
      'SELECT token, email, expires_at, used FROM magic_tokens WHERE token = ?'
    ).bind(token).first<{ token: string; email: string; expires_at: number; used: number }>()

    if (!magicToken || magicToken.used || magicToken.expires_at <= now) {
      return redirect('/auth?error=expired')
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

    // Return an HTML page rather than a bare 302 redirect so that WebKit/ITP
    // processes the Set-Cookie on a 200 response (not a redirect response).
    // Safari may discard Set-Cookie on 3xx redirects that arrive via cross-app
    // link clicks (treating the token query param as "link decoration").
    return new Response(
      `<!DOCTYPE html><html><head><meta charset="UTF-8">
<script>window.location.replace('/');</script>
</head><body></body></html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Set-Cookie': cookie,
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[verify] error:', message)
    return redirect('/auth?error=server_error')
  }
}

function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { 'Location': location, 'Cache-Control': 'no-store' },
  })
}
