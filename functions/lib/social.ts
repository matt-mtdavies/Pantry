// Reading recipe text from social links, using only what platforms publish for
// this purpose: official oEmbed endpoints, the YouTube Data API (when a key is
// configured) and the Open Graph tags on public pages. No logins, private
// APIs or video downloads. See docs/briefs/2026-11-07-social-import-spike.md.

export type ImportSource = 'web' | 'tiktok' | 'youtube' | 'facebook' | 'instagram' | 'pinterest'

export const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const HOSTS: [RegExp, ImportSource][] = [
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/, 'youtube'],
  [/(^|\.)(facebook\.com|fb\.watch|fb\.com)$/, 'facebook'],
  [/(^|\.)(instagram\.com|instagr\.am)$/, 'instagram'],
  [/(^|\.)(pinterest\.[a-z.]+|pin\.it)$/, 'pinterest'],
]

export function detectSource(url: URL): ImportSource {
  const host = url.hostname.toLowerCase()
  return HOSTS.find(([re]) => re.test(host))?.[1] ?? 'web'
}

export const SOURCE_NAME: Record<ImportSource, string> = {
  web: 'website', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook', instagram: 'Instagram', pinterest: 'Pinterest',
}

export interface SocialText {
  source: ImportSource
  /** The caption / description text, if any was reachable. */
  text: string | null
  title: string | null
  author: string | null
  imageUrl: string | null
  /** Canonical URL to store as the recipe's source. */
  url: string
  /** Non-social links in the caption (often "full recipe: https://…"). */
  links: string[]
}

// ── HTML helpers (also used for web pages) ──────────────────────────────────

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
}

export function metaContent(html: string, prop: string): string | null {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i'))
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'))
  return m ? decodeEntities(m[1]).trim() : null
}

/** schema.org Recipe JSON-LD blocks, which recipe sites embed in <script> tags. */
export function recipeJsonLd(html: string): string | null {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => m[1].trim())
    .filter(b => /"@type"\s*:\s*(\[[^\]]*)?"Recipe"/.test(b))
  return blocks.length ? blocks.join('\n').slice(0, 15000) : null
}

async function getText(url: string, accept = 'text/html,application/xhtml+xml'): Promise<{ status: number; url: string; body: string } | null> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': BROWSER_UA, Accept: accept }, redirect: 'follow', signal: AbortSignal.timeout(12_000) })
    return { status: r.status, url: r.url, body: await r.text() }
  } catch { return null }
}

async function getJson<T>(url: string): Promise<T | null> {
  const r = await getText(url, 'application/json')
  if (!r || r.status !== 200) return null
  try { return JSON.parse(r.body) as T } catch { return null }
}

const SOCIAL_LINK = /(tiktok|instagram|facebook|fb\.watch|youtube|youtu\.be|pinterest|pin\.it|linktr\.ee|twitter|x\.com|threads\.net)/i

export function findLinks(text: string): string[] {
  const urls = text.match(/https?:\/\/[^\s"'<>)\]]+/g) ?? []
  return [...new Set(urls.map(u => u.replace(/[.,!?;:]+$/, '')))].filter(u => !SOCIAL_LINK.test(new URL(u).hostname))
}

/**
 * Cheap pre-check before spending an AI call. 'strong': quantities or numbered
 * steps, so the recipe is very likely in the text. 'weak': only hints (an
 * "ingredients" mention, a cooking verb with a time). 'none': title/hashtags.
 */
export function recipeSignal(text: string): 'strong' | 'weak' | 'none' {
  const t = text.replace(/#\w+/g, ' ')
  const quantities = (t.match(/\b\d+(?:[./]\d+)?\s*(?:g|kg|ml|l|cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|lbs?|pounds?|cloves?|pints?|cans?|tins?)\b|[½¼¾⅓⅔]/gi) ?? []).length
  const numberedSteps = (t.match(/(?:^|\s)\d{1,2}[.)]\s+[A-Za-z]/g) ?? []).length
  if (quantities >= 2 || numberedSteps >= 3) return 'strong'
  if (/\bingredients?\b/i.test(t) || /\b(bake|simmer|fry|roast|boil|stir|whisk|mix)\b[^.]{0,80}\b(min|minutes|°|degrees)\b/i.test(t)) return 'weak'
  return 'none'
}

// ── Per-platform readers ────────────────────────────────────────────────────

function youtubeId(u: URL): string | null {
  if (u.hostname.endsWith('youtu.be')) return u.pathname.slice(1).split('/')[0] || null
  const shorts = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/)
  return shorts?.[1] ?? u.searchParams.get('v')
}

interface OEmbed { title?: string; author_name?: string; thumbnail_url?: string }

export async function readSocial(url: URL, source: ImportSource, youtubeApiKey?: string): Promise<SocialText> {
  const base: SocialText = { source, text: null, title: null, author: null, imageUrl: null, url: url.toString(), links: [] }

  if (source === 'tiktok') {
    // The caption is in the public video page's own data block (the same page a
    // browser or link preview loads). Short links (vm./vt.tiktok.com) redirect to it.
    const r = await getText(url.toString())
    const full = r?.url ? r.url.split('?')[0] : url.toString()
    let caption: string | null = null, author: string | null = null, cover: string | null = null
    const block = r?.body.match(/<script[^>]+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/)?.[1]
    if (block) {
      try {
        const item = JSON.parse(block)?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct
        caption = item?.desc || null
        author = item?.author?.nickname || item?.author?.uniqueId || null
        cover = item?.video?.cover || null
      } catch { /* layout changed — fall through to oEmbed */ }
    }
    const o = await getJson<OEmbed>(`https://www.tiktok.com/oembed?url=${encodeURIComponent(full)}`)
    return {
      ...base, url: full,
      text: caption ?? o?.title ?? null,
      author: author ?? o?.author_name ?? null,
      imageUrl: cover ?? o?.thumbnail_url ?? null,
    }
  }

  if (source === 'youtube') {
    const id = youtubeId(url)
    if (!id) return base
    const canonical = `https://www.youtube.com/watch?v=${id}`
    const o = await getJson<OEmbed>(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(canonical)}`)
    let description: string | null = null
    if (youtubeApiKey) {
      const d = await getJson<{ items?: { snippet?: { description?: string } }[] }>(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(id)}&key=${encodeURIComponent(youtubeApiKey)}`)
      description = d?.items?.[0]?.snippet?.description || null
    }
    return { ...base, url: canonical, title: o?.title ?? null, author: o?.author_name ?? null, imageUrl: o?.thumbnail_url ?? null, text: description }
  }

  if (source === 'facebook' || source === 'pinterest') {
    const r = await getText(url.toString())
    if (!r || r.status !== 200) return base
    const html = r.body
    const ogTitle = metaContent(html, 'og:title')
    const ogDesc = metaContent(html, 'og:description')
    let text: string | null
    if (source === 'facebook') {
      // Facebook puts the full caption in og:title ("12K views · 3K reactions | <caption> | <Page>").
      text = (ogTitle ?? '').replace(/^[\d.,KM]+ views · [\d.,KM]+ reactions \| /, '').replace(/ \| [^|]+$/, '') || ogDesc
    } else {
      text = [ogTitle, ogDesc].filter(Boolean).join('\n') || null
      const out = html.match(/"link":"(https?:[^"]+)"/)?.[1]?.replace(/\\\//g, '/')
      if (out && !SOCIAL_LINK.test(out)) base.links.push(out)
    }
    return { ...base, url: r.url.split('?')[0], text, imageUrl: metaContent(html, 'og:image') }
  }

  // Instagram: captions need a Meta app token (oEmbed via Graph API) — not available.
  return base
}
