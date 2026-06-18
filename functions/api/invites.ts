import type { Env } from '../env'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function randomToken(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS invite_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    used_at INTEGER,
    used_by_user_id TEXT
  )
`

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string | undefined
  if (!userId) return json({ error: 'Unauthorized' }, 401)

  await ctx.env.DB.prepare(CREATE_TABLE).run()

  let token = ''
  for (let i = 0; i < 5; i++) {
    const candidate = randomToken()
    const exists = await ctx.env.DB.prepare('SELECT 1 FROM invite_tokens WHERE token = ?').bind(candidate).first()
    if (!exists) { token = candidate; break }
  }
  if (!token) return json({ error: 'Failed to generate token' }, 500)

  await ctx.env.DB.prepare('INSERT INTO invite_tokens (token, user_id) VALUES (?, ?)').bind(token, userId).run()

  const origin = new URL(ctx.request.url).origin
  return json({ token, url: `${origin}/invite/${token}` })
}
