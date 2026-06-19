import type { Env } from '../../env'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const userEmail = ctx.data.email as string

  if (ctx.env.ADMIN_EMAILS) {
    const admins = ctx.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase())
    if (!admins.includes(userEmail.toLowerCase())) {
      return json({ error: 'Forbidden' }, 403)
    }
  }

  let results: unknown[]
  try {
    ;({ results } = await ctx.env.DB.prepare(`
      SELECT
        id,
        email,
        display_name,
        country,
        email_verified,
        is_admin,
        avatar_id,
        datetime(created_at, 'unixepoch') AS joined_at,
        (SELECT COUNT(*) FROM recipes WHERE user_id = users.id) AS recipe_count,
        (SELECT COUNT(*) FROM user_follows WHERE following_id = users.id) AS followers,
        (SELECT COUNT(*) FROM user_follows WHERE follower_id = users.id) AS following
      FROM users
      ORDER BY created_at ASC
    `).all())
  } catch {
    // user_follows table may not exist yet — fall back to simpler query
    ;({ results } = await ctx.env.DB.prepare(`
      SELECT
        id,
        email,
        display_name,
        country,
        email_verified,
        is_admin,
        avatar_id,
        datetime(created_at, 'unixepoch') AS joined_at,
        (SELECT COUNT(*) FROM recipes WHERE user_id = users.id) AS recipe_count
      FROM users
      ORDER BY created_at ASC
    `).all())
  }

  return json({ users: results, total: results.length })
}
