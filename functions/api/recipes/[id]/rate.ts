import type { Env } from '../../../env'

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const { id } = ctx.params as { id: string }

  let rating: number
  try {
    const body = await ctx.request.json() as { rating?: unknown }
    rating = Number(body.rating)
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return json({ error: 'Rating must be an integer 1–5' }, 400)
  }

  const recipe = await ctx.env.DB.prepare(
    'SELECT id, user_id FROM recipes WHERE id = ? AND is_deleted = 0'
  ).bind(id).first<{ id: string; user_id: string }>()
  if (!recipe) return json({ error: 'Recipe not found' }, 404)
  if (recipe.user_id === userId) return json({ error: "You can't rate your own recipe" }, 403)

  await ctx.env.DB.prepare(
    `INSERT INTO recipe_ratings (recipe_id, user_id, rating) VALUES (?, ?, ?)
     ON CONFLICT (recipe_id, user_id) DO UPDATE SET rating = excluded.rating`
  ).bind(id, userId, rating).run()

  const stats = await ctx.env.DB.prepare(
    'SELECT ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS rating_count FROM recipe_ratings WHERE recipe_id = ?'
  ).bind(id).first<{ avg_rating: number; rating_count: number }>()

  return json({ ok: true, avg_rating: Number(stats?.avg_rating ?? 0), rating_count: Number(stats?.rating_count ?? 0), my_rating: rating })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
