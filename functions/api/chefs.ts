import type { Env } from '../env'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const viewerId = ctx.data.userId as string | undefined

  const rows = await ctx.env.DB.prepare(`
    SELECT
      u.id, u.display_name, u.avatar_id, u.avatar_image_key, u.country,
      COUNT(DISTINCT r.id)          AS recipe_count,
      ROUND(AVG(rr.rating), 1)      AS avg_rating,
      COUNT(DISTINCT f.follower_id) AS follower_count
    FROM users u
    LEFT JOIN recipes r       ON r.user_id = u.id AND r.is_deleted = 0
    LEFT JOIN recipe_ratings rr ON rr.recipe_id = r.id
    LEFT JOIN user_follows f  ON f.following_id = u.id
    WHERE u.is_public = 1
    GROUP BY u.id
    HAVING COUNT(DISTINCT r.id) > 0
    ORDER BY follower_count DESC, recipe_count DESC
    LIMIT 100
  `).all<{
    id: string; display_name: string | null; avatar_id: string
    avatar_image_key: string | null; country: string | null
    recipe_count: number; avg_rating: number | null; follower_count: number
  }>()

  const chefs = (rows.results ?? []).map(c => ({
    ...c,
    recipe_count: Number(c.recipe_count),
    avg_rating: c.avg_rating != null ? Number(c.avg_rating) : null,
    follower_count: Number(c.follower_count),
    is_following: false,
  }))

  // Batch-check which chefs the viewer follows
  if (viewerId && chefs.length > 0) {
    try {
      const followed = await ctx.env.DB.prepare(`
        SELECT following_id FROM user_follows WHERE follower_id = ?
      `).bind(viewerId).all<{ following_id: string }>()
      const followedSet = new Set((followed.results ?? []).map(r => r.following_id))
      for (const chef of chefs) {
        chef.is_following = followedSet.has(chef.id)
      }
    } catch { /* user_follows not yet migrated */ }
  }

  // Exclude viewer from their own list
  const filtered = viewerId ? chefs.filter(c => c.id !== viewerId) : chefs

  return json(filtered)
}
