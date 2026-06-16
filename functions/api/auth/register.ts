import type { Env } from '../../env'
import { checkRateLimit, getClientIp } from '../../lib/rateLimit'

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
  // Rate limit: 5 registrations per hour per IP
  const ip = getClientIp(ctx.request)
  const allowed = await checkRateLimit(ctx.env.DB, `register:${ip}`, 5, 60 * 60)
  if (!allowed) return json({ error: 'Too many registration attempts. Please try again later.' }, 429)

  let email: string, password: string, displayName: string
  try {
    const body = await ctx.request.json() as { email?: string; password?: string; display_name?: string }
    email = (body.email ?? '').trim().toLowerCase()
    password = body.password ?? ''
    displayName = (body.display_name ?? '').trim()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Invalid email address' }, 400)
  if (!password || password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400)

  const existing = await ctx.env.DB.prepare(
    'SELECT id, password_hash FROM users WHERE email = ?'
  ).bind(email).first<{ id: string; password_hash: string | null }>()

  const hash = await hashPassword(password)
  let userId: string

  if (existing) {
    if (existing.password_hash) {
      return json({ error: 'An account with that email already exists' }, 409)
    }
    // Existing magic-link account — set password, preserving all their data
    await ctx.env.DB.prepare(
      'UPDATE users SET password_hash = ?, display_name = COALESCE(display_name, ?) WHERE id = ?'
    ).bind(hash, displayName || null, existing.id).run()
    userId = existing.id
  } else {
    userId = toHex(crypto.getRandomValues(new Uint8Array(8)))
    await ctx.env.DB.prepare(
      'INSERT INTO users (id, email, display_name, password_hash) VALUES (?, ?, ?, ?)'
    ).bind(userId, email, displayName || null, hash).run()
  }

  const sessionId = toHex(crypto.getRandomValues(new Uint8Array(8)))
  const expires = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
  await ctx.env.DB.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(sessionId, userId, expires).run()

  return new Response(JSON.stringify({ ok: true, sessionId }), {
    status: 201,
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
