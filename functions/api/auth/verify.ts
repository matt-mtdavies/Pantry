import type { Env } from '../../env'

function generateId(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

// GET: show a sign-in confirmation page. Does NOT consume the token.
// Email scanners pre-fetch GET links (and may execute JavaScript). By showing
// a plain HTML button with no JavaScript, scanners see the form but won't
// submit it — only a real user tap triggers the POST that consumes the token.
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
    `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Sign in to Pantry</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FAF7F2;font-family:Georgia,serif;padding:1rem}
.card{background:#fff;border:1px solid #E8E0D4;border-radius:16px;padding:2.5rem;max-width:360px;width:100%;text-align:center}
.brand{color:#C4633E;font-size:1.25rem;font-weight:600;margin-bottom:1.5rem}
h1{font-size:1.5rem;color:#1F1B16;margin-bottom:.75rem;line-height:1.3}
p{color:#6B6459;font-size:1rem;line-height:1.6;margin-bottom:2rem}
button{display:block;width:100%;padding:1rem;background:#C4633E;color:#fff;border:none;border-radius:8px;font-family:system-ui,sans-serif;font-size:1.1rem;font-weight:600;cursor:pointer}
button:active{opacity:.85}
</style>
</head>
<body>
<div class="card">
  <p class="brand">Pantry</p>
  <h1>Sign in to your kitchen</h1>
  <p>Tap the button below to complete your sign-in.</p>
  <form method="POST" action="/api/auth/verify">
    <input type="hidden" name="token" value="${escaped}"/>
    <button type="submit">Sign in to Pantry</button>
  </form>
</div>
</body>
</html>`,
    { status: 200, headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-store' } },
  )
}

// POST: consume the token and create the session.
// Only reachable by a real user tapping the button on the GET page.
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
