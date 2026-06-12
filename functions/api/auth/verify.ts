import type { Env } from '../../env'

function generateId(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url)
  const token = url.searchParams.get('token')

  if (!token) return json({ error: 'Token required' }, 400)

  const now = Math.floor(Date.now() / 1000)

  const magicToken = await ctx.env.DB.prepare(
    'SELECT * FROM magic_tokens WHERE token = ? AND expires_at > ? AND used = 0'
  ).bind(token, now).first<{ token: string; email: string }>()

  if (!magicToken) return json({ error: 'Invalid or expired link' }, 400)

  // Mark token as used
  await ctx.env.DB.prepare('UPDATE magic_tokens SET used = 1 WHERE token = ?').bind(token).run()

  // Find or create user
  let user = await ctx.env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(magicToken.email).first<{ id: string }>()

  if (!user) {
    const userId = generateId()
    await ctx.env.DB.prepare(
      'INSERT INTO users (id, email, avatar_id, default_servings) VALUES (?, ?, ?, ?)'
    ).bind(userId, magicToken.email, 'herb', 2).run()
    user = { id: userId }
  }

  // Create session (30 days)
  const sessionId = generateId()
  const sessionExpiry = now + 60 * 60 * 24 * 30

  await ctx.env.DB.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(sessionId, user.id, sessionExpiry).run()

  const isSecure = url.protocol === 'https:'
  const cookieFlags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${isSecure ? '; Secure' : ''}`

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `pantry_session=${sessionId}; ${cookieFlags}`,
    },
  })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
