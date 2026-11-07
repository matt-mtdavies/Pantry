import type { Env } from '../env'
import { getCurrency, getCurrencySymbol } from './currency'
import { cleanImportedTitle } from '../../shared/importing'

// Shared recipe extraction (Claude Haiku) for web pages, social captions and
// pasted text. Callers supply the text; this builds the prompt, calls the
// model and normalises the result.

function buildPrompt(currency: string, countryCtx: string): string {
  const priceCtx = countryCtx
    ? `${currency} (${getCurrencySymbol(currency)}) at typical ${countryCtx} supermarket prices`
    : `USD ($) at typical supermarket prices`
  return `You are a recipe extraction assistant. Extract the recipe from the provided text and return ONLY valid JSON — no explanation, no markdown fences, just the JSON object.

Return exactly this schema:
{
  "title": "Recipe name",
  "description": "One or two sentence description of the dish",
  "servings": 4,
  "prep_time": 15,
  "cook_time": 30,
  "ingredients": [
    {"amount": "2", "unit": "cups", "name": "plain flour"},
    {"amount": "1", "unit": "tsp", "name": "salt"}
  ],
  "steps": [
    "First step in full.",
    "Second step in full."
  ],
  "tags": ["baking", "vegetarian"],
  "source_guess": "Name of website, publication or creator",
  "calories_per_serving": 450,
  "cost_per_serving": 3.50
}

Rules:
- All times are in minutes (integers). Use null if unknown.
- servings is an integer. Use null if unknown.
- amounts are strings (e.g. "1½", "2–3", "a handful"). Preserve fractions and ranges as strings.
- unit can be empty string "" if no unit (e.g. "2 eggs" → amount: "2", unit: "", name: "eggs")
- If the text gives no quantity for an ingredient, leave amount and unit as "" — never invent quantities.
- steps should be complete sentences with all the detail from the original. Don't invent steps that aren't there.
- Ignore hashtags, @mentions, sponsor credits and calls to like/follow.
- tags should be lowercase, short, helpful (e.g. dinner, baking, quick, vegetarian, chicken, pasta). Always include one cuisine tag if identifiable (e.g. italian, greek, indian, mexican, japanese, thai, french, chinese, spanish, turkish, american, british, vietnamese, korean, moroccan, lebanese, mediterranean). Omit a cuisine tag only if the dish genuinely has no clear single cuisine identity.
- calories_per_serving: integer, estimated kcal per serving based on the ingredients. Use null if you cannot estimate.
- cost_per_serving: float, estimated ingredient cost per serving in ${priceCtx}. Use null if you cannot estimate.
- If the text doesn't contain a recipe (at least some ingredients or steps), return: {"error": "No recipe found"}`
}

export async function userCurrencyCtx(env: Env, userId: string | undefined) {
  if (!userId) return { currency: 'USD', countryCtx: '' }
  const row = await env.DB.prepare('SELECT country FROM users WHERE id = ?').bind(userId).first<{ country: string | null }>()
  return row?.country ? { currency: getCurrency(row.country), countryCtx: row.country } : { currency: 'USD', countryCtx: '' }
}

export type ExtractResult =
  | { ok: true; recipe: Record<string, unknown> }
  | { ok: false; status: number; error: string; code?: string }

/** Run the model over `content` (already labelled with its source by the caller). */
export async function extractRecipe(env: Env, opts: {
  content: string
  currency: string
  countryCtx: string
  sourceUrl: string | null
  sourceImageUrl?: string | null
  sourceGuess?: string | null
}): Promise<ExtractResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: `${buildPrompt(opts.currency, opts.countryCtx)}\n\n${opts.content}` }],
    }),
  })
  if (!res.ok) {
    console.error('[extractRecipe] model error:', await res.text())
    return { ok: false, status: 502, error: 'Recipe extraction failed. Please try again.' }
  }
  const data = await res.json() as { content?: Array<{ text: string }> }
  const text = data.content?.[0]?.text ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  let x: Record<string, unknown>
  try { x = JSON.parse(match?.[0] ?? '') } catch {
    return { ok: false, status: 422, error: 'Could not read a recipe from that.', code: 'no_recipe' }
  }
  if (x.error) return { ok: false, status: 422, error: String(x.error), code: 'no_recipe' }

  const sourceGuess = x.source_guess ? String(x.source_guess) : (opts.sourceGuess ?? null)
  return {
    ok: true,
    recipe: {
      title: cleanImportedTitle(String(x.title ?? 'Untitled'), opts.sourceUrl, sourceGuess),
      description: String(x.description ?? ''),
      servings: typeof x.servings === 'number' ? x.servings : null,
      prep_time: typeof x.prep_time === 'number' ? x.prep_time : null,
      cook_time: typeof x.cook_time === 'number' ? x.cook_time : null,
      ingredients: Array.isArray(x.ingredients) ? x.ingredients : [],
      steps: Array.isArray(x.steps) ? x.steps.map(String) : [],
      tags: Array.isArray(x.tags) ? x.tags.map(String) : [],
      source_guess: sourceGuess,
      source_url: opts.sourceUrl,
      source_image_url: opts.sourceImageUrl ?? null,
      calories_per_serving: typeof x.calories_per_serving === 'number' ? Math.round(x.calories_per_serving) : null,
      cost_per_serving: typeof x.cost_per_serving === 'number' ? x.cost_per_serving : null,
      cost_currency: opts.currency,
    },
  }
}
