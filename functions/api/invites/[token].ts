import type { Env } from '../../env'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=300',
    },
  })
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const token = ctx.params.token as string

  const row = await ctx.env.DB.prepare(`
    SELECT u.display_name, u.avatar_id, u.avatar_image_key
    FROM invite_tokens it
    JOIN users u ON it.user_id = u.id
    WHERE it.token = ?
  `).bind(token).first<{
    display_name: string | null
    avatar_id: string | null
    avatar_image_key: string | null
  }>()

  if (!row) return json({ error: 'Not found' }, 404)

  return json({
    display_name: row.display_name,
    avatar_id: row.avatar_id,
    avatar_image_key: row.avatar_image_key,
  })
}
