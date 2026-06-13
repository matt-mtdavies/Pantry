import type { Env } from '../../env'

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const body = await ctx.request.json() as { sessionId?: string }
    const sessionId = body.sessionId?.trim()
    if (!sessionId) return json({ error: 'Missing sessionId' }, 400)

    const now = Math.floor(Date.now() / 1000)
    const session = await ctx.env.DB.prepare(
      'SELECT id FROM sessions WHERE id = ? AND expires_at > ?'
    ).bind(sessionId, now).first<{ id: string }>()

    if (!session) return json({ error: 'Invalid session' }, 401)

    const maxAge = 60 * 60 * 24 * 30
    const cookie = `pantry_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`

    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[set-session] error:', message)
    return json({ error: 'server_error' }, 500)
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
