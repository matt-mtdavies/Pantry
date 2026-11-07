import type { Env } from '../env'
import { checkRateLimit } from '../lib/rateLimit'
import { logAiUsage } from '../lib/logAiUsage'
import { extractRecipe, userCurrencyCtx } from '../lib/extractRecipe'
import {
  detectSource, readSocial, findLinks, recipeSignal, metaContent, recipeJsonLd, decodeEntities,
  SOURCE_NAME, BROWSER_UA, type ImportSource,
} from '../lib/social'

const DAILY_EXTRACTION_LIMIT = 10
const ONE_DAY_SECONDS = 86_400

function cleanHtml(html: string): string {
  return decodeEntities(html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 30000)
}

type PageResult =
  | { ok: true; content: string; imageUrl: string | null; finalUrl: string }
  | { ok: false; status: number; error: string }

/** Fetch a web page and turn it into model input: Recipe JSON-LD first (most sites have it), then the visible text. */
async function readWebPage(url: string): Promise<PageResult> {
  let res: Response
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': BROWSER_UA, 'Accept': 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    })
  } catch (err) {
    console.error('[extract-url] fetch error:', err instanceof Error ? err.message : err)
    return { ok: false, status: 422, error: "Couldn't reach that URL. Check it and try again." }
  }
  if (!res.ok) return { ok: false, status: 422, error: `Couldn't fetch that page (${res.status}). Check the URL and try again.` }
  const type = res.headers.get('Content-Type') ?? ''
  if (!type.includes('text/html') && !type.includes('application/xhtml')) {
    return { ok: false, status: 422, error: "That URL doesn't look like a webpage with a recipe." }
  }
  const html = await res.text()
  const ld = recipeJsonLd(html)
  const text = cleanHtml(html)
  if (!ld && !text) return { ok: false, status: 422, error: 'Page appears to be empty.' }
  const content = [
    ld ? `Structured recipe data from the page (schema.org JSON-LD):\n${ld}` : '',
    text ? `Page text:\n${text}` : '',
  ].filter(Boolean).join('\n\n')
  return { ok: true, content, imageUrl: metaContent(html, 'og:image'), finalUrl: res.url }
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
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') throw new Error('invalid protocol')
  } catch {
    return json({ error: 'Please enter a valid URL (starting with http:// or https://)' }, 400)
  }

  const userId = ctx.data.userId as string | undefined
  const source = detectSource(parsedUrl)

  // ── Social links: read the caption first (no AI cost if there's no recipe) ──
  let content: string | null = null
  let sourceUrl = parsedUrl.toString()
  let imageUrl: string | null = null
  let sourceGuess: string | null = null
  let importSource: ImportSource | 'web-via-caption' = source

  if (source !== 'web') {
    const name = SOURCE_NAME[source]
    if (source === 'instagram') {
      return json({
        error: "Instagram doesn't let apps read posts without signing in. Paste the caption below, or add screenshots of the recipe.",
        code: 'caption_unreachable', source,
      }, 422)
    }
    const social = await readSocial(parsedUrl, source, ctx.env.YOUTUBE_API_KEY)
    sourceUrl = social.url
    imageUrl = social.imageUrl
    sourceGuess = social.author ? `${social.author} on ${name}` : name
    const caption = [social.title, social.text].filter(Boolean).join('\n\n').trim()
    const links = [...new Set([...findLinks(caption), ...social.links])]

    const signal = caption ? recipeSignal(caption) : 'none'
    const fromCaption = () =>
      `Source: a ${name} post${social.author ? ` by ${social.author}` : ''}. The recipe is in the caption below.\n\nCaption:\n${caption.slice(0, 12000)}`

    if (signal === 'strong') {
      content = fromCaption()
    } else {
      if (links.length) {
        // "Get the recipe: https://…" — import the linked page, keeping its URL as the source.
        const page = await readWebPage(links[0])
        if (page.ok) {
          content = `Source: a recipe page linked from a ${name} post.\nPage URL: ${page.finalUrl}\n\n${page.content}`
          imageUrl = page.imageUrl ?? imageUrl
          sourceUrl = page.finalUrl
          importSource = 'web-via-caption'
        }
      }
      if (!content && signal === 'weak') content = fromCaption()
    }

    if (!content) {
      const why = !caption
        ? `We couldn't read this ${name} post.`
        : `This ${name} post doesn't include the recipe in its ${source === 'youtube' ? 'title or description' : 'caption'} — it's probably shown or spoken in the video.`
      return json({
        error: `${why} Paste the recipe text below, or add screenshots of the recipe from the video.`,
        code: caption ? 'no_recipe_in_caption' : 'caption_unreachable', source,
      }, 422)
    }
  }

  // Only now are we going to spend an AI call: check config and the daily limit.
  if (!ctx.env.ANTHROPIC_API_KEY) return json({ error: 'AI extraction not configured' }, 503)
  if (userId) {
    const allowed = await checkRateLimit(ctx.env.DB, `extract:${userId}`, DAILY_EXTRACTION_LIMIT, ONE_DAY_SECONDS)
    if (!allowed) return json({ error: `You've reached the daily limit of ${DAILY_EXTRACTION_LIMIT} recipe imports. Try again tomorrow.` }, 429)
  }

  if (!content) {
    const page = await readWebPage(parsedUrl.toString())
    if (!page.ok) return json({ error: page.error }, page.status)
    content = `Page URL: ${parsedUrl.toString()}\n\n${page.content}`
    imageUrl = page.imageUrl
  }

  const { currency, countryCtx } = await userCurrencyCtx(ctx.env, userId)
  const result = await extractRecipe(ctx.env, { content, currency, countryCtx, sourceUrl, sourceImageUrl: imageUrl, sourceGuess })
  if (!result.ok) {
    const error = result.code === 'no_recipe' && source !== 'web'
      ? `We couldn't find a recipe in that ${SOURCE_NAME[source]} post. Paste the recipe text below, or add screenshots.`
      : result.code === 'no_recipe' ? "We couldn't find a recipe on that page." : result.error
    return json({ error, code: result.code, source }, result.status)
  }

  await logAiUsage(ctx.env.DB, 'url')
  return json({ ...result.recipe, import_source: importSource === 'web-via-caption' ? source : importSource })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
