import type { Env } from '../../env'
import { normalizeSourceUrl } from '../../../shared/importing'

// GET /api/recipes/by-source?url=… — the caller's own saved recipe imported
// from this URL (tracking params, www, trailing slash etc. ignored), if any.
// Used by the import page to offer the existing copy instead of a duplicate.
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const target = normalizeSourceUrl(new URL(ctx.request.url).searchParams.get('url') ?? '')
  if (!target) return json({ recipe: null })

  const { results } = await ctx.env.DB.prepare(
    `SELECT id, title, source_url FROM recipes
     WHERE user_id = ? AND is_deleted = 0 AND source_url IS NOT NULL
     ORDER BY updated_at DESC`,
  ).bind(userId).all<{ id: string; title: string; source_url: string }>()

  const match = (results ?? []).find(r => normalizeSourceUrl(r.source_url) === target)
  return json({ recipe: match ? { id: match.id, title: match.title } : null })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}
