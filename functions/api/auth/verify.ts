import type { Env } from '../../env'

function generateId(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url = new URL(ctx.request.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return htmlRedirect('/auth?error=missing_token')
    }

    const now = Math.floor(Date.now() / 1000)

    const magicToken = await ctx.env.DB.prepare(
      'SELECT token, email, expires_at, used FROM magic_tokens WHERE token = ?'
    ).bind(token).first<{ token: string; email: string; expires_at: number; used: number }>()

    if (!magicToken || magicToken.used || magicToken.expires_at <= now) {
      return htmlRedirect('/auth?error=expired')
    }

    await ctx.env.DB.prepare(
      'UPDATE magic_tokens SET used = 1 WHERE token = ?'
    ).bind(token).run()

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
    const sessionExpiry = now + 60 * 60 * 24 * 30

    await ctx.env.DB.prepare(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(sessionId, user.id, sessionExpiry).run()

    const cookie = `pantry_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${60 * 60 * 24 * 30}`

    return new Response(buildRedirectPage('/'), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': cookie,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[verify] unhandled error:', message)
    return new Response(buildErrorPage(message), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }
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

function buildErrorPage(message: string): string {
  const safe = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="color-scheme" content="light"/>
  <title>Sign-in error</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;
         justify-content:center;background:#FAF7F2;font-family:Georgia,serif;
         padding:2rem;text-align:center;}
    h1{color:#1F1B16;font-size:1.5rem;margin:0 0 1rem;}
    p{color:#6B6459;margin:0 0 1rem;max-width:400px;line-height:1.6;}
    code{display:block;background:#E8E0D4;padding:0.75rem 1rem;border-radius:6px;
         font-size:0.8rem;color:#1F1B16;word-break:break-all;max-width:500px;
         margin:1rem auto 2rem;}
    a{display:inline-block;padding:0.75rem 1.5rem;background:#C4633E;color:#fff;
      border-radius:8px;text-decoration:none;font-family:system-ui,sans-serif;
      font-weight:600;}
  </style>
</head>
<body>
  <h1>Sign-in failed</h1>
  <p>Something went wrong while signing you in. The error message is shown below — please screenshot it and share it.</p>
  <code>${safe}</code>
  <a href="/auth">Try again</a>
</body>
</html>`
}
