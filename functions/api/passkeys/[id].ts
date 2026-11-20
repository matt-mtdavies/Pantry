// PATCH  /api/passkeys/:id  { name } — rename one of your passkeys
// DELETE /api/passkeys/:id           — remove it (it can no longer sign in)
import { ensurePasskeyTables, toPublicPasskey, json, type Env, type PasskeyRow } from '../../lib/passkeys'

export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const id = String(ctx.params.id)
  let name: string
  try {
    const body = await ctx.request.json() as { name?: string }
    name = (body.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 60)
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!name) return json({ error: 'Give your passkey a name.' }, 400)

  await ensurePasskeyTables(ctx.env.DB)
  const row = await ctx.env.DB.prepare(
    'UPDATE passkeys SET name = ? WHERE id = ? AND user_id = ? RETURNING *'
  ).bind(name, id, userId).first<PasskeyRow>()
  if (!row) return json({ error: 'Passkey not found' }, 404)
  return json({ passkey: toPublicPasskey(row) })
}

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const id = String(ctx.params.id)
  await ensurePasskeyTables(ctx.env.DB)
  const res = await ctx.env.DB.prepare('DELETE FROM passkeys WHERE id = ? AND user_id = ?').bind(id, userId).run()
  if (!res.meta.changes) return json({ error: 'Passkey not found' }, 404)
  const { results } = await ctx.env.DB.prepare('SELECT id FROM passkeys WHERE user_id = ?').bind(userId).all<{ id: string }>()
  // Remaining IDs let the browser tell the password manager to hide the removed one.
  return json({ ok: true, remainingIds: results.map(r => r.id) })
}
