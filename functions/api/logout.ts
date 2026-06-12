import type { Env } from '../env'

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const sessionId = ctx.data.sessionId as string | undefined
  if (sessionId) {
    await ctx.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'pantry_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    },
  })
}
