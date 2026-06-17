export type AiCallType = 'screenshot' | 'url' | 'dinner'

export async function logAiUsage(db: D1Database, type: AiCallType): Promise<void> {
  const date = new Date().toISOString().split('T')[0]
  try {
    await db.prepare(`
      INSERT INTO ai_usage_daily (date, type, count) VALUES (?, ?, 1)
      ON CONFLICT (date, type) DO UPDATE SET count = count + 1
    `).bind(date, type).run()
  } catch { /* table not yet migrated — no-op */ }
}
