import type { Env } from '../env'

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const url = new URL(ctx.request.url)

  const q          = url.searchParams.get('q')?.trim() ?? ''
  const country    = url.searchParams.get('country')?.trim() ?? ''
  const gender     = url.searchParams.get('gender')?.trim() ?? ''
  const ageBracket = url.searchParams.get('age_bracket')?.trim() ?? ''
  const calMin     = toInt(url.searchParams.get('cal_min'))
  const calMax     = toInt(url.searchParams.get('cal_max'))
  const costMin    = toFloat(url.searchParams.get('cost_min'))
  const costMax    = toFloat(url.searchParams.get('cost_max'))

  // Build dynamic WHERE clause
  const wheres: string[] = ['u.is_public = 1', 'r.is_deleted = 0']
  const binds: (string | number)[] = [userId] // index 0: for my_rating subquery

  if (q) {
    const like = `%${q}%`
    wheres.push('(r.title LIKE ? OR r.description LIKE ? OR r.tags LIKE ?)')
    binds.push(like, like, like)
  }
  if (country) {
    wheres.push('LOWER(u.country) LIKE LOWER(?)')
    binds.push(`%${country}%`)
  }
  if (gender) {
    wheres.push('u.gender = ?')
    binds.push(gender)
  }
  if (ageBracket) {
    wheres.push('u.age_bracket = ?')
    binds.push(ageBracket)
  }
  if (calMin !== null) {
    wheres.push('r.calories_per_serving IS NOT NULL AND r.calories_per_serving >= ?')
    binds.push(calMin)
  }
  if (calMax !== null) {
    wheres.push('r.calories_per_serving IS NOT NULL AND r.calories_per_serving <= ?')
    binds.push(calMax)
  }
  if (costMin !== null) {
    wheres.push('r.cost_per_serving IS NOT NULL AND r.cost_per_serving >= ?')
    binds.push(costMin)
  }
  if (costMax !== null) {
    wheres.push('r.cost_per_serving IS NOT NULL AND r.cost_per_serving <= ?')
    binds.push(costMax)
  }

  const rows = await ctx.env.DB.prepare(`
    SELECT
      r.id, r.title, r.description, r.tags, r.hero_image_key,
      r.prep_time, r.cook_time, r.servings, r.user_id,
      r.calories_per_serving, r.cost_per_serving,
      u.display_name                                                              AS author_name,
      u.avatar_id                                                                 AS author_avatar,
      ROUND(COALESCE(AVG(rr.rating), 0), 1)                                      AS avg_rating,
      COUNT(rr.recipe_id)                                                         AS rating_count,
      (SELECT rating FROM recipe_ratings WHERE recipe_id = r.id AND user_id = ?) AS my_rating
    FROM recipes r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN recipe_ratings rr ON r.id = rr.recipe_id
    WHERE ${wheres.join(' AND ')}
    GROUP BY r.id
    ORDER BY avg_rating DESC, rating_count DESC, r.created_at DESC
    LIMIT 48
  `).bind(...binds).all<Record<string, unknown>>()

  const results = (rows.results ?? []).map(r => ({
    ...r,
    tags: JSON.parse((r.tags as string) || '[]'),
    avg_rating: Number(r.avg_rating),
    rating_count: Number(r.rating_count),
    my_rating: r.my_rating != null ? Number(r.my_rating) : null,
  }))

  return json(results)
}

function toInt(v: string | null): number | null {
  if (!v) return null
  const n = parseInt(v)
  return isNaN(n) ? null : n
}

function toFloat(v: string | null): number | null {
  if (!v) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
