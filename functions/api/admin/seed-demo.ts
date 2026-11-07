import type { Env } from '../../env'
import {
  DEMO_USER_ID, DEMO_EMAIL, DEMO_PASSWORD, DEMO_DISPLAY_NAME,
  DEMO_PHOTOS, demoPhotoKey, demoPhotoAsset, DEMO_SHARE_TOKEN,
  DEMO_RECIPES, DEMO_COLLECTIONS,
} from '../../lib/demo'
import { getDemoPhotoPicks } from '../../lib/demoPhotos'

// Create or reset the demo account to its exact seed state.
//
//   GET  /api/admin/seed-demo  → confirmation page with a button (no JS)
//   POST /api/admin/seed-demo  → reseed, returns a JSON summary
//
// Safety:
// - Admin only, and fails closed if ADMIN_EMAILS is unset.
// - Every DELETE is scoped to DEMO_USER_ID, its email, or the fixed demo
//   recipe/collection IDs. Refuses to run if the demo email or share token
//   already belongs to a different account.
// - All row changes run in one D1 batch, which is a single transaction:
//   either the whole reset lands or none of it does.

const ITERATIONS = 100_000 // must match functions/api/auth/login.ts

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const denied = checkAdmin(ctx)
  if (denied) return denied
  return new Response(`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Reseed demo account</title></head>
<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;line-height:1.5">
<h1>Reseed demo account</h1>
<p>Resets <strong>${DEMO_EMAIL}</strong> to its seed state: recipes, collections, favourites and share link.
Anything a reviewer changed on the demo account is discarded and its sessions are signed out.
No other account is touched.</p>
<form method="POST"><button type="submit" style="font-size:1rem;padding:.6rem 1.2rem">Reseed now</button></form>
</body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const denied = checkAdmin(ctx)
  if (denied) return denied

  const db = ctx.env.DB

  // ── Preflight: fail before writing anything ───────────────────────────────
  const userCols = await columns(db, 'users')
  const recipeCols = await columns(db, 'recipes')
  const tables = new Set(
    ((await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all<{ name: string }>()).results ?? [])
      .map(r => r.name),
  )
  const missing = [
    ...['password_hash', 'email_verified', 'is_public', 'country'].filter(c => !userCols.has(c)).map(c => `users.${c}`),
    ...['source_url', 'share_token_expires_at', 'calories_per_serving', 'cost_per_serving', 'cost_currency']
      .filter(c => !recipeCols.has(c)).map(c => `recipes.${c}`),
    ...['user_favourites', 'recipe_ratings', 'collections', 'recipe_collections'].filter(t => !tables.has(t)),
  ]
  if (missing.length) {
    return json({ ok: false, error: `Schema not migrated (missing: ${missing.join(', ')}). Run /api/admin/migrate first.` }, 409)
  }

  const emailOwner = await db.prepare('SELECT id FROM users WHERE email = ?').bind(DEMO_EMAIL).first<{ id: string }>()
  if (emailOwner && emailOwner.id !== DEMO_USER_ID) {
    return json({ ok: false, error: `${DEMO_EMAIL} belongs to another account (${emailOwner.id}). Refusing to touch it.` }, 409)
  }
  const recipeIds = DEMO_RECIPES.map(r => r.id)
  const collectionIds = DEMO_COLLECTIONS.map(c => c.id)
  const inList = (n: number) => Array(n).fill('?').join(',')
  const foreignRecipe = await db.prepare(
    `SELECT id FROM recipes WHERE user_id != ? AND (id IN (${inList(recipeIds.length)}) OR share_token = ?) LIMIT 1`,
  ).bind(DEMO_USER_ID, ...recipeIds, DEMO_SHARE_TOKEN).first()
  const foreignCollection = await db.prepare(
    `SELECT id FROM collections WHERE user_id != ? AND id IN (${inList(collectionIds.length)}) LIMIT 1`,
  ).bind(DEMO_USER_ID, ...collectionIds).first()
  if (foreignRecipe || foreignCollection) {
    return json({ ok: false, error: 'A demo recipe/collection ID or share token is used by another account. Refusing to continue.' }, 409)
  }

  // Photos: copy the bundled static assets into R2 (idempotent overwrite).
  if (!ctx.env.R2) return json({ ok: false, error: 'R2 binding missing' }, 500)
  for (const name of DEMO_PHOTOS) {
    const assetUrl = new URL(demoPhotoAsset(name), ctx.request.url)
    const photoRes = ctx.env.ASSETS ? await ctx.env.ASSETS.fetch(assetUrl) : await fetch(assetUrl)
    if (!photoRes.ok || !(photoRes.headers.get('Content-Type') ?? '').startsWith('image/')) {
      return json({ ok: false, error: `Could not load demo photo ${demoPhotoAsset(name)} (HTTP ${photoRes.status})` }, 500)
    }
    await ctx.env.R2.put(demoPhotoKey(name), await photoRes.arrayBuffer(), { httpMetadata: { contentType: 'image/jpeg' } })
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD)
  // Hand-picked Unsplash photos (if any) win over the bundled CC0 photos.
  const photoPicks = await getDemoPhotoPicks(ctx.env)

  // ── One transaction: wipe demo-owned rows, then insert the seed ──────────
  const now = Math.floor(Date.now() / 1000)
  const rIn = inList(recipeIds.length)
  const stmts: D1PreparedStatement[] = [
    // Anything hanging off the demo recipes (including ratings/favourites other
    // accounts may have left on them, so the seed state is exact).
    db.prepare(`DELETE FROM recipe_collections WHERE recipe_id IN (${rIn}) OR collection_id IN (SELECT id FROM collections WHERE user_id = ?)`)
      .bind(...recipeIds, DEMO_USER_ID),
    db.prepare(`DELETE FROM recipe_ratings WHERE user_id = ? OR recipe_id IN (${rIn})`).bind(DEMO_USER_ID, ...recipeIds),
    db.prepare(`DELETE FROM user_favourites WHERE user_id = ? OR recipe_id IN (${rIn})`).bind(DEMO_USER_ID, ...recipeIds),
    db.prepare('DELETE FROM collections WHERE user_id = ?').bind(DEMO_USER_ID),
    db.prepare('DELETE FROM recipes WHERE user_id = ?').bind(DEMO_USER_ID),
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(DEMO_USER_ID),
    db.prepare('DELETE FROM magic_tokens WHERE email = ?').bind(DEMO_EMAIL),
  ]
  if (tables.has('user_follows')) {
    stmts.push(db.prepare('DELETE FROM user_follows WHERE follower_id = ? OR following_id = ?').bind(DEMO_USER_ID, DEMO_USER_ID))
  }
  if (tables.has('import_outcomes')) {
    stmts.push(db.prepare('DELETE FROM import_outcomes WHERE user_id = ?').bind(DEMO_USER_ID))
  }
  if (tables.has('invite_tokens')) {
    stmts.push(db.prepare('DELETE FROM invite_tokens WHERE user_id = ?').bind(DEMO_USER_ID))
  }

  // User row: upsert so the fixed ID is kept; reset every profile field.
  const extra: Record<string, unknown> = {}
  if (userCols.has('gender')) extra.gender = null
  if (userCols.has('age_bracket')) extra.age_bracket = null
  if (userCols.has('avatar_image_key')) extra.avatar_image_key = null
  if (userCols.has('unit_system')) extra.unit_system = 'metric'
  const userFields: Record<string, unknown> = {
    id: DEMO_USER_ID,
    email: DEMO_EMAIL,
    display_name: DEMO_DISPLAY_NAME,
    avatar_id: 'herb',
    default_servings: 2,
    password_hash: passwordHash,
    email_verified: 1,
    is_public: 0, // keeps the demo out of Explore, Leaderboard, Chefs, Community, public profiles
    country: null,
    ...extra,
  }
  const uKeys = Object.keys(userFields)
  stmts.push(db.prepare(
    `INSERT INTO users (${uKeys.join(', ')}) VALUES (${inList(uKeys.length)})
     ON CONFLICT(id) DO UPDATE SET ${uKeys.filter(k => k !== 'id').map(k => `${k} = excluded.${k}`).join(', ')}`,
  ).bind(...uKeys.map(k => userFields[k])))

  // Recipes: stagger timestamps so list order is stable (first recipe newest).
  DEMO_RECIPES.forEach((r, idx) => {
    const ts = now - idx * 3600
    stmts.push(db.prepare(`
      INSERT INTO recipes (id, user_id, title, description, servings, prep_time, cook_time,
        ingredients, steps, tags, source_guess, source_url, hero_image_key, screenshot_keys,
        is_favourite, is_deleted, needs_attention, share_token, share_token_expires_at,
        calories_per_serving, cost_per_serving, cost_currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, 0, 0, ?, ?, ?, ?, 'USD', ?, ?)
    `).bind(
      r.id, DEMO_USER_ID, r.title, r.description, r.servings, r.prep_time, r.cook_time,
      JSON.stringify(r.ingredients), JSON.stringify(r.steps), JSON.stringify(r.tags),
      r.source_guess ?? null, r.source_url ?? null, photoPicks[r.id]?.url ?? (r.photo ? demoPhotoKey(r.photo) : null),
      r.favourite ? 1 : 0,
      r.share ? DEMO_SHARE_TOKEN : null, r.share ? now + 30 * 24 * 60 * 60 : null,
      r.calories_per_serving, r.cost_per_serving, ts, ts,
    ))
    if (r.favourite) {
      stmts.push(db.prepare('INSERT INTO user_favourites (user_id, recipe_id, created_at) VALUES (?, ?, ?)')
        .bind(DEMO_USER_ID, r.id, ts))
    }
  })

  DEMO_COLLECTIONS.forEach((c, idx) => {
    stmts.push(db.prepare('INSERT INTO collections (id, user_id, name, created_at) VALUES (?, ?, ?, ?)')
      .bind(c.id, DEMO_USER_ID, c.name, now - 86400 + idx))
    for (const rid of c.recipe_ids) {
      stmts.push(db.prepare('INSERT INTO recipe_collections (recipe_id, collection_id) VALUES (?, ?)').bind(rid, c.id))
    }
  })

  try {
    await db.batch(stmts)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return json({ ok: false, error: `Seed transaction failed and was rolled back: ${msg}` }, 500)
  }

  // ── Verify what landed ────────────────────────────────────────────────────
  const [rc, cc, fc] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS n FROM recipes WHERE user_id = ? AND is_deleted = 0').bind(DEMO_USER_ID).first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) AS n FROM collections WHERE user_id = ?').bind(DEMO_USER_ID).first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) AS n FROM user_favourites WHERE user_id = ?').bind(DEMO_USER_ID).first<{ n: number }>(),
  ])
  const expected = { recipes: DEMO_RECIPES.length, collections: DEMO_COLLECTIONS.length, favourites: DEMO_RECIPES.filter(r => r.favourite).length }
  const actual = { recipes: rc?.n ?? 0, collections: cc?.n ?? 0, favourites: fc?.n ?? 0 }
  const ok = actual.recipes === expected.recipes && actual.collections === expected.collections && actual.favourites === expected.favourites

  return json({
    ok,
    email: DEMO_EMAIL,
    seeded: actual,
    ...(ok ? {} : { expected }),
    share_url: `${new URL(ctx.request.url).origin}/share/${DEMO_SHARE_TOKEN}`,
  }, ok ? 200 : 500)
}

// ── helpers ──────────────────────────────────────────────────────────────────

function checkAdmin(ctx: EventContext<Env, string, Record<string, unknown>>): Response | null {
  const email = String(ctx.data.email ?? '').toLowerCase()
  const admins = (ctx.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  // Fail closed: unlike /migrate, this endpoint is never open when ADMIN_EMAILS is unset.
  if (!email || !admins.includes(email)) return json({ error: 'Forbidden' }, 403)
  return null
}

async function columns(db: D1Database, table: string): Promise<Set<string>> {
  const { results } = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>()
  return new Set((results ?? []).map(r => r.name))
}

function toHex(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, key, 256)
  return `${toHex(salt)}:${toHex(new Uint8Array(bits))}`
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
