import type { Env } from '../env'

function parseRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    avatar_id: row.avatar_id ?? 'herb',
    avatar_image_key: row.avatar_image_key ?? null,
    default_servings: row.default_servings ?? 2,
    is_public: row.is_public === 1 || row.is_public === true,
    country: row.country ?? null,
    gender: row.gender ?? null,
    age_bracket: row.age_bracket ?? null,
    unit_system: (row.unit_system as string) ?? 'metric',
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
    is_public?: boolean
    country?: string
    gender?: string
    age_bracket?: string
    unit_system?: string
  }
  // Lazily add column if not yet migrated
  try { await ctx.env.DB.prepare('ALTER TABLE users ADD COLUMN unit_system TEXT DEFAULT \'metric\'').run() } catch { /* exists */ }
  await ctx.env.DB.prepare(
    `UPDATE users SET
      display_name = ?, avatar_id = ?, default_servings = ?,
      is_public = ?, country = ?, gender = ?, age_bracket = ?, unit_system = ?
    WHERE id = ?`
  ).bind(
    body.display_name ?? null,
    body.avatar_id ?? 'herb',
    body.default_servings ?? 2,
    body.is_public !== false ? 1 : 0,
    body.country ?? null,
    body.gender ?? null,
    body.age_bracket ?? null,
    body.unit_system === 'imperial' ? 'imperial' : 'metric',
    userId,
  ).run()
  const user = await ctx.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
  return new Response(JSON.stringify(parseRow(user as Record<string, unknown>)), { headers: json })
}

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  await ctx.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run()
  await ctx.env.DB.prepare(
    'DELETE FROM magic_tokens WHERE email = (SELECT email FROM users WHERE id = ?)'
  ).bind(userId).run()
  await ctx.env.DB.prepare('DELETE FROM recipes WHERE user_id = ?').bind(userId).run()
  await ctx.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
  return new Response(null, {
    status: 204,
    headers: { 'Set-Cookie': 'pantry_session=; Path=/; Max-Age=0; HttpOnly; Secure' },
  })
}

const json = { 'Content-Type': 'application/json' }
