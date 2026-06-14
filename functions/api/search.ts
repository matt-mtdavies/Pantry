import type { Env } from '../env'

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const url = new URL(ctx.request.url)
  const q = url.searchParams.get('q')?.trim() ?? ''

  const like = `%${q}%`
  const rows = await ctx.env.DB.prepare(`
    SELECT
      r.id, r.title, r.description, r.tags, r.hero_image_key,
      r.prep_time, r.cook_time, r.servings, r.user_id,
      u.display_name  AS author_name,
      u.avatar_id     AS author_avatar,
      ROUND(COALESCE(AVG(rr.rating), 0), 1) AS avg_rating,
      COUNT(rr.recipe_id)                    AS rating_count,
      (SELECT rating FROM recipe_ratings WHERE recipe_id = r.id AND user_id = ?) AS my_rating
    FROM recipes r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN recipe_ratings rr ON r.id = rr.recipe_id
    WHERE u.is_public = 1
      AND r.is_deleted = 0
      AND (? = '' OR r.title LIKE ? OR r.description LIKE ? OR r.tags LIKE ?)
    GROUP BY r.id
    ORDER BY avg_rating DESC, rating_count DESC, r.created_at DESC
    LIMIT 48
  `).bind(userId, q, like, like, like).all<Record<string, unknown>>()

  const results = (rows.results ?? []).map(r => ({
    ...r,
    tags: JSON.parse((r.tags as string) || '[]'),
    avg_rating: Number(r.avg_rating),
    rating_count: Number(r.rating_count),
    my_rating: r.my_rating != null ? Number(r.my_rating) : null,
  }))

  return json(results)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
