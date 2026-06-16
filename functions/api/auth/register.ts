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

async function sendVerificationEmail(env: Env, email: string, appUrl: string, db: D1Database): Promise<void> {
  if (!env.RESEND_API_KEY) return

  const token = toHex(crypto.getRandomValues(new Uint8Array(32)))
  const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60

  await db.prepare(
    'INSERT INTO magic_tokens (token, email, expires_at) VALUES (?, ?, ?)'
  ).bind(token, email, expiresAt).run()

  const verifyLink = `${appUrl}/api/auth/verify-email?token=${token}`
  const from = env.RESEND_FROM_EMAIL ?? 'Pantry <noreply@myopenpantry.com>'

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'Verify your Pantry email address',
      html: buildVerifyEmail(verifyLink),
    }),
  }).catch(err => console.error('[register] verification email failed:', err instanceof Error ? err.message : String(err)))
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

  // Lazy migration: ensure email_verified column exists (DEFAULT 1 so existing users unaffected)
  try { await ctx.env.DB.prepare('ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1').run() } catch { /* exists */ }

  const existing = await ctx.env.DB.prepare(
    'SELECT id, password_hash, email_verified FROM users WHERE email = ?'
  ).bind(email).first<{ id: string; password_hash: string | null; email_verified: number }>()

  const hash = await hashPassword(password)
  let userId: string
  let isNewAccount = false

  if (existing) {
    if (existing.password_hash) {
      return json({ error: 'An account with that email already exists' }, 409)
    }
    // Existing magic-link account — they already verified via magic link, just add password
    await ctx.env.DB.prepare(
      'UPDATE users SET password_hash = ?, display_name = COALESCE(display_name, ?) WHERE id = ?'
    ).bind(hash, displayName || null, existing.id).run()
    userId = existing.id
  } else {
    userId = toHex(crypto.getRandomValues(new Uint8Array(8)))
    await ctx.env.DB.prepare(
      'INSERT INTO users (id, email, display_name, password_hash, email_verified) VALUES (?, ?, ?, ?, 0)'
    ).bind(userId, email, displayName || null, hash).run()
    isNewAccount = true
  }

  const sessionId = toHex(crypto.getRandomValues(new Uint8Array(8)))
  const expires = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
  await ctx.env.DB.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(sessionId, userId, expires).run()

  // Send verification email for new password accounts (non-blocking)
  if (isNewAccount) {
    const appUrl = (ctx.env.APP_URL ?? `https://${new URL(ctx.request.url).host}`).replace(/\/$/, '')
    ctx.waitUntil(sendVerificationEmail(ctx.env, email, appUrl, ctx.env.DB))
  }

  return new Response(JSON.stringify({ ok: true, sessionId }), {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `pantry_session=${sessionId}; Path=/; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; Secure; SameSite=Lax`,
    },
  })
}

function buildVerifyEmail(link: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="color-scheme" content="light"/></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:48px 24px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#FFFFFF;border:1px solid #E8E0D4;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:40px 40px 0;font-family:Georgia,serif;">
            <p style="margin:0 0 24px;font-size:24px;font-weight:600;color:#C4633E;letter-spacing:-0.01em;">Pantry</p>
            <h1 style="margin:0 0 16px;font-size:28px;font-weight:600;color:#1F1B16;line-height:1.2;">Welcome to Pantry!</h1>
            <p style="margin:0 0 32px;font-size:18px;color:#6B6459;line-height:1.6;">
              Please verify your email address to complete your account setup. The link expires in 7 days.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px;">
            <a href="${link}" style="display:block;text-align:center;padding:16px 32px;background:#C4633E;color:#FFFFFF;font-family:system-ui,sans-serif;font-size:18px;font-weight:600;border-radius:8px;text-decoration:none;">
              Verify email address
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 40px;border-top:1px solid #E8E0D4;">
            <p style="margin:0;font-size:14px;color:#9C9189;font-family:system-ui,sans-serif;line-height:1.6;">
              If you didn't create this account, you can safely ignore this email.<br/>
              Link: <a href="${link}" style="color:#C4633E;">${link}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
