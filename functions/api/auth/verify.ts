import type { Env } from '../../env'

function generateId(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return htmlRedirect('/', 'auth?error=missing_token')
  }

  const now = Math.floor(Date.now() / 1000)

  const magicToken = await ctx.env.DB.prepare(
    'SELECT * FROM magic_tokens WHERE token = ? AND expires_at > ? AND used = 0'
  ).bind(token, now).first<{ token: string; email: string }>()

  if (!magicToken) {
    return htmlRedirect('/auth?error=expired')
  }

  await ctx.env.DB.prepare('UPDATE magic_tokens SET used = 1 WHERE token = ?').bind(token).run()

  let user = await ctx.env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(magicToken.email).first<{ id: string }>()

  if (!user) {
    const userId = generateId()
    await ctx.env.DB.prepare(
      'INSERT INTO users (id, email, avatar_id, default_servings) VALUES (?, ?, ?, ?)'
    ).bind(userId, magicToken.email, 'herb', 2).run()
    user = { id: userId }
  }

  const sessionId = generateId()
  const sessionExpiry = now + 60 * 60 * 24 * 30

  await ctx.env.DB.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(sessionId, user.id, sessionExpiry).run()

  const cookie = `pantry_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${60 * 60 * 24 * 30}`

  // Return a 200 HTML page rather than a 302 redirect.
  // Some CDN/proxy layers (and iOS in-app browsers) strip Set-Cookie from
  // redirect responses. Sending a 200 with both the cookie and a JS redirect
  // ensures the cookie is definitely set before the browser navigates.
  return new Response(buildRedirectPage('/'), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': cookie,
      'Cache-Control': 'no-store',
    },
  })
}

function htmlRedirect(dest: string): Response {
  return new Response(buildRedirectPage(dest), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function buildRedirectPage(dest: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="color-scheme" content="light"/>
  <meta http-equiv="refresh" content="0;url=${dest}"/>
  <title>Signing you in…</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;
         justify-content:center;background:#FAF7F2;font-family:Georgia,serif;}
    p{color:#6B6459;font-size:1.125rem;}
  </style>
</head>
<body>
  <p>Signing you in…</p>
  <script>window.location.replace(${JSON.stringify(dest)});</script>
</body>
</html>`
}
