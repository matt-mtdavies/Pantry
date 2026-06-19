import type { Env } from '../../env'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.params.id as string
  const viewerId = ctx.data.userId as string | undefined

  const user = await ctx.env.DB.prepare(`
    SELECT id, display_name, avatar_id, avatar_image_key, country, created_at
    FROM users
    WHERE id = ? AND is_public = 1
  `).bind(userId).first<{
    id: string; display_name: string | null; avatar_id: string
    avatar_image_key: string | null; country: string | null; created_at: number
  }>()

  if (!user) return json({ error: 'Profile not found' }, 404)

  const [statsRow, recipesResult] = await Promise.all([
    ctx.env.DB.prepare(`
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

    ctx.env.DB.prepare(`
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

  // Follow counts + is_following (graceful if table not yet migrated)
  let follower_count = 0
  let following_count = 0
  let is_following = false
  try {
    const [followers, following] = await ctx.env.DB.batch([
      ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM user_follows WHERE following_id = ?').bind(userId),
      ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM user_follows WHERE follower_id = ?').bind(userId),
    ])
    follower_count = Number((followers.results?.[0] as Record<string, unknown>)?.n ?? 0)
    following_count = Number((following.results?.[0] as Record<string, unknown>)?.n ?? 0)

    if (viewerId && viewerId !== userId) {
      const row = await ctx.env.DB.prepare(
        'SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ?'
      ).bind(viewerId, userId).first()
      is_following = row != null
    }
  } catch { /* user_follows not yet migrated */ }

  return json({
    ...user,
    recipe_count: Number(statsRow?.recipe_count ?? 0),
    avg_rating: statsRow?.avg_rating != null ? Number(statsRow.avg_rating) : null,
    total_ratings: Number(statsRow?.total_ratings ?? 0),
    follower_count,
    following_count,
    is_following,
    recipes: (recipesResult.results ?? []).map(r => ({
      ...r,
      tags: JSON.parse(r.tags || '[]') as string[],
      avg_rating: r.avg_rating != null ? Number(r.avg_rating) : null,
      rating_count: Number(r.rating_count),
    })),
  })
}
