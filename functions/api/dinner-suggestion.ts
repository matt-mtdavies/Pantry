import type { Env } from '../env'

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string

  const body = await ctx.request.json() as { ingredients?: string; servings?: number }
  const rawIngredients = body.ingredients ?? ''
  const servings = body.servings

  // Parse ingredients by splitting on commas/newlines, trim + lowercase, filter empty
  const ingredients = rawIngredients
    .split(/[,\n]/)
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)

  if (ingredients.length === 0) {
    return json({ recipes: [] })
  }

  // Build WHERE clauses
  const wheres: string[] = ['u.is_public = 1', 'r.is_deleted = 0']
  const binds: (string | number)[] = [userId] // for my_rating subquery

  // OR'd ingredient LIKE conditions
  const ingredientConditions = ingredients.map(() => `LOWER(r.ingredients) LIKE ?`)
  wheres.push(`(${ingredientConditions.join(' OR ')})`)

  // Optional servings filter
  if (servings != null && servings > 0) {
    wheres.push(`r.servings >= ${Math.floor(servings * 0.5)} AND r.servings <= ${Math.ceil(servings * 2)}`)
  }

  // Ingredient LIKE bind values (after userId)
  const ingredientBinds = ingredients.map((term: string) => `%${term}%`)

  const rows = await ctx.env.DB.prepare(`
    SELECT
      r.id, r.title, r.description, r.tags, r.hero_image_key,
      r.prep_time, r.cook_time, r.servings, r.user_id,
      r.calories_per_serving, r.cost_per_serving, r.cost_currency,
      u.display_name                                                              AS author_name,
      u.avatar_id                                                                 AS author_avatar,
      ROUND(COALESCE(AVG(rr.rating), 0), 1)                                      AS avg_rating,
      COUNT(rr.recipe_id)                                                         AS rating_count,
      (SELECT rating FROM recipe_ratings WHERE recipe_id = r.id AND user_id = ?) AS my_rating
    FROM recipes r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN recipe_ratings rr ON r.id = rr.recipe_id
    WHERE ${wheres.join(' AND ')}
    GROUP BY r.id
    ORDER BY avg_rating DESC, rating_count DESC
    LIMIT 12
  `).bind(...binds, ...ingredientBinds).all<Record<string, unknown>>()

  const results = (rows.results ?? []).map(r => ({
    ...r,
    tags: JSON.parse((r.tags as string) || '[]'),
    avg_rating: Number(r.avg_rating),
    rating_count: Number(r.rating_count),
    my_rating: r.my_rating != null ? Number(r.my_rating) : null,
  }))

  return json({ recipes: results })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
