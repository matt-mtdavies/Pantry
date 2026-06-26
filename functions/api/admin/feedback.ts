import type { Env } from '../../env'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const userEmail = ctx.data.email as string
  if (ctx.env.ADMIN_EMAILS) {
    const admins = ctx.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase())
    if (!admins.includes(userEmail.toLowerCase())) return json({ error: 'Forbidden' }, 403)
  }

  const rows = await ctx.env.DB.prepare(`
    SELECT id, user_email, category, message,
      datetime(created_at, 'unixepoch') AS submitted_at
    FROM feedback
    ORDER BY created_at DESC
    LIMIT 200
  `).all()

  return json({ feedback: rows.results, total: rows.results.length })
}
