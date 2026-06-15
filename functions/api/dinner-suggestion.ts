import type { Env } from '../env.d'

interface GeneratedRecipe {
  title: string
  description: string
  servings: number
  prep_time: number
  cook_time: number
  ingredients: Array<{ amount: string; unit: string; name: string }>
  steps: string[]
  tags: string[]
  shopping_list: string[]
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const body = await ctx.request.json() as {
    ingredients?: string
    servings?: number
    mode?: 'match' | 'create'
  }

  const rawIngredients = body.ingredients ?? ''
  const servings = body.servings ?? 2
  const mode = body.mode ?? 'match'

  const ingredientList = rawIngredients
    .split(/[,\n]/)
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)

  if (ingredientList.length === 0) {
    return json({ type: 'matched', recipes: [] })
  }

  if (mode === 'create') {
    const prompt = `You are a creative chef assistant. Create a single delicious recipe using these ingredients as a starting point: ${ingredientList.join(', ')}.

The user is happy to shop for additional ingredients. Aim for ${servings} servings.

Respond with ONLY a valid JSON object (no markdown, no code fences, no explanation) with this exact structure:
{
  "title": "Recipe name",
  "description": "Brief appealing description (1-2 sentences)",
  "servings": ${servings},
  "prep_time": 15,
  "cook_time": 30,
  "ingredients": [
    { "amount": "200", "unit": "g", "name": "ingredient name" }
  ],
  "steps": [
    "Step description"
  ],
  "tags": ["tag1", "tag2"],
  "shopping_list": ["extra item the user needs to buy"]
}`

    try {
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ctx.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!aiRes.ok) {
        return json({ error: 'Failed to generate recipe' }, 500)
      }

      const aiData = await aiRes.json() as { content: Array<{ text: string }> }
      const text = (aiData.content?.[0]?.text ?? '').trim()
      const generated = JSON.parse(text) as GeneratedRecipe
      return json({ type: 'created', recipe: generated })
    } catch {
      return json({ error: 'Failed to generate recipe' }, 500)
    }
  }

  // mode === 'match': SQL ingredient matching
  const wheres: string[] = ['u.is_public = 1', 'r.is_deleted = 0']
  const binds: (string | number)[] = [userId]

  const ingredientConditions = ingredientList.map(() => `LOWER(r.ingredients) LIKE ?`)
  wheres.push(`(${ingredientConditions.join(' OR ')})`)

  if (servings > 0) {
    wheres.push(`r.servings >= ${Math.floor(servings * 0.5)} AND r.servings <= ${Math.ceil(servings * 2)}`)
  }

  const ingredientBinds = ingredientList.map((term: string) => `%${term}%`)

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

  return json({ type: 'matched', recipes: results })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
