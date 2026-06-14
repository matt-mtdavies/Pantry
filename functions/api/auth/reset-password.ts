import type { Env } from '../../env'

const ITERATIONS = 100_000

function toHex(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key, 256
  )
  return `${toHex(salt)}:${toHex(new Uint8Array(bits))}`
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let token: string, password: string
  try {
    const body = await ctx.request.json() as { token?: string; password?: string }
    token = (body.token ?? '').trim()
    password = body.password ?? ''
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!token) return json({ error: 'Reset token is required' }, 400)
  if (!password || password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400)

  const now = Math.floor(Date.now() / 1000)
  const row = await ctx.env.DB.prepare(
    'SELECT token, email FROM magic_tokens WHERE token = ? AND expires_at > ? AND used = 0'
  ).bind(token, now).first<{ token: string; email: string }>()

  if (!row) return json({ error: 'This reset link has expired or already been used' }, 400)

  // Mark token used
  await ctx.env.DB.prepare('UPDATE magic_tokens SET used = 1 WHERE token = ?').bind(token).run()

  const user = await ctx.env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(row.email).first<{ id: string }>()
  if (!user) return json({ error: 'Account not found' }, 404)

  const hash = await hashPassword(password)
  await ctx.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hash, user.id).run()

  // Invalidate all existing sessions for security
  await ctx.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run()

  const sessionId = toHex(crypto.getRandomValues(new Uint8Array(8)))
  const expires = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
  await ctx.env.DB.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(sessionId, user.id, expires).run()

  return new Response(JSON.stringify({ ok: true, sessionId }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `pantry_session=${sessionId}; Path=/; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; Secure; SameSite=Lax`,
    },
  })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
