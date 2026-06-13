import type { Env } from '../../env'

function generateToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = await ctx.request.json() as { email?: string }
  const email = body.email?.trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Valid email required' }, 400)
  }

  const token = generateToken()
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 15 // 15 minutes

  await ctx.env.DB.prepare(
    'INSERT INTO magic_tokens (token, email, expires_at) VALUES (?, ?, ?)'
  ).bind(token, email, expiresAt).run()

  const appUrl = ctx.env.APP_URL ?? `https://${new URL(ctx.request.url).host}`
  // Link goes directly to the Pages Function which verifies the token,
  // sets the session cookie, and redirects to / — no JS needed for auth.
  const magicLink = `${appUrl}/api/auth/verify?token=${token}`

  const fromEmail = ctx.env.RESEND_FROM_EMAIL ?? 'Pantry <noreply@pantry.app>'

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ctx.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: email,
      subject: 'Sign in to Pantry',
      html: buildEmail(magicLink),
    }),
  })

  if (!emailRes.ok) {
    const err = await emailRes.text()
    console.error('Resend error:', err)
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
            <h1 style="margin:0 0 16px;font-size:28px;font-weight:600;color:#1F1B16;line-height:1.2;">Here's your sign-in link</h1>
            <p style="margin:0 0 32px;font-size:18px;color:#6B6459;line-height:1.6;">
              Tap the button below to sign in to your Pantry. The link expires in 15 minutes.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px;">
            <a href="${link}" style="display:block;text-align:center;padding:16px 32px;background:#C4633E;color:#FFFFFF;font-family:system-ui,sans-serif;font-size:18px;font-weight:600;border-radius:8px;text-decoration:none;">
              Sign in to Pantry
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 40px;border-top:1px solid #E8E0D4;">
            <p style="margin:0;font-size:14px;color:#9C9189;font-family:system-ui,sans-serif;line-height:1.6;">
              If you didn't request this, you can safely ignore this email.<br/>
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
