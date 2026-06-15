import type { Env } from '../../env'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const userId = params.id as string

  const user = await env.DB.prepare(`
    SELECT id, display_name, avatar_id, country, created_at
    FROM users
    WHERE id = ? AND is_public = 1
  `).bind(userId).first<{
    id: string; display_name: string | null; avatar_id: string
    country: string | null; created_at: number
  }>()

  if (!user) return json({ error: 'Profile not found' }, 404)

  const [statsRow, recipesResult] = await Promise.all([
    env.DB.prepare(`
      SELECT
        COUNT(DISTINCT r.id)     AS recipe_count,
        ROUND(AVG(rr.rating), 1) AS avg_rating,
        COUNT(rr.recipe_id)      AS total_ratings
      FROM recipes r
      LEFT JOIN recipe_ratings rr ON r.id = rr.recipe_id
      WHERE r.user_id = ? AND r.is_deleted = 0
    `).bind(userId).first<{
      recipe_count: number; avg_rating: number | null; total_ratings: number
    }>(),

    env.DB.prepare(`
      SELECT r.id, r.title, r.hero_image_key, r.prep_time, r.cook_time, r.tags,
             ROUND(AVG(rr.rating), 1) AS avg_rating,
             COUNT(rr.recipe_id)      AS rating_count
      FROM recipes r
      LEFT JOIN recipe_ratings rr ON r.id = rr.recipe_id
      WHERE r.user_id = ? AND r.is_deleted = 0
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `).bind(userId).all<{
      id: string; title: string; hero_image_key: string | null
      prep_time: number | null; cook_time: number | null
      tags: string; avg_rating: number | null; rating_count: number
    }>(),
  ])

  return json({
    ...user,
    recipe_count: Number(statsRow?.recipe_count ?? 0),
    avg_rating: statsRow?.avg_rating != null ? Number(statsRow.avg_rating) : null,
    total_ratings: Number(statsRow?.total_ratings ?? 0),
    recipes: (recipesResult.results ?? []).map(r => ({
      ...r,
      tags: JSON.parse(r.tags || '[]') as string[],
      avg_rating: r.avg_rating != null ? Number(r.avg_rating) : null,
      rating_count: Number(r.rating_count),
    })),
  })
}
