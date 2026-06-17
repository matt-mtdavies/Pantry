import type { Env } from '../../../env'

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const { id } = ctx.params as { id: string }

  let value: boolean
  try {
    const body = await ctx.request.json() as { value?: unknown }
    value = body.value === true
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  // Recipe must exist and be accessible (own or public author)
  const recipe = await ctx.env.DB.prepare(
    `SELECT r.id FROM recipes r
     JOIN users u ON r.user_id = u.id
     WHERE r.id = ? AND r.is_deleted = 0 AND (r.user_id = ? OR u.is_public = 1)`
  ).bind(id, userId).first<{ id: string }>()
  if (!recipe) return json({ error: 'Recipe not found' }, 404)

  if (value) {
    await ctx.env.DB.prepare(
      `INSERT OR IGNORE INTO user_favourites (user_id, recipe_id, created_at) VALUES (?, ?, ?)`
    ).bind(userId, id, Math.floor(Date.now() / 1000)).run()
  } else {
    await ctx.env.DB.prepare(
      `DELETE FROM user_favourites WHERE user_id = ? AND recipe_id = ?`
    ).bind(userId, id).run()
  }

  return json({ is_favourite: value })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
