import type { Env } from '../../../env'

const SHARE_TOKEN_TTL = 30 * 24 * 60 * 60 // 30 days in seconds

function generateToken(): string {
  const arr = new Uint8Array(12)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const params = ctx.params as { id: string }
  const id = params.id

  // Lazy migration: ensure share_token_expires_at column exists
  try { await ctx.env.DB.prepare('ALTER TABLE recipes ADD COLUMN share_token_expires_at INTEGER').run() } catch { /* exists */ }

  const row = await ctx.env.DB.prepare(
    'SELECT id, share_token, share_token_expires_at FROM recipes WHERE id = ? AND user_id = ? AND is_deleted = 0'
  ).bind(id, userId).first<{ id: string; share_token: string | null; share_token_expires_at: number | null }>()

  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const now = Math.floor(Date.now() / 1000)
  let token = row.share_token

  // Create a new token if none exists, or if the existing one has expired
  if (!token || (row.share_token_expires_at !== null && row.share_token_expires_at <= now)) {
    token = generateToken()
    await ctx.env.DB.prepare(
      'UPDATE recipes SET share_token = ?, share_token_expires_at = ? WHERE id = ?'
    ).bind(token, now + SHARE_TOKEN_TTL, id).run()
  } else if (row.share_token_expires_at === null) {
    // Backfill expiry on existing tokens that had none
    await ctx.env.DB.prepare(
      'UPDATE recipes SET share_token_expires_at = ? WHERE id = ?'
    ).bind(now + SHARE_TOKEN_TTL, id).run()
  }

  const origin = new URL(ctx.request.url).origin
  return new Response(JSON.stringify({ token, url: `${origin}/share/${token}` }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
