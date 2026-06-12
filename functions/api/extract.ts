import type { Env } from '../env'

const EXTRACTION_PROMPT = `You are a recipe extraction assistant. Extract the recipe from the provided screenshot(s) and return ONLY valid JSON — no explanation, no markdown fences, just the JSON object.

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
  "source_guess": "Name of website or publication if visible, otherwise null"
}

Rules:
- All times are in minutes (integers). Use null if unknown.
- servings is an integer. Use null if unknown.
- amounts are strings (e.g. "1½", "2–3", "a handful"). Preserve fractions and ranges as strings.
- unit can be empty string "" if no unit (e.g. "2 eggs" → amount: "2", unit: "", name: "eggs")
- steps should be complete sentences with all the detail from the original
- tags should be lowercase, short, helpful (e.g. dinner, baking, quick, vegetarian, chicken, pasta)
- If you cannot read the image or it doesn't contain a recipe, return: {"error": "Cannot extract recipe from this image"}`

interface ClaudeMessage {
  content: Array<{ text: string }>
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

  // Convert images to base64 for Claude
  const imageContents: unknown[] = []
  for (const file of screenshots.slice(0, 4)) { // max 4 screenshots
    const buffer = await file.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    imageContents.push({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: base64 },
    })
  }

  imageContents.push({ type: 'text', text: EXTRACTION_PROMPT })

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
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
  })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
