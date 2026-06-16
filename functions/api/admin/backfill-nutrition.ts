import type { Env } from '../../env'
import { getCurrency, getCurrencySymbol } from '../../lib/currency'
import { checkRateLimit } from '../../lib/rateLimit'

interface ClaudeMessage {
  content: Array<{ text: string }>
}

interface RecipeRow {
  id: string
  title: string
  ingredients: string
  servings: number | null
}

interface NutritionEstimate {
  calories_per_serving: number | null
  cost_per_serving: number | null
}

async function estimateNutrition(
  apiKey: string,
  title: string,
  ingredients: string,
  servings: number | null,
  currency: string,
  country: string,
): Promise<NutritionEstimate> {
  const priceCtx = country
    ? `${currency} (${getCurrencySymbol(currency)}) at typical ${country} supermarket prices`
    : 'USD ($) at typical supermarket prices'

  const prompt = `Estimate the nutritional value and cost for this recipe. Return ONLY valid JSON, no explanation.

Recipe: ${title}
Servings: ${servings ?? 'unknown'}
Ingredients:
${ingredients}

Return exactly:
{
  "calories_per_serving": 450,
  "cost_per_serving": 3.50
}

Rules:
- calories_per_serving: integer, estimated kcal per serving. Use null if you truly cannot estimate.
- cost_per_serving: float, estimated total ingredient cost per serving in ${priceCtx}. Use null if you truly cannot estimate.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) return { calories_per_serving: null, cost_per_serving: null }

  const data = await res.json() as ClaudeMessage
  const text = data.content?.[0]?.text ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return { calories_per_serving: null, cost_per_serving: null }

  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>
    return {
      calories_per_serving: typeof parsed.calories_per_serving === 'number' ? Math.round(parsed.calories_per_serving) : null,
      cost_per_serving: typeof parsed.cost_per_serving === 'number' ? parsed.cost_per_serving : null,
    }
  } catch {
    return { calories_per_serving: null, cost_per_serving: null }
  }
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const userEmail = ctx.data.email as string

  // If ADMIN_EMAILS is configured, only those accounts can trigger expensive AI operations
  if (ctx.env.ADMIN_EMAILS) {
    const admins = ctx.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase())
    if (!admins.includes(userEmail.toLowerCase())) {
      return json({ error: 'Forbidden' }, 403)
    }
  }

  // Rate limit: 5 backfill calls per hour per user
  const allowed = await checkRateLimit(ctx.env.DB, `backfill-nutrition:${userId}`, 5, 60 * 60)
  if (!allowed) return json({ error: 'Too many requests. Please wait before running again.' }, 429)

  if (!ctx.env.ANTHROPIC_API_KEY) {
    return json({ error: 'AI not configured' }, 503)
  }

  // Get user's country for currency context
  const userRow = await ctx.env.DB.prepare('SELECT country FROM users WHERE id = ?')
    .bind(userId).first<{ country: string | null }>()
  const country = userRow?.country ?? ''
  const currency = getCurrency(country)

  // Find recipes missing calories or cost (limit to 20 per call)
  const { results } = await ctx.env.DB.prepare(`
    SELECT id, title, ingredients, servings
    FROM recipes
    WHERE user_id = ? AND is_deleted = 0
      AND (calories_per_serving IS NULL OR cost_per_serving IS NULL)
    ORDER BY updated_at DESC
    LIMIT 20
  `).bind(userId).all<RecipeRow>()

  if (!results.length) {
    return json({ updated: 0, message: 'All recipes already have estimates' })
  }

  // Process in parallel (up to 5 at a time to avoid rate limits)
  const BATCH = 5
  let updated = 0

  for (let i = 0; i < results.length; i += BATCH) {
    const batch = results.slice(i, i + BATCH)
    const estimates = await Promise.allSettled(
      batch.map(r => {
        const ingredientLines = (() => {
          try {
            const ings = JSON.parse(r.ingredients) as Array<{ amount: string; unit: string; name: string }>
            return ings.map(ing => `${ing.amount} ${ing.unit} ${ing.name}`.trim()).join('\n')
          } catch {
            return ''
          }
        })()
        return estimateNutrition(ctx.env.ANTHROPIC_API_KEY!, r.title, ingredientLines, r.servings, currency, country)
      })
    )

    for (let j = 0; j < batch.length; j++) {
      const result = estimates[j]
      if (result.status !== 'fulfilled') continue
      const { calories_per_serving, cost_per_serving } = result.value
      if (calories_per_serving == null && cost_per_serving == null) continue

      const recipe = batch[j]
      await ctx.env.DB.prepare(`
        UPDATE recipes SET
          calories_per_serving = COALESCE(calories_per_serving, ?),
          cost_per_serving = COALESCE(cost_per_serving, ?),
          cost_currency = CASE WHEN cost_per_serving IS NULL THEN ? ELSE cost_currency END
        WHERE id = ? AND user_id = ?
      `).bind(
        calories_per_serving,
        cost_per_serving,
        currency,
        recipe.id,
        userId,
      ).run()
      updated++
    }
  }

  const remaining = results.length - updated
  return json({
    updated,
    remaining_in_batch: remaining,
    has_more: results.length === 20,
    message: updated === 0
      ? 'Could not estimate for these recipes'
      : `Updated ${updated} recipe${updated !== 1 ? 's' : ''} with estimates`,
  })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
