import type { Env } from '../env'

function parseRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    avatar_id: row.avatar_id ?? 'herb',
    default_servings: row.default_servings ?? 2,
    created_at: row.created_at,
  }
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const user = await ctx.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
  if (!user) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: json })
  return new Response(JSON.stringify(parseRow(user as Record<string, unknown>)), { headers: json })
}

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const body = await ctx.request.json() as {
    display_name?: string
    avatar_id?: string
    default_servings?: number
  }
  await ctx.env.DB.prepare(
    'UPDATE users SET display_name = ?, avatar_id = ?, default_servings = ? WHERE id = ?'
  ).bind(
    body.display_name ?? null,
    body.avatar_id ?? 'herb',
    body.default_servings ?? 2,
    userId,
  ).run()
  const user = await ctx.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
  return new Response(JSON.stringify(parseRow(user as Record<string, unknown>)), { headers: json })
}

const json = { 'Content-Type': 'application/json' }
