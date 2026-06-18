import type { Env } from '../../../env'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// POST /api/collections/:id/toggle — add or remove a recipe from a collection
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const { id } = ctx.params as { id: string }

  let recipeId: string
  try {
    const body = await ctx.request.json() as { recipe_id?: string }
    recipeId = (body.recipe_id ?? '').trim()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!recipeId) return json({ error: 'recipe_id is required' }, 400)

  // Verify collection belongs to user
  const col = await ctx.env.DB.prepare(
    'SELECT id FROM collections WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first<{ id: string }>()
  if (!col) return json({ error: 'Not found' }, 404)

  // Verify recipe exists and is accessible (own recipe OR public user's recipe)
  const recipe = await ctx.env.DB.prepare(`
    SELECT r.id FROM recipes r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.id = ? AND r.is_deleted = 0 AND (r.user_id = ? OR u.is_public = 1)
  `).bind(recipeId, userId).first<{ id: string }>()
  if (!recipe) return json({ error: 'Recipe not found' }, 404)

  const existing = await ctx.env.DB.prepare(
    'SELECT 1 FROM recipe_collections WHERE collection_id = ? AND recipe_id = ?'
  ).bind(id, recipeId).first()

  if (existing) {
    await ctx.env.DB.prepare(
      'DELETE FROM recipe_collections WHERE collection_id = ? AND recipe_id = ?'
    ).bind(id, recipeId).run()
    return json({ action: 'removed' })
  } else {
    await ctx.env.DB.prepare(
      'INSERT INTO recipe_collections (collection_id, recipe_id) VALUES (?, ?)'
    ).bind(id, recipeId).run()
    return json({ action: 'added' })
  }
}
