import type { Env } from '../../env'

function generateId(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

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

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  try {
    const { results } = await ctx.env.DB.prepare(`
      SELECT r.*,
        (SELECT 1 FROM user_favourites WHERE user_id = ? AND recipe_id = r.id LIMIT 1) AS uf_fav
      FROM recipes r
      WHERE r.user_id = ? AND r.is_deleted = 0

      UNION ALL

      SELECT r.*, 1 AS uf_fav
      FROM recipes r
      JOIN user_favourites uf ON uf.recipe_id = r.id AND uf.user_id = ?
      JOIN users u ON r.user_id = u.id
      WHERE r.user_id != ? AND r.is_deleted = 0 AND u.is_public = 1

      ORDER BY updated_at DESC
    `).bind(userId, userId, userId, userId).all<Record<string, unknown>>()
    return json(results.map(parseRecipe))
  } catch {
    // user_favourites not yet created — fall back to legacy column
    const { results } = await ctx.env.DB.prepare(
      'SELECT * FROM recipes WHERE user_id = ? AND is_deleted = 0 ORDER BY updated_at DESC'
    ).bind(userId).all<Record<string, unknown>>()
    return json(results.map(r => parseRecipe({ ...r, uf_fav: r.is_favourite })))
  }
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const body = await ctx.request.json() as Record<string, unknown>

  const id = generateId()
  const now = Math.floor(Date.now() / 1000)

  await ctx.env.DB.prepare(`
    INSERT INTO recipes (id, user_id, title, description, servings, prep_time, cook_time,
      ingredients, steps, tags, source_guess, source_url, screenshot_keys, needs_attention,
      calories_per_serving, cost_per_serving, cost_currency, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, userId,
    body.title ?? 'Untitled',
    body.description ?? null,
    body.servings ?? null,
    body.prep_time ?? null,
    body.cook_time ?? null,
    JSON.stringify(body.ingredients ?? []),
    JSON.stringify(body.steps ?? []),
    JSON.stringify(body.tags ?? []),
    body.source_guess ?? null,
    typeof body.source_url === 'string' ? body.source_url : null,
    JSON.stringify(body.screenshot_keys ?? []),
    body.needs_attention ? 1 : 0,
    typeof body.calories_per_serving === 'number' ? body.calories_per_serving : null,
    typeof body.cost_per_serving === 'number' ? body.cost_per_serving : null,
    typeof body.cost_currency === 'string' ? body.cost_currency : 'USD',
    now, now,
  ).run()

  const row = await ctx.env.DB.prepare('SELECT * FROM recipes WHERE id = ?').bind(id).first<Record<string, unknown>>()
  return json(parseRecipe(row!), 201)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
