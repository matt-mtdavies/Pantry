import type { Env } from '../env'

const CATEGORIES = ['idea', 'bug', 'general'] as const
type Category = typeof CATEGORIES[number]

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function generateId(): string {
  const arr = new Uint8Array(12)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

const CATEGORY_LABELS: Record<Category, string> = {
  idea: 'Feature idea',
  bug: 'Bug report',
  general: 'General feedback',
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const userEmail = ctx.data.email as string

  const body = await ctx.request.json() as { category?: string; message?: string }
  const category = body.category?.trim()
  const message = body.message?.trim()

  if (!category || !CATEGORIES.includes(category as Category)) {
    return json({ error: 'Valid category required' }, 400)
  }
  if (!message || message.length < 5) {
    return json({ error: 'Message too short' }, 400)
  }
  if (message.length > 2000) {
    return json({ error: 'Message too long (max 2000 characters)' }, 400)
  }

  const id = generateId()
  await ctx.env.DB.prepare(
    `INSERT INTO feedback (id, user_id, user_email, category, message) VALUES (?, ?, ?, ?, ?)`
  ).bind(id, userId, userEmail, category, message).run()

  ctx.waitUntil(sendNotification(ctx.env, userEmail, category as Category, message))

  return json({ ok: true })
}

async function sendNotification(env: Env, userEmail: string, category: Category, message: string) {
  if (!env.RESEND_API_KEY || !env.ADMIN_EMAILS) return
  const adminEmail = env.ADMIN_EMAILS.split(',')[0].trim()
  const fromEmail = env.RESEND_FROM_EMAIL ?? 'Pantry <noreply@myopenpantry.com>'
  const label = CATEGORY_LABELS[category]

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(8_000),
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: adminEmail,
      subject: `Pantry feedback: ${label}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:48px 24px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#FFFFFF;border:1px solid #E8E0D4;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#C4633E;text-transform:uppercase;letter-spacing:0.06em;">${label}</p>
            <p style="margin:0;font-size:13px;color:#9C9189;">From: ${userEmail}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 32px;">
            <p style="margin:0;font-size:16px;color:#1F1B16;line-height:1.7;white-space:pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    }),
  }).catch(() => { /* non-critical */ })
}
