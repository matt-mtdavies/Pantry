import type { Env } from '../../env'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// DELETE /api/collections/:id — delete a collection
export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const { id } = ctx.params as { id: string }

  const col = await ctx.env.DB.prepare(
    'SELECT id FROM collections WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first<{ id: string }>()

  if (!col) return json({ error: 'Not found' }, 404)

  await ctx.env.DB.prepare('DELETE FROM collections WHERE id = ?').bind(id).run()

  return json({ ok: true })
}

// PATCH /api/collections/:id — rename a collection
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const { id } = ctx.params as { id: string }

  let name: string
  try {
    const body = await ctx.request.json() as { name?: string }
    name = (body.name ?? '').trim()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!name) return json({ error: 'Name is required' }, 400)
  if (name.length > 80) return json({ error: 'Name too long' }, 400)

  const col = await ctx.env.DB.prepare(
    'SELECT id FROM collections WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first<{ id: string }>()

  if (!col) return json({ error: 'Not found' }, 404)

  await ctx.env.DB.prepare('UPDATE collections SET name = ? WHERE id = ?').bind(name, id).run()

  return json({ ok: true, name })
}
