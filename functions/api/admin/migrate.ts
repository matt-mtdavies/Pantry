import type { Env } from '../../env'

async function runMigrate(ctx: EventContext<Env, string, Record<string, unknown>>): Promise<Response> {
  const userEmail = ctx.data.email as string

  if (ctx.env.ADMIN_EMAILS) {
    const admins = ctx.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase())
    if (!admins.includes(userEmail.toLowerCase())) {
      return json({ error: 'Forbidden' }, 403)
    }
  }

  const steps: string[] = []
  const errors: string[] = []

  const run = async (label: string, sql: string) => {
    try {
      await ctx.env.DB.prepare(sql).run()
      steps.push(`✓ ${label}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('already exists') || msg.includes('duplicate column')) {
        steps.push(`– ${label} (already done)`)
      } else {
        errors.push(`✗ ${label}: ${msg}`)
      }
    }
  }

  // Schema additions
  await run('email_verified column', `ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1`)
  await run('share_token_expires_at column', `ALTER TABLE recipes ADD COLUMN share_token_expires_at INTEGER`)
  await run('source_url column', `ALTER TABLE recipes ADD COLUMN source_url TEXT`)

  // user_favourites join table (cross-user favouriting)
  await run('user_favourites table', `
    CREATE TABLE IF NOT EXISTS user_favourites (
      user_id TEXT NOT NULL,
      recipe_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      PRIMARY KEY (user_id, recipe_id)
    )
  `)
  await run('backfill user_favourites', `
    INSERT OR IGNORE INTO user_favourites (user_id, recipe_id, created_at)
    SELECT user_id, id, created_at FROM recipes WHERE is_favourite = 1 AND is_deleted = 0
  `)
  await run('idx_user_favourites_user', `CREATE INDEX IF NOT EXISTS idx_user_favourites_user ON user_favourites (user_id)`)

  // Indexes: recipes
  await run('idx_recipes_user_deleted', `CREATE INDEX IF NOT EXISTS idx_recipes_user_deleted ON recipes (user_id, is_deleted)`)
  await run('idx_recipes_created_at', `CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes (created_at DESC)`)
  await run('idx_recipes_public', `CREATE INDEX IF NOT EXISTS idx_recipes_public ON recipes (is_deleted, created_at DESC)`)
  await run('idx_recipes_share_token', `CREATE INDEX IF NOT EXISTS idx_recipes_share_token ON recipes (share_token)`)

  // Indexes: ratings
  await run('idx_ratings_recipe', `CREATE INDEX IF NOT EXISTS idx_ratings_recipe ON recipe_ratings (recipe_id)`)
  await run('idx_ratings_user', `CREATE INDEX IF NOT EXISTS idx_ratings_user ON recipe_ratings (user_id)`)

  // Indexes: sessions
  await run('idx_sessions_user', `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id)`)
  await run('idx_sessions_expires', `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at)`)

  // Indexes: magic_tokens
  await run('idx_tokens_email', `CREATE INDEX IF NOT EXISTS idx_tokens_email ON magic_tokens (email)`)
  await run('idx_tokens_expires', `CREATE INDEX IF NOT EXISTS idx_tokens_expires ON magic_tokens (expires_at)`)

  // Indexes: rate_limits
  await run('idx_rate_window', `CREATE INDEX IF NOT EXISTS idx_rate_window ON rate_limits (window_start)`)

  // AI usage tracking for admin dashboard
  await run('ai_usage_daily table', `
    CREATE TABLE IF NOT EXISTS ai_usage_daily (
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (date, type)
    )
  `)

  // user_follows (chef follow system)
  await run('user_follows table', `
    CREATE TABLE IF NOT EXISTS user_follows (
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (follower_id, following_id)
    )
  `)
  await run('idx_user_follows_follower', `CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows (follower_id)`)
  await run('idx_user_follows_following', `CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows (following_id)`)

  // User feedback / improvement suggestions
  await run('feedback table', `
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)
  await run('idx_feedback_created', `CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback (created_at DESC)`)

  return json({ steps, errors, ok: errors.length === 0 })
}

export const onRequestGet: PagesFunction<Env> = (ctx) => runMigrate(ctx)
export const onRequestPost: PagesFunction<Env> = (ctx) => runMigrate(ctx)

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
