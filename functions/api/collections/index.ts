import type { Env } from '../../env'

function generateId(): string {
  const arr = new Uint8Array(8)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// GET /api/collections — list user's collections with recipe IDs
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string

  const [collectionsRes, membersRes] = await Promise.all([
    ctx.env.DB.prepare(
      'SELECT id, name, created_at FROM collections WHERE user_id = ? ORDER BY created_at ASC'
    ).bind(userId).all<{ id: string; name: string; created_at: number }>(),
    ctx.env.DB.prepare(
      'SELECT rc.collection_id, rc.recipe_id FROM recipe_collections rc JOIN collections c ON rc.collection_id = c.id WHERE c.user_id = ?'
    ).bind(userId).all<{ collection_id: string; recipe_id: string }>(),
  ])

  const recipesByCollection = new Map<string, string[]>()
  for (const m of membersRes.results ?? []) {
    const list = recipesByCollection.get(m.collection_id) ?? []
    list.push(m.recipe_id)
    recipesByCollection.set(m.collection_id, list)
  }

  const collections = (collectionsRes.results ?? []).map(c => ({
    ...c,
    recipe_ids: recipesByCollection.get(c.id) ?? [],
  }))

  return json(collections)
}

// POST /api/collections — create a collection
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  let name: string
  try {
    const body = await ctx.request.json() as { name?: string }
    name = (body.name ?? '').trim()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!name) return json({ error: 'Name is required' }, 400)
  if (name.length > 80) return json({ error: 'Name too long' }, 400)

  const id = generateId()
  const now = Math.floor(Date.now() / 1000)
  await ctx.env.DB.prepare(
    'INSERT INTO collections (id, user_id, name, created_at) VALUES (?, ?, ?, ?)'
  ).bind(id, userId, name, now).run()

  return json({ id, name, created_at: now, recipe_ids: [] }, 201)
}
