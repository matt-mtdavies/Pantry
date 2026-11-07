// Import quality: for each saved import, where it came from and whether the
// user changed anything on the review screen. Zero-edit rate = the share of
// imports saved untouched — the metric the import work optimises for.

export const IMPORT_SOURCES = ['web', 'tiktok', 'youtube', 'facebook', 'instagram', 'pinterest', 'text', 'screenshot'] as const
export type TrackedSource = typeof IMPORT_SOURCES[number]

export const CREATE_IMPORT_OUTCOMES = `
  CREATE TABLE IF NOT EXISTS import_outcomes (
    recipe_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    source TEXT NOT NULL,
    edited INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`

export async function recordImportOutcome(db: D1Database, recipeId: string, userId: string, meta: unknown) {
  const m = meta as { source?: unknown; edited?: unknown } | null
  if (!m || !IMPORT_SOURCES.includes(m.source as TrackedSource) || typeof m.edited !== 'boolean') return
  try {
    await db.prepare(CREATE_IMPORT_OUTCOMES).run()
    await db.prepare('INSERT OR IGNORE INTO import_outcomes (recipe_id, user_id, source, edited) VALUES (?, ?, ?, ?)')
      .bind(recipeId, userId, m.source, m.edited ? 1 : 0).run()
  } catch (e) { console.error('[import_outcomes]', e) } // never fail the save over analytics
}
