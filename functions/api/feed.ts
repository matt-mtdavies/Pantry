import type { Env } from '../env'

const TIP_CATEGORIES = ['Technique', 'Ingredient', 'Storage', 'Flavour', 'Kitchen']

const FALLBACK_TIP = {
  category: 'Flavour',
  tip: 'Taste as you go — seasoning at every stage builds more complex flavour than adding it all at the end.',
  emoji: '🧂',
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS daily_tips (
      date TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      tip TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '🍳',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `).run()

  const today = new Date().toISOString().split('T')[0]

  let tip = await env.DB
    .prepare('SELECT date, category, tip, emoji FROM daily_tips WHERE date = ?')
    .bind(today)
    .first<{ date: string; category: string; tip: string; emoji: string }>()

  if (!tip) {
    try {
      const dayOfYear = Math.floor(
        (Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86_400_000,
      )
      const category = TIP_CATEGORIES[dayOfYear % TIP_CATEGORIES.length]

      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: `Generate a single practical cooking tip for home cooks. Category: ${category}. Keep it to 1-2 sentences, specific and actionable. Return ONLY valid JSON with no markdown fences: {"category": "...", "tip": "...", "emoji": "..."}`,
          }],
        }),
      })

      if (aiRes.ok) {
        const aiData = await aiRes.json() as { content: Array<{ text: string }> }
        const raw = aiData.content?.[0]?.text ?? ''
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as {
          category?: string; tip: string; emoji?: string
        }

        await env.DB.prepare(
          'INSERT OR REPLACE INTO daily_tips (date, category, tip, emoji) VALUES (?, ?, ?, ?)',
        ).bind(today, parsed.category ?? category, parsed.tip, parsed.emoji ?? '🍳').run()

        tip = { date: today, category: parsed.category ?? category, tip: parsed.tip, emoji: parsed.emoji ?? '🍳' }
      }
    } catch { /* fall through to fallback */ }

    if (!tip) {
      tip = { date: today, ...FALLBACK_TIP }
    }
  }

  const recentResult = await env.DB.prepare(`
    SELECT r.id, r.title, r.hero_image_key, r.created_at, r.share_token,
           r.prep_time, r.cook_time, r.user_id,
           u.display_name AS author_name, u.avatar_id, u.avatar_image_key AS author_avatar_key
    FROM recipes r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE u.is_public = 1 AND r.is_deleted = 0
    ORDER BY r.created_at DESC
    LIMIT 8
  `).all<{
    id: string; title: string; hero_image_key: string | null
    created_at: number; share_token: string; user_id: string
    prep_time: number | null; cook_time: number | null
    author_name: string | null; avatar_id: string; author_avatar_key: string | null
  }>()

  const topResult = await env.DB.prepare(`
    SELECT r.id, r.title, r.hero_image_key, r.created_at, r.user_id,
           ROUND(AVG(CAST(rr.rating AS REAL)), 1) AS avg_rating,
           COUNT(rr.recipe_id) AS rating_count,
           u.display_name AS author_name
    FROM recipes r
    JOIN recipe_ratings rr ON r.id = rr.recipe_id
    LEFT JOIN users u ON r.user_id = u.id
    WHERE rr.created_at > unixepoch('now', '-7 days') AND r.is_deleted = 0
    GROUP BY r.id
    ORDER BY avg_rating DESC, rating_count DESC
    LIMIT 4
  `).all<{
    id: string; title: string; hero_image_key: string | null
    created_at: number; user_id: string; avg_rating: number; rating_count: number
    author_name: string | null
  }>()

  return Response.json({
    tip,
    recentShared: recentResult.results,
    topThisWeek: topResult.results,
  })
}
