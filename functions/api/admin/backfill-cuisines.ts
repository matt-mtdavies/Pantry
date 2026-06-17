import type { Env } from '../../env'

const CUISINES = [
  'italian', 'greek', 'indian', 'mexican', 'japanese', 'thai', 'french',
  'chinese', 'spanish', 'turkish', 'american', 'british', 'vietnamese',
  'korean', 'moroccan', 'lebanese', 'persian', 'mediterranean',
]

const BATCH = 20

interface ClaudeMessage {
  content: Array<{ text: string }>
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.ANTHROPIC_API_KEY) {
    return json({ error: 'AI not configured' }, 503)
  }

  // Find recipes with none of the known cuisine tags
  const noCuisineConditions = CUISINES.map(() => `tags NOT LIKE ?`).join(' AND ')
  const noCuisineBinds = CUISINES.map(c => `%"${c}"%`)

  const rows = await ctx.env.DB.prepare(
    `SELECT id, title, tags, ingredients FROM recipes
     WHERE is_deleted = 0 AND ${noCuisineConditions}
     LIMIT ?`
  ).bind(...noCuisineBinds, BATCH).all<{ id: string; title: string; tags: string; ingredients: string }>()

  const recipes = rows.results ?? []
  if (!recipes.length) {
    return json({ updated: 0, has_more: false, message: 'All recipes already have a cuisine tag.' })
  }

  let updated = 0
  const errors: string[] = []

  for (const recipe of recipes) {
    const existingTags: string[] = JSON.parse(recipe.tags || '[]')
    const ingredients: Array<{ name: string }> = JSON.parse(recipe.ingredients || '[]')
    const ingredientNames = ingredients.slice(0, 6).map(i => i.name).join(', ')

    const prompt = `Identify the cuisine of this recipe and return ONLY valid JSON — no explanation, no markdown.

Return exactly: {"cuisine": "italian"} or {"cuisine": null} if genuinely ambiguous.

Known cuisines to choose from: ${CUISINES.join(', ')}

Recipe: ${recipe.title}
Tags: ${existingTags.join(', ')}
Main ingredients: ${ingredientNames}`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: AbortSignal.timeout(15_000),
        headers: {
          'x-api-key': ctx.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 32,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!res.ok) continue

      const data = await res.json() as ClaudeMessage
      const text = data.content?.[0]?.text ?? ''
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) continue

      const parsed = JSON.parse(match[0]) as { cuisine?: string | null }
      const cuisine = typeof parsed.cuisine === 'string' ? parsed.cuisine.toLowerCase().trim() : null

      if (!cuisine || !CUISINES.includes(cuisine)) continue

      const newTags = JSON.stringify([...existingTags, cuisine])
      await ctx.env.DB.prepare(
        'UPDATE recipes SET tags = ?, updated_at = ? WHERE id = ?'
      ).bind(newTags, Math.floor(Date.now() / 1000), recipe.id).run()

      updated++
    } catch (e) {
      errors.push(`${recipe.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const has_more = recipes.length === BATCH
  return json({
    updated,
    has_more,
    message: has_more
      ? `Updated ${updated} recipes. Run again — more remain.`
      : `Done. Updated ${updated} recipes.`,
    errors: errors.length ? errors : undefined,
  })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
