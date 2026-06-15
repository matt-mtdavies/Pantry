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

  const prompt = mode === 'create'
    ? `You are a creative chef assistant. Create a single delicious recipe using these ingredients as a starting point: ${ingredientList.join(', ')}.

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
    : `You are a creative chef assistant. Create a single delicious recipe using ONLY these available ingredients: ${ingredientList.join(', ')}.

Do not require any other ingredients. Aim for ${servings} servings.

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
  "shopping_list": []
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

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
