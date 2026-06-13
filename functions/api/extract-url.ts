import type { Env } from '../env'

const EXTRACTION_PROMPT = `You are a recipe extraction assistant. Extract the recipe from the provided webpage text and return ONLY valid JSON — no explanation, no markdown fences, just the JSON object.

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
  "source_guess": "Name of website or publication"
}

Rules:
- All times are in minutes (integers). Use null if unknown.
- servings is an integer. Use null if unknown.
- amounts are strings (e.g. "1½", "2–3", "a handful"). Preserve fractions and ranges as strings.
- unit can be empty string "" if no unit (e.g. "2 eggs" → amount: "2", unit: "", name: "eggs")
- steps should be complete sentences with all the detail from the original
- tags should be lowercase, short, helpful (e.g. dinner, baking, quick, vegetarian, chicken, pasta)
- If the page doesn't contain a recipe, return: {"error": "No recipe found on this page"}`

interface ClaudeMessage {
  content: Array<{ text: string }>
}

function extractOgImage(html: string): string | null {
  const m = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
  return m ? m[1] : null
}

function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 30000)
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let url: string
  try {
    const body = await ctx.request.json() as { url?: string }
    url = (body.url ?? '').trim()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!url) return json({ error: 'URL is required' }, 400)

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('invalid protocol')
    }
  } catch {
    return json({ error: 'Please enter a valid URL (starting with http:// or https://)' }, 400)
  }

  if (!ctx.env.ANTHROPIC_API_KEY) {
    return json({ error: 'AI extraction not configured' }, 503)
  }

  let pageText: string
  let sourceImageUrl: string | null = null
  try {
    const pageRes = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })
    if (!pageRes.ok) {
      return json({ error: `Couldn't fetch that page (${pageRes.status}). Check the URL and try again.` }, 422)
    }
    const contentType = pageRes.headers.get('Content-Type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return json({ error: "That URL doesn't look like a webpage with a recipe." }, 422)
    }
    const html = await pageRes.text()
    sourceImageUrl = extractOgImage(html)
    pageText = cleanHtml(html)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[extract-url] fetch error:', msg)
    return json({ error: "Couldn't reach that URL. Check it and try again." }, 422)
  }

  if (!pageText.length) {
    return json({ error: 'Page appears to be empty.' }, 422)
  }

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ctx.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `${EXTRACTION_PROMPT}\n\nPage URL: ${parsedUrl.toString()}\n\nPage content:\n${pageText}`,
      }],
    }),
  })

  if (!claudeRes.ok) {
    const err = await claudeRes.text()
    console.error('[extract-url] Claude API error:', err)
    return json({ error: 'AI extraction failed. Please try again.' }, 502)
  }

  const claudeData = await claudeRes.json() as ClaudeMessage
  const text = claudeData.content?.[0]?.text ?? ''

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return json({ error: 'Could not parse recipe from that page.' }, 422)
  }

  let extracted: Record<string, unknown>
  try {
    extracted = JSON.parse(jsonMatch[0])
  } catch {
    return json({ error: 'Could not parse recipe from that page.' }, 422)
  }

  if (extracted.error) {
    return json({ error: String(extracted.error) }, 422)
  }

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
    source_image_url: sourceImageUrl,
  })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
