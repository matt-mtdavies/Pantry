import type { Env } from '../../env'

// GET /api/auth/verify-email?token=xxx
// Marks the user's email as verified and redirects to the app.
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url)
  const token = url.searchParams.get('token')?.trim()

  if (!token || !/^[a-f0-9]+$/.test(token)) {
    return redirect('/auth?error=invalid_token')
  }

  const now = Math.floor(Date.now() / 1000)
  const row = await ctx.env.DB.prepare(
    'SELECT token, email, expires_at, used FROM magic_tokens WHERE token = ?'
  ).bind(token).first<{ token: string; email: string; expires_at: number; used: number }>()

  if (!row || row.used || row.expires_at <= now) {
    return redirect('/profile?error=verify_expired')
  }

  await ctx.env.DB.prepare('UPDATE magic_tokens SET used = 1 WHERE token = ?').bind(token).run()

  const user = await ctx.env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(row.email).first<{ id: string }>()

  if (!user) return redirect('/auth?error=user_not_found')

  await ctx.env.DB.prepare(
    'UPDATE users SET email_verified = 1 WHERE id = ?'
  ).bind(user.id).run()

  return redirect('/?verified=1')
}

function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: location, 'Cache-Control': 'no-store' },
  })
}
