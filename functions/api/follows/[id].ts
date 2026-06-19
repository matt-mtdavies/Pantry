import type { Env } from '../../env'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// POST /api/follows/:id — follow a user
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const followerId = ctx.data.userId as string | undefined
  if (!followerId) return json({ error: 'Unauthorized' }, 401)

  const followingId = ctx.params.id as string
  if (followerId === followingId) return json({ error: 'Cannot follow yourself' }, 400)

  // Verify target user exists and is public
  const target = await ctx.env.DB.prepare(
    'SELECT id FROM users WHERE id = ? AND is_public = 1'
  ).bind(followingId).first()
  if (!target) return json({ error: 'User not found' }, 404)

  try {
    await ctx.env.DB.prepare(`
      INSERT INTO user_follows (follower_id, following_id, created_at)
      VALUES (?, ?, unixepoch())
      ON CONFLICT DO NOTHING
    `).bind(followerId, followingId).run()
  } catch {
    return json({ error: 'Table not migrated' }, 503)
  }

  const count = await ctx.env.DB.prepare(
    'SELECT COUNT(*) AS n FROM user_follows WHERE following_id = ?'
  ).bind(followingId).first<{ n: number }>()

  return json({ following: true, follower_count: Number(count?.n ?? 0) })
}

// DELETE /api/follows/:id — unfollow a user
export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const followerId = ctx.data.userId as string | undefined
  if (!followerId) return json({ error: 'Unauthorized' }, 401)

  const followingId = ctx.params.id as string

  try {
    await ctx.env.DB.prepare(
      'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?'
    ).bind(followerId, followingId).run()
  } catch {
    return json({ error: 'Table not migrated' }, 503)
  }

  const count = await ctx.env.DB.prepare(
    'SELECT COUNT(*) AS n FROM user_follows WHERE following_id = ?'
  ).bind(followingId).first<{ n: number }>()

  return json({ following: false, follower_count: Number(count?.n ?? 0) })
}
