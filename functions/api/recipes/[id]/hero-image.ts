import type { Env } from '../../../env'

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const { id } = ctx.params as { id: string }

  const existing = await ctx.env.DB.prepare(
    'SELECT hero_image_key FROM recipes WHERE id = ? AND user_id = ? AND is_deleted = 0'
  ).bind(id, userId).first<{ hero_image_key: string | null }>()

  if (!existing) return json({ error: 'Not found' }, 404)

  if (existing.hero_image_key && ctx.env.R2) {
    await ctx.env.R2.delete(existing.hero_image_key).catch(() => {})
  }

  await ctx.env.DB.prepare(
    'UPDATE recipes SET hero_image_key = NULL WHERE id = ? AND user_id = ?'
  ).bind(id, userId).run()

  return json({ ok: true })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
