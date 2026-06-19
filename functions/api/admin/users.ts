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

  const rows = await ctx.env.DB.prepare(`
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
  `).all()

  return json({ users: rows.results, total: rows.results.length })
}
