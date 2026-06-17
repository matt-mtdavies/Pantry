import type { Env } from '../../env'

// Cost per successful AI call (USD)
const COST = { screenshot: 0.015, url: 0.004, dinner: 0.005 }

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const userEmail = ctx.data.email as string

  if (ctx.env.ADMIN_EMAILS) {
    const admins = ctx.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase())
    if (!admins.includes(userEmail.toLowerCase())) {
      return json({ error: 'Forbidden' }, 403)
    }
  }

  const now = Math.floor(Date.now() / 1000)
  const weekAgo = now - 7 * 86_400
  const monthAgo = now - 30 * 86_400
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const monthStartStr = monthStart.toISOString().split('T')[0]
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0]
  const todayStr = new Date().toISOString().split('T')[0]

  // ── Core D1 stats (batch) ───────────────────────────────────────────────────
  const [
    totalUsers,
    newUsersWeek,
    newUsersMonth,
    activeUsersWeek,
    dailyUsers,
    totalRecipes,
    publicRecipes,
    newRecipesWeek,
    newRecipesMonth,
    dailyRecipes,
    totalRatings,
    totalCollections,
    dailyRatings,
  ] = await ctx.env.DB.batch([
    ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM users'),
    ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE created_at > ?').bind(weekAgo),
    ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE created_at > ?').bind(monthAgo),
    ctx.env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) AS n FROM (
        SELECT user_id FROM recipes WHERE is_deleted = 0 AND created_at > ?
        UNION
        SELECT user_id FROM recipe_ratings WHERE created_at > ?
      )
    `).bind(weekAgo, weekAgo),
    ctx.env.DB.prepare(`
      SELECT date(created_at, 'unixepoch') AS d, COUNT(*) AS n
      FROM users WHERE created_at > ? GROUP BY d ORDER BY d
    `).bind(monthAgo),
    ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM recipes WHERE is_deleted = 0'),
    ctx.env.DB.prepare(`
      SELECT COUNT(*) AS n FROM recipes r
      JOIN users u ON r.user_id = u.id
      WHERE r.is_deleted = 0 AND u.is_public = 1
    `),
    ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM recipes WHERE is_deleted = 0 AND created_at > ?').bind(weekAgo),
    ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM recipes WHERE is_deleted = 0 AND created_at > ?').bind(monthAgo),
    ctx.env.DB.prepare(`
      SELECT date(created_at, 'unixepoch') AS d, COUNT(*) AS n
      FROM recipes WHERE is_deleted = 0 AND created_at > ? GROUP BY d ORDER BY d
    `).bind(monthAgo),
    ctx.env.DB.prepare('SELECT COUNT(*) AS n, ROUND(AVG(rating), 2) AS avg FROM recipe_ratings'),
    ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM collections'),
    ctx.env.DB.prepare(`
      SELECT date(created_at, 'unixepoch') AS d, COUNT(*) AS n
      FROM recipe_ratings WHERE created_at > ? GROUP BY d ORDER BY d
    `).bind(monthAgo),
  ])

  // ── user_favourites (may not exist yet) ────────────────────────────────────
  let totalFavourites = 0
  let dailyFavourites: Array<{ d: string; n: number }> = []
  try {
    const [fTotal, fDaily] = await ctx.env.DB.batch([
      ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM user_favourites'),
      ctx.env.DB.prepare(`
        SELECT date(created_at, 'unixepoch') AS d, COUNT(*) AS n
        FROM user_favourites WHERE created_at > ? GROUP BY d ORDER BY d
      `).bind(monthAgo),
    ])
    totalFavourites = num(fTotal.results?.[0], 'n')
    dailyFavourites = (fDaily.results ?? []) as Array<{ d: string; n: number }>
  } catch { /* table not yet created */ }

  // ── AI usage ───────────────────────────────────────────────────────────────
  let aiThisMonth = { screenshot: 0, url: 0, dinner: 0 }
  let aiDaily: Array<{ date: string; type: string; count: number }> = []
  try {
    const [aiMonth, aiDailyRes] = await ctx.env.DB.batch([
      ctx.env.DB.prepare(`
        SELECT type, SUM(count) AS n FROM ai_usage_daily WHERE date >= ? GROUP BY type
      `).bind(monthStartStr),
      ctx.env.DB.prepare(`
        SELECT date, type, count FROM ai_usage_daily WHERE date >= ? ORDER BY date, type
      `).bind(thirtyDaysAgoStr),
    ])
    for (const row of (aiMonth.results ?? []) as Array<{ type: string; n: number }>) {
      if (row.type === 'screenshot') aiThisMonth.screenshot = row.n
      if (row.type === 'url') aiThisMonth.url = row.n
      if (row.type === 'dinner') aiThisMonth.dinner = row.n
    }
    aiDaily = (aiDailyRes.results ?? []) as Array<{ date: string; type: string; count: number }>
  } catch { /* table not yet migrated */ }

  const estimatedCostUsd =
    aiThisMonth.screenshot * COST.screenshot +
    aiThisMonth.url * COST.url +
    aiThisMonth.dinner * COST.dinner

  // ── Cloudflare zone analytics ──────────────────────────────────────────────
  let cloudflare: { totalVisits: number; totalBytes: number; daily: Array<{ date: string; visits: number; bytes: number }> } | null = null
  if (ctx.env.CF_ZONE_ID && ctx.env.CF_API_TOKEN) {
    try {
      const gql = `{
        viewer {
          zones(filter: { zoneTag: "${ctx.env.CF_ZONE_ID}" }) {
            httpRequestsAdaptiveGroups(
              filter: { date_geq: "${thirtyDaysAgoStr}", date_leq: "${todayStr}" }
              limit: 31
              orderBy: [date_ASC]
            ) {
              sum { visits bytes cachedBytes }
              dimensions { date }
            }
          }
        }
      }`
      const cfRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ctx.env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: gql }),
        signal: AbortSignal.timeout(8_000),
      })
      if (cfRes.ok) {
        const cfData = await cfRes.json() as {
          data?: {
            viewer?: {
              zones?: Array<{
                httpRequestsAdaptiveGroups?: Array<{
                  sum: { visits: number; bytes: number }
                  dimensions: { date: string }
                }>
              }>
            }
          }
        }
        const groups = cfData.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ?? []
        const daily = groups.map(g => ({
          date: g.dimensions.date,
          visits: g.sum.visits,
          bytes: g.sum.bytes,
        }))
        cloudflare = {
          totalVisits: daily.reduce((s, d) => s + d.visits, 0),
          totalBytes: daily.reduce((s, d) => s + d.bytes, 0),
          daily,
        }
      }
    } catch { /* skip on error */ }
  }

  // ── Resend email stats ─────────────────────────────────────────────────────
  let email: { thisMonth: number; recentTotal: number } | null = null
  if (ctx.env.RESEND_API_KEY) {
    try {
      const resendRes = await fetch('https://api.resend.com/emails?limit=100', {
        headers: { Authorization: `Bearer ${ctx.env.RESEND_API_KEY}` },
        signal: AbortSignal.timeout(6_000),
      })
      if (resendRes.ok) {
        const resendData = await resendRes.json() as { data?: Array<{ created_at: string }> }
        const all = resendData.data ?? []
        const thisMonth = all.filter(e => e.created_at.startsWith(monthStartStr.slice(0, 7))).length
        email = { thisMonth, recentTotal: all.length }
      }
    } catch { /* skip on error */ }
  }

  // ── Shape daily series (fill gaps) ────────────────────────────────────────
  return json({
    users: {
      total: num(totalUsers.results?.[0], 'n'),
      newThisWeek: num(newUsersWeek.results?.[0], 'n'),
      newThisMonth: num(newUsersMonth.results?.[0], 'n'),
      activeThisWeek: num(activeUsersWeek.results?.[0], 'n'),
      daily: toDaily(dailyUsers.results as Array<{ d: string; n: number }> ?? []),
    },
    recipes: {
      total: num(totalRecipes.results?.[0], 'n'),
      public: num(publicRecipes.results?.[0], 'n'),
      newThisWeek: num(newRecipesWeek.results?.[0], 'n'),
      newThisMonth: num(newRecipesMonth.results?.[0], 'n'),
      daily: toDaily(dailyRecipes.results as Array<{ d: string; n: number }> ?? []),
    },
    engagement: {
      totalFavourites,
      totalRatings: num(totalRatings.results?.[0], 'n'),
      avgRating: (totalRatings.results?.[0] as Record<string, unknown>)?.avg
        ? Number((totalRatings.results[0] as Record<string, unknown>).avg)
        : null,
      totalCollections: num(totalCollections.results?.[0], 'n'),
      dailyFavourites: toDaily(dailyFavourites),
      dailyRatings: toDaily(dailyRatings.results as Array<{ d: string; n: number }> ?? []),
    },
    ai: {
      thisMonth: aiThisMonth,
      estimatedCostUsd: Math.round(estimatedCostUsd * 100) / 100,
      daily: buildAiDaily(aiDaily),
    },
    cloudflare,
    email,
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(row: unknown, key: string): number {
  return Number((row as Record<string, unknown>)?.[key] ?? 0)
}

function toDaily(rows: Array<{ d: string; n: number }>): Array<{ date: string; count: number }> {
  const map = new Map(rows.map(r => [r.d, r.n]))
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86_400_000).toISOString().split('T')[0]
    return { date: d, count: map.get(d) ?? 0 }
  })
}

function buildAiDaily(
  rows: Array<{ date: string; type: string; count: number }>
): Array<{ date: string; screenshots: number; urls: number; dinner: number }> {
  const map = new Map<string, { screenshots: number; urls: number; dinner: number }>()
  for (const r of rows) {
    const entry = map.get(r.date) ?? { screenshots: 0, urls: 0, dinner: 0 }
    if (r.type === 'screenshot') entry.screenshots += r.count
    if (r.type === 'url') entry.urls += r.count
    if (r.type === 'dinner') entry.dinner += r.count
    map.set(r.date, entry)
  }
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86_400_000).toISOString().split('T')[0]
    return { date: d, ...(map.get(d) ?? { screenshots: 0, urls: 0, dinner: 0 }) }
  })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
