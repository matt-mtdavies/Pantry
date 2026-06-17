import type { Env } from '../env'
import { getCurrency, getCurrencySymbol } from '../lib/currency'
import { checkRateLimit } from '../lib/rateLimit'

const DAILY_EXTRACTION_LIMIT = 10
const ONE_DAY_SECONDS = 86_400

function buildPrompt(currency: string, countryCtx: string): string {
  const priceCtx = countryCtx
    ? `${currency} (${getCurrencySymbol(currency)}) at typical ${countryCtx} supermarket prices`
    : `USD ($) at typical supermarket prices`
  return `You are a recipe extraction assistant. Extract the recipe from the provided screenshot(s) and return ONLY valid JSON — no explanation, no markdown fences, just the JSON object.

If multiple screenshots are provided, they show different parts of the same recipe — merge them into one complete recipe.

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
  "source_guess": "Name of website or publication if visible, otherwise null",
  "calories_per_serving": 450,
  "cost_per_serving": 3.50,
  "food_image_index": 0
}

Rules:
- All times are in minutes (integers). Use null if unknown.
- servings is an integer. Use null if unknown.
- amounts are strings (e.g. "1½", "2–3", "a handful"). Preserve fractions and ranges as strings.
- unit can be empty string "" if no unit (e.g. "2 eggs" → amount: "2", unit: "", name: "eggs")
- steps should be complete sentences with all the detail from the original
- tags should be lowercase, short, helpful (e.g. dinner, baking, quick, vegetarian, chicken, pasta). Always include one cuisine tag if identifiable (e.g. italian, greek, indian, mexican, japanese, thai, french, chinese, spanish, turkish, american, british, vietnamese, korean, moroccan, lebanese, mediterranean). Omit a cuisine tag only if the dish genuinely has no clear single cuisine identity.
- calories_per_serving: integer, estimated kcal per serving based on the ingredients. Use null if you cannot estimate.
- cost_per_serving: float, estimated ingredient cost per serving in ${priceCtx}. Use null if you cannot estimate.
- food_image_index: 0-based index of whichever provided image best shows the finished dish as an actual food photograph (not a screenshot of text, a webpage, a receipt, or a recipe card — only genuine food/meal photography). Use null if none of the images show actual cooked food.
- If you cannot read the image or it doesn't contain a recipe, return: {"error": "Cannot extract recipe from this image"}`
}

interface ClaudeMessage {
  content: Array<{ text: string }>
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  }
  return btoa(binary)
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const formData = await ctx.request.formData()
  const screenshots = formData.getAll('screenshots') as File[]

  if (!screenshots.length) {
    return json({ error: 'No screenshots provided' }, 400)
  }

  if (!ctx.env.ANTHROPIC_API_KEY) {
    return json({ error: 'AI extraction not configured' }, 503)
  }

  const userId = ctx.data.userId as string | undefined

  if (userId) {
    const allowed = await checkRateLimit(ctx.env.DB, `extract:${userId}`, DAILY_EXTRACTION_LIMIT, ONE_DAY_SECONDS)
    if (!allowed) {
      return json({ error: `You've reached the daily limit of ${DAILY_EXTRACTION_LIMIT} recipe imports. Try again tomorrow.` }, 429)
    }
  }

  // Determine user's currency from their country
  let currency = 'USD'
  let countryCtx = ''
  if (userId) {
    const userRow = await ctx.env.DB.prepare('SELECT country FROM users WHERE id = ?')
      .bind(userId).first<{ country: string | null }>()
    if (userRow?.country) {
      currency = getCurrency(userRow.country)
      countryCtx = userRow.country
    }
  }

  // Convert images to base64 for Claude (max 10 screenshots)
  const imageContents: unknown[] = []
  for (const file of screenshots.slice(0, 10)) {
    const buffer = await file.arrayBuffer()
    const base64 = toBase64(buffer)
    const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    imageContents.push({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: base64 },
    })
  }

  imageContents.push({ type: 'text', text: buildPrompt(currency, countryCtx) })

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(60_000),
    headers: {
      'x-api-key': ctx.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: imageContents,
      }],
    }),
  })

  if (!claudeRes.ok) {
    const err = await claudeRes.text()
    console.error('Claude API error:', err)
    return json({ error: 'AI extraction failed. Please try again.' }, 502)
  }

  const claudeData = await claudeRes.json() as ClaudeMessage
  const text = claudeData.content?.[0]?.text ?? ''

  // Extract JSON from response (Claude sometimes wraps in text)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return json({ error: 'Could not parse recipe from screenshot' }, 422)
  }

  let extracted: Record<string, unknown>
  try {
    extracted = JSON.parse(jsonMatch[0])
  } catch {
    return json({ error: 'Could not parse recipe from screenshot' }, 422)
  }

  if (extracted.error) {
    return json({ error: extracted.error }, 422)
  }

  // Sanitise and return
  return json({
    title: String(extracted.title ?? 'Untitled'),
    description: String(extracted.description ?? ''),
    servings: typeof extracted.servings === 'number' ? extracted.servings : null,
    prep_time: typeof extracted.prep_time === 'number' ? extracted.prep_time : null,
    cook_time: typeof extracted.cook_time === 'number' ? extracted.cook_time : null,
    ingredients: Array.isArray(extracted.ingredients) ? extracted.ingredients : [],
    steps: Array.isArray(extracted.steps) ? extracted.steps.map(String) : [],
    tags: Array.isArray(extracted.tags) ? extracted.tags.map(String) : [],
    source_guess: extracted.source_guess ? String(extracted.source_guess) : null,
    calories_per_serving: typeof extracted.calories_per_serving === 'number' ? Math.round(extracted.calories_per_serving) : null,
    cost_per_serving: typeof extracted.cost_per_serving === 'number' ? extracted.cost_per_serving : null,
    cost_currency: currency,
    food_image_index: typeof extracted.food_image_index === 'number' ? extracted.food_image_index : null,
  })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
