/**
 * Simple D1-backed rate limiter.
 *
 * Limits are tracked per (key, window). The table is created lazily on first
 * use so no separate migration is needed.
 *
 * @returns true if the request is allowed, false if it should be rejected (429)
 */
export async function checkRateLimit(
  db: D1Database,
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000)

  try {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 1,
        window_start INTEGER NOT NULL
      )`
    ).run()
  } catch { /* already exists */ }

  const row = await db.prepare(
    'SELECT count, window_start FROM rate_limits WHERE key = ?'
  ).bind(key).first<{ count: number; window_start: number }>()

  if (!row || now - row.window_start >= windowSeconds) {
    await db.prepare(
      'INSERT OR REPLACE INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)'
    ).bind(key, now).run()
    return true
  }

  if (row.count >= maxRequests) return false

  await db.prepare(
    'UPDATE rate_limits SET count = count + 1 WHERE key = ?'
  ).bind(key).run()
  return true
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  )
}
