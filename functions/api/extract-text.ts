import type { Env } from '../env'
import { checkRateLimit } from '../lib/rateLimit'
import { logAiUsage } from '../lib/logAiUsage'
import { extractRecipe, userCurrencyCtx } from '../lib/extractRecipe'
import { detectSource, SOURCE_NAME } from '../lib/social'

// POST /api/extract-text { text, source_url? }
// Import from pasted text — a caption copied from Instagram or TikTok, a
// recipe from a message or email. Same model, prompt and limits as URL import.

const DAILY_EXTRACTION_LIMIT = 10
const ONE_DAY_SECONDS = 86_400
const MIN_CHARS = 30
const MAX_CHARS = 15_000

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let text: string, sourceUrl: string | null = null
  try {
    const body = await ctx.request.json() as { text?: string; source_url?: string }
    text = (body.text ?? '').trim()
    if (body.source_url) {
      const u = new URL(body.source_url)
      if (u.protocol === 'http:' || u.protocol === 'https:') sourceUrl = u.toString()
    }
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (text.length < MIN_CHARS) return json({ error: 'Paste a bit more — at least the ingredients or the steps.' }, 400)
  if (text.length > MAX_CHARS) return json({ error: `That's too long to import in one go (max ${MAX_CHARS.toLocaleString()} characters).` }, 400)
  if (!ctx.env.ANTHROPIC_API_KEY) return json({ error: 'AI extraction not configured' }, 503)

  const userId = ctx.data.userId as string | undefined
  if (userId) {
    const allowed = await checkRateLimit(ctx.env.DB, `extract:${userId}`, DAILY_EXTRACTION_LIMIT, ONE_DAY_SECONDS)
    if (!allowed) return json({ error: `You've reached the daily limit of ${DAILY_EXTRACTION_LIMIT} recipe imports. Try again tomorrow.` }, 429)
  }

  const source = sourceUrl ? detectSource(new URL(sourceUrl)) : null
  const { currency, countryCtx } = await userCurrencyCtx(ctx.env, userId)
  const result = await extractRecipe(ctx.env, {
    content: `Source: text pasted by the user${source && source !== 'web' ? ` (copied from ${SOURCE_NAME[source]})` : ''}.\n\nText:\n${text}`,
    currency, countryCtx,
    sourceUrl,
    sourceGuess: source && source !== 'web' ? SOURCE_NAME[source] : null,
  })
  if (!result.ok) {
    return json({ error: result.code === 'no_recipe' ? "We couldn't find a recipe in that text." : result.error, code: result.code }, result.status)
  }

  await logAiUsage(ctx.env.DB, 'text')
  return json({ ...result.recipe, import_source: 'text' })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}
