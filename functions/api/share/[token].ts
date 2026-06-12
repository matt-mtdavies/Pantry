import type { Env } from '../../env'

function parseRecipe(row: Record<string, unknown>) {
  return {
    ...row,
    ingredients: JSON.parse((row.ingredients as string) || '[]'),
    steps: JSON.parse((row.steps as string) || '[]'),
    tags: JSON.parse((row.tags as string) || '[]'),
    screenshot_keys: JSON.parse((row.screenshot_keys as string) || '[]'),
    is_favourite: false,
    is_deleted: false,
    needs_attention: false,
  }
}

function generateId(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

// GET /api/share/:token — public, no auth needed
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { token } = ctx.params as { token: string }
  const row = await ctx.env.DB.prepare(
    'SELECT * FROM recipes WHERE share_token = ? AND is_deleted = 0'
  ).bind(token).first<Record<string, unknown>>()

  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(parseRecipe(row)), {
    headers: { 'Content-Type': 'application/json' },
  })
}

// POST /api/share/:token/save — save a shared recipe to the logged-in user's collection
// This is handled by a sub-route file, but we check for /save here too
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url)
  if (!url.pathname.endsWith('/save')) {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const userId = ctx.data.userId as string
  const { token } = ctx.params as { token: string }

  const row = await ctx.env.DB.prepare(
    'SELECT * FROM recipes WHERE share_token = ? AND is_deleted = 0'
  ).bind(token).first<Record<string, unknown>>()

  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const id = generateId()
  const now = Math.floor(Date.now() / 1000)

  await ctx.env.DB.prepare(`
    INSERT INTO recipes (id, user_id, title, description, servings, prep_time, cook_time,
      ingredients, steps, tags, source_guess, screenshot_keys, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, userId,
    row.title,
    row.description ?? null,
    row.servings ?? null,
    row.prep_time ?? null,
    row.cook_time ?? null,
    row.ingredients,
    row.steps,
    row.tags,
    row.source_guess ?? null,
    '[]',
    now, now,
  ).run()

  const saved = await ctx.env.DB.prepare('SELECT * FROM recipes WHERE id = ?').bind(id).first<Record<string, unknown>>()
  return new Response(JSON.stringify(parseRecipe(saved!)), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}
