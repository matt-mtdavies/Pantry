import type { Env } from '../env'

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const [topRecipesRes, topChefsRes] = await Promise.all([
    ctx.env.DB.prepare(`
      SELECT
        r.id, r.title, r.hero_image_key, r.tags,
        r.prep_time, r.cook_time, r.user_id,
        u.display_name AS author_name,
        u.avatar_id    AS author_avatar,
        ROUND(AVG(rr.rating), 1) AS avg_rating,
        COUNT(rr.recipe_id)      AS rating_count
      FROM recipes r
      JOIN users u ON r.user_id = u.id
      JOIN recipe_ratings rr ON r.id = rr.recipe_id
      WHERE u.is_public = 1 AND r.is_deleted = 0
      GROUP BY r.id
      ORDER BY avg_rating DESC, rating_count DESC
      LIMIT 20
    `).all<Record<string, unknown>>(),

    ctx.env.DB.prepare(`
      SELECT
        u.id, u.display_name, u.avatar_id, u.country,
        COUNT(DISTINCT r.id)     AS recipe_count,
        ROUND(AVG(rr.rating), 1) AS avg_rating,
        COUNT(rr.rowid)          AS total_ratings
      FROM users u
      JOIN recipes r ON r.user_id = u.id AND r.is_deleted = 0
      JOIN recipe_ratings rr ON r.id = rr.recipe_id
      WHERE u.is_public = 1
      GROUP BY u.id
      ORDER BY avg_rating DESC, total_ratings DESC
      LIMIT 10
    `).all<Record<string, unknown>>(),
  ])

  return json({
    topRecipes: (topRecipesRes.results ?? []).map(r => ({
      ...r,
      tags: JSON.parse((r.tags as string) || '[]'),
      avg_rating: Number(r.avg_rating),
      rating_count: Number(r.rating_count),
    })),
    topChefs: (topChefsRes.results ?? []).map(u => ({
      ...u,
      recipe_count: Number(u.recipe_count),
      avg_rating: Number(u.avg_rating),
      total_ratings: Number(u.total_ratings),
    })),
  })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
