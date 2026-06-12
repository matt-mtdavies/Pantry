import type { Env } from '../../../env'

function generateToken(): string {
  const arr = new Uint8Array(12)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const params = ctx.params as { id: string }
  const id = params.id

  const row = await ctx.env.DB.prepare(
    'SELECT id, share_token FROM recipes WHERE id = ? AND user_id = ? AND is_deleted = 0'
  ).bind(id, userId).first<{ id: string; share_token: string | null }>()

  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let token = row.share_token
  if (!token) {
    token = generateToken()
    await ctx.env.DB.prepare('UPDATE recipes SET share_token = ? WHERE id = ?').bind(token, id).run()
  }

  const origin = new URL(ctx.request.url).origin
  return new Response(JSON.stringify({ token, url: `${origin}/share/${token}` }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
