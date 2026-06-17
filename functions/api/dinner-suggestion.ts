import type { Env } from '../env'
import { checkRateLimit } from '../lib/rateLimit'
import { logAiUsage } from '../lib/logAiUsage'

const DAILY_SUGGESTION_LIMIT = 5
const ONE_DAY_SECONDS = 86_400

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
  calories_per_serving: number | null
  cost_per_serving: number | null
  cost_currency: string
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string | undefined
  if (userId) {
    const allowed = await checkRateLimit(ctx.env.DB, `dinner:${userId}`, DAILY_SUGGESTION_LIMIT, ONE_DAY_SECONDS)
    if (!allowed) {
      return json({ error: `You've reached the daily limit of ${DAILY_SUGGESTION_LIMIT} dinner suggestions. Try again tomorrow.` }, 429)
    }
  }

  const body = await ctx.request.json() as {
    ingredients?: string[]
    mode?: 'match' | 'create'
  }

  const ingredients = body.ingredients ?? []
  const mode = body.mode ?? 'create'

  const ingredientStr = ingredients.length > 0
    ? ingredients.join(', ')
    : 'any common pantry staples you like'

  const shoppingNote = mode === 'create'
    ? 'The user is happy to shop for extra ingredients — include these in shopping_list.'
    : 'Use ONLY the listed ingredients — set shopping_list to [].'

  const recipeSchema = `{"title":"string","description":"1-2 sentence description","servings":2,"prep_time":15,"cook_time":30,"ingredients":[{"amount":"200","unit":"g","name":"ingredient"}],"steps":["step text"],"tags":["tag"],"shopping_list":[],"calories_per_serving":450,"cost_per_serving":3.50,"cost_currency":"USD"}`

  const prompt = `You are a creative chef assistant. Generate exactly 3 different delicious recipe ideas.
Available ingredients: ${ingredientStr}.
${shoppingNote}
Make the 3 recipes clearly different — vary cuisines, cooking styles, or main protein.
Each recipe serves 2 people.

Respond with ONLY a valid JSON object (no markdown, no code fences, no explanation):
{"recipes":[${recipeSchema},${recipeSchema},${recipeSchema}]}`

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
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!aiRes.ok) {
      return json({ error: 'Failed to generate recipes' }, 500)
    }

    const aiData = await aiRes.json() as { content: Array<{ text: string }> }
    const raw = aiData.content?.[0]?.text ?? ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return json({ error: 'Could not parse generated recipes' }, 500)
    const parsed = JSON.parse(jsonMatch[0]) as { recipes: GeneratedRecipe[] }
    await logAiUsage(ctx.env.DB, 'dinner')
    return json({ recipes: parsed.recipes ?? [] })
  } catch {
    return json({ error: 'Failed to generate recipes' }, 500)
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
