import type { Env } from '../env'
import { checkRateLimit } from '../lib/rateLimit'

function toHex(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const userEmail = ctx.data.email as string

  // Rate limit: 3 resend requests per hour per user
  const allowed = await checkRateLimit(ctx.env.DB, `resend-verify:${userId}`, 3, 60 * 60)
  if (!allowed) return json({ error: 'Too many requests. Please wait before requesting another verification email.' }, 429)

  const user = await ctx.env.DB.prepare(
    'SELECT email_verified FROM users WHERE id = ?'
  ).bind(userId).first<{ email_verified: number }>()

  if (!user) return json({ error: 'User not found' }, 404)
  if (user.email_verified) return json({ ok: true, message: 'Email is already verified.' })

  if (!ctx.env.RESEND_API_KEY) return json({ error: 'Email not configured' }, 503)

  const token = toHex(crypto.getRandomValues(new Uint8Array(32)))
  const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days

  await ctx.env.DB.prepare(
    'INSERT INTO magic_tokens (token, email, expires_at) VALUES (?, ?, ?)'
  ).bind(token, userEmail, expiresAt).run()

  const appUrl = (ctx.env.APP_URL ?? `https://${new URL(ctx.request.url).host}`).replace(/\/$/, '')
  const verifyLink = `${appUrl}/api/auth/verify-email?token=${token}`
  const from = ctx.env.RESEND_FROM_EMAIL ?? 'Pantry <noreply@myopenpantry.com>'

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${ctx.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: userEmail,
      subject: 'Verify your Pantry email address',
      html: buildEmail(verifyLink),
    }),
  })

  if (!resendRes.ok) {
    const err = await resendRes.text()
    console.error('[resend-verification] Resend error', resendRes.status, err)
    return json({ error: 'Failed to send email. Please try again.' }, 500)
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
            <h1 style="margin:0 0 16px;font-size:28px;font-weight:600;color:#1F1B16;line-height:1.2;">Verify your email address</h1>
            <p style="margin:0 0 32px;font-size:18px;color:#6B6459;line-height:1.6;">
              Tap the button below to verify your email address. The link expires in 7 days.
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
              If you didn't create a Pantry account, you can safely ignore this email.<br/>
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
