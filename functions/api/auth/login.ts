import type { Env } from '../../env'

const ITERATIONS = 100_000

function toHex(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const result = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) result[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  return result
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: ITERATIONS, hash: 'SHA-256' },
    key, 256
  )
  return toHex(new Uint8Array(bits)) === hashHex
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let email: string, password: string
  try {
    const body = await ctx.request.json() as { email?: string; password?: string }
    email = (body.email ?? '').trim().toLowerCase()
    password = body.password ?? ''
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!email || !password) return json({ error: 'Email and password are required' }, 400)

  const user = await ctx.env.DB.prepare(
    'SELECT id, password_hash FROM users WHERE email = ?'
  ).bind(email).first<{ id: string; password_hash: string | null }>()

  // Deliberate vague error — don't reveal whether the email exists
  const invalid = !user || !user.password_hash || !(await verifyPassword(password, user.password_hash))
  if (invalid) return json({ error: 'Incorrect email or password' }, 401)

  const sessionId = toHex(crypto.getRandomValues(new Uint8Array(8)))
  const expires = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
  await ctx.env.DB.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(sessionId, user!.id, expires).run()

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
