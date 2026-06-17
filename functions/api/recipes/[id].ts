import type { Env } from '../../env'

function parseRecipe(row: Record<string, unknown>) {
  return {
    ...row,
    ingredients: JSON.parse((row.ingredients as string) || '[]'),
    steps: JSON.parse((row.steps as string) || '[]'),
    tags: JSON.parse((row.tags as string) || '[]'),
    screenshot_keys: JSON.parse((row.screenshot_keys as string) || '[]'),
    is_favourite: row.uf_fav === 1,
    is_deleted: row.is_deleted === 1,
    needs_attention: row.needs_attention === 1,
  }
}

function generateToken(): string {
  const arr = new Uint8Array(12)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const { id } = ctx.params as { id: string }
  const row = await ctx.env.DB.prepare(`
    SELECT r.*,
      u.display_name                                                                  AS author_name,
      u.avatar_id                                                                     AS author_avatar,
      u.avatar_image_key                                                              AS author_avatar_key,
      ROUND(COALESCE(AVG(rr.rating), 0), 1)                                          AS avg_rating,
      COUNT(rr.recipe_id)                                                             AS rating_count,
      (SELECT 1    FROM user_favourites  WHERE user_id = ? AND recipe_id = r.id LIMIT 1) AS uf_fav,
      (SELECT rating FROM recipe_ratings WHERE recipe_id = r.id AND user_id = ?)     AS my_rating
    FROM recipes r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN recipe_ratings rr ON r.id = rr.recipe_id
    WHERE r.id = ? AND r.is_deleted = 0
      AND (r.user_id = ? OR u.is_public = 1)
    GROUP BY r.id
  `).bind(userId, userId, id, userId).first<Record<string, unknown>>()
  if (!row) return json({ error: 'Not found' }, 404)
  return json({
    ...parseRecipe(row),
    author_name: row.author_name,
    author_avatar: row.author_avatar,
    author_avatar_key: row.author_avatar_key ?? null,
    avg_rating: Number(row.avg_rating),
    rating_count: Number(row.rating_count),
    my_rating: row.my_rating != null ? Number(row.my_rating) : null,
  })
}

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const { id } = ctx.params as { id: string }
  const body = await ctx.request.json() as Record<string, unknown>
  const now = Math.floor(Date.now() / 1000)

  const existing = await ctx.env.DB.prepare(
    'SELECT id FROM recipes WHERE id = ? AND user_id = ? AND is_deleted = 0'
  ).bind(id, userId).first()
  if (!existing) return json({ error: 'Not found' }, 404)

  await ctx.env.DB.prepare(`
    UPDATE recipes SET
      title = ?, description = ?, servings = ?, prep_time = ?, cook_time = ?,
      ingredients = ?, steps = ?, tags = ?, source_guess = ?, is_favourite = ?,
      needs_attention = ?, calories_per_serving = ?, cost_per_serving = ?, cost_currency = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).bind(
    body.title ?? 'Untitled',
    body.description ?? null,
    body.servings ?? null,
    body.prep_time ?? null,
    body.cook_time ?? null,
    JSON.stringify(body.ingredients ?? []),
    JSON.stringify(body.steps ?? []),
    JSON.stringify(body.tags ?? []),
    body.source_guess ?? null,
    body.is_favourite ? 1 : 0,
    body.needs_attention ? 1 : 0,
    typeof body.calories_per_serving === 'number' ? body.calories_per_serving : null,
    typeof body.cost_per_serving === 'number' ? body.cost_per_serving : null,
    typeof body.cost_currency === 'string' ? body.cost_currency : 'USD',
    now, id, userId,
  ).run()

  const row = await ctx.env.DB.prepare('SELECT * FROM recipes WHERE id = ?').bind(id).first<Record<string, unknown>>()
  return json(parseRecipe(row!))
}

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const { id } = ctx.params as { id: string }
  const now = Math.floor(Date.now() / 1000)
  await ctx.env.DB.prepare(
    'UPDATE recipes SET is_deleted = 1, updated_at = ? WHERE id = ? AND user_id = ?'
  ).bind(now, id, userId).run()
  return json({ ok: true })
}

// POST /api/recipes/:id/share — handled by sub-route below but we also expose it here
// for the share button via a sub-directory approach
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const { id } = ctx.params as { id: string }
  const url = new URL(ctx.request.url)

  if (!url.pathname.endsWith('/share')) {
    return json({ error: 'Method not allowed' }, 405)
  }

  const row = await ctx.env.DB.prepare(
    'SELECT id, share_token FROM recipes WHERE id = ? AND user_id = ? AND is_deleted = 0'
  ).bind(id, userId).first<{ id: string; share_token: string | null }>()
  if (!row) return json({ error: 'Not found' }, 404)

  let token = row.share_token
  if (!token) {
    token = generateToken()
    await ctx.env.DB.prepare('UPDATE recipes SET share_token = ? WHERE id = ?').bind(token, id).run()
  }

  const host = new URL(ctx.request.url).origin
  return json({ token, url: `${host}/share/${token}` })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
