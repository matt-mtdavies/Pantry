import type { Env } from '../../env'

function generateId(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

// GET: validate the token exists but DO NOT consume it.
// Email security scanners pre-fetch every link in incoming emails as a GET
// request. The GET just shows a landing page with an auto-submit form.
// Scanners don't execute JavaScript or submit HTML forms.
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url)
  const token = url.searchParams.get('token')

  if (!token) return redirect('/auth?error=missing_token')

  const now = Math.floor(Date.now() / 1000)
  const magicToken = await ctx.env.DB.prepare(
    'SELECT used, expires_at FROM magic_tokens WHERE token = ?'
  ).bind(token).first<{ used: number; expires_at: number }>()

  if (!magicToken || magicToken.used || magicToken.expires_at <= now) {
    return redirect('/auth?error=expired')
  }

  const escaped = token.replace(/[^a-f0-9]/g, '')
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="UTF-8">
<script>document.addEventListener('DOMContentLoaded',function(){document.getElementById('f').submit();});</script>
</head><body>
<p style="font-family:system-ui;padding:2rem;color:#6B6459">Signing you in&hellip;</p>
<form id="f" method="POST" action="/api/auth/verify">
  <input type="hidden" name="token" value="${escaped}">
</form>
</body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-store' } },
  )
}

// POST: consume the token, create the session, hand off to the SPA.
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const formData = await ctx.request.formData()
    const token = (formData.get('token') as string | null)?.trim()

    if (!token) return redirect('/auth?error=missing_token')

    const now = Math.floor(Date.now() / 1000)
    const magicToken = await ctx.env.DB.prepare(
      'SELECT token, email, expires_at, used FROM magic_tokens WHERE token = ?'
    ).bind(token).first<{ token: string; email: string; expires_at: number; used: number }>()

    if (!magicToken || magicToken.used || magicToken.expires_at <= now) {
      return redirect('/auth?error=expired')
    }

    await ctx.env.DB.prepare('UPDATE magic_tokens SET used = 1 WHERE token = ?').bind(token).run()

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
    const maxAge = 60 * 60 * 24 * 30
    await ctx.env.DB.prepare(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(sessionId, user.id, now + maxAge).run()

    // Set cookie (works in non-ITP browsers / Brave) AND pass via query param
    // so the SPA can store it in localStorage (works in Safari ITP contexts).
    const cookie = `pantry_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`

    return new Response(
      `<!DOCTYPE html><html><head><meta charset="UTF-8">
<script>window.location.replace('/auth/complete?s=${sessionId}');</script>
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
    console.error('[verify POST]', err instanceof Error ? err.message : String(err))
    return redirect('/auth?error=server_error')
  }
}

function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { 'Location': location, 'Cache-Control': 'no-store' },
  })
}
