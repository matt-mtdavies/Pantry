import type { Env } from '../../env'
import { checkRateLimit, getClientIp } from '../../lib/rateLimit'

function toHex(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let email: string
  try {
    const body = await ctx.request.json() as { email?: string }
    email = (body.email ?? '').trim().toLowerCase()
  } catch {
    return json({ ok: true }) // never reveal failure reason
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: true })

  // Rate limit: 3 requests per hour per email, 5 per hour per IP
  const ip = getClientIp(ctx.request)
  const [emailOk, ipOk] = await Promise.all([
    checkRateLimit(ctx.env.DB, `forgot:email:${email}`, 3, 60 * 60),
    checkRateLimit(ctx.env.DB, `forgot:ip:${ip}`, 5, 60 * 60),
  ])
  if (!emailOk || !ipOk) return json({ ok: true }) // silent — same response as success

  // Allow any user (including those without a password yet) to set/reset via email
  const user = await ctx.env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first()
  if (!user) return json({ ok: true }) // silent — don't reveal whether email exists

  const token = toHex(crypto.getRandomValues(new Uint8Array(32)))
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour
  await ctx.env.DB.prepare(
    'INSERT INTO magic_tokens (token, email, expires_at) VALUES (?, ?, ?)'
  ).bind(token, email, expiresAt).run()

  const appUrl = (ctx.env.APP_URL ?? `https://${new URL(ctx.request.url).host}`).replace(/\/$/, '')
  const resetLink = `${appUrl}/reset-password?token=${token}`
  const from = ctx.env.RESEND_FROM_EMAIL ?? 'Pantry <noreply@myopenpantry.com>'

  if (!ctx.env.RESEND_API_KEY) {
    console.error('[forgot-password] RESEND_API_KEY is not set')
    return json({ ok: true })
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${ctx.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'Reset your Pantry password',
      html: buildEmail(resetLink),
    }),
  })

  if (!resendRes.ok) {
    const body = await resendRes.text()
    console.error('[forgot-password] Resend error', resendRes.status, body)
  }

  return json({ ok: true })
}

function buildEmail(link: string): string {
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
            <h1 style="margin:0 0 16px;font-size:28px;font-weight:600;color:#1F1B16;line-height:1.2;">Reset your password</h1>
            <p style="margin:0 0 32px;font-size:18px;color:#6B6459;line-height:1.6;">
              Tap the button below to choose a new password. The link expires in 1 hour.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px;">
            <a href="${link}" style="display:block;text-align:center;padding:16px 32px;background:#C4633E;color:#FFFFFF;font-family:system-ui,sans-serif;font-size:18px;font-weight:600;border-radius:8px;text-decoration:none;">
              Reset password
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 40px;border-top:1px solid #E8E0D4;">
            <p style="margin:0;font-size:14px;color:#9C9189;font-family:system-ui,sans-serif;line-height:1.6;">
              If you didn't request this, you can safely ignore this email. Your password won't change.<br/>
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
