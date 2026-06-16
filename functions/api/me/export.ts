import type { Env } from '../../env'

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string

  const [userRow, recipesRes] = await Promise.all([
    ctx.env.DB.prepare('SELECT email, display_name, country, created_at FROM users WHERE id = ?')
      .bind(userId).first<Record<string, unknown>>(),
    ctx.env.DB.prepare(
      'SELECT * FROM recipes WHERE user_id = ? AND is_deleted = 0 ORDER BY created_at DESC'
    ).bind(userId).all<Record<string, unknown>>(),
  ])

  const recipes = (recipesRes.results ?? []).map(r => ({
    ...r,
    ingredients: JSON.parse((r.ingredients as string) || '[]'),
    steps: JSON.parse((r.steps as string) || '[]'),
    tags: JSON.parse((r.tags as string) || '[]'),
    screenshot_keys: JSON.parse((r.screenshot_keys as string) || '[]'),
  }))

  const payload = {
    exported_at: new Date().toISOString(),
    user: userRow,
    recipe_count: recipes.length,
    recipes,
  }

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="pantry-export-${new Date().toISOString().split('T')[0]}.json"`,
    },
  })
}
