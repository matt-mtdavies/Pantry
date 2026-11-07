import type { Env } from '../../env'
import { DEMO_RECIPES, DEMO_USER_ID, demoPhotoKey } from '../../lib/demo'
import {
  CREATE_DEMO_PHOTOS, DEMO_PHOTO_QUERIES, UNSPLASH_UTM, displayUrl, getDemoPhotoPicks,
  searchUnsplash, trackUnsplashDownload, type UnsplashResult,
} from '../../lib/demoPhotos'

// GET  /api/admin/demo-photos  → picker: Unsplash options for each demo recipe (no JS)
// POST /api/admin/demo-photos  → save picks, ping Unsplash's download endpoint,
//                                 and point the demo account's recipes at them.
// Admin only (fails closed). Picks persist across reseeds.

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const b64 = (o: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s: string) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))))

interface Payload { id: string; raw: string; small: string; alt: string | null; name: string; userLink: string; photoLink: string; dl: string }

function checkAdmin(ctx: EventContext<Env, string, Record<string, unknown>>): Response | null {
  const email = String(ctx.data.email ?? '').toLowerCase()
  const admins = (ctx.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  return email && admins.includes(email) ? null : new Response('Forbidden', { status: 403 })
}

function page(body: string): Response {
  return new Response(`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo photos · Pantry admin</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:72rem;margin:2rem auto;padding:0 1rem;line-height:1.45;color:#1F1B16;background:#FAF7F2}
  h1{margin:0 0 .25rem} .hint{color:#6B6459;margin:0 0 1.5rem}
  fieldset{border:1px solid #E8E0D4;border-radius:12px;background:#fff;margin:0 0 1.25rem;padding:1rem}
  legend{font-weight:600;padding:0 .4rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.75rem}
  label.opt{display:block;border:2px solid transparent;border-radius:10px;padding:4px;cursor:pointer;font-size:.8rem;color:#6B6459}
  label.opt:has(input:checked){border-color:#A0522D;background:#F5E8E2}
  label.opt img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:7px;background:#F3EFE8}
  label.opt input{margin:.35rem .3rem 0 0}
  .bar{position:sticky;bottom:0;background:#FAF7F2;padding:1rem 0;border-top:1px solid #E8E0D4}
  button{font-size:1rem;padding:.7rem 1.4rem;border-radius:10px;border:0;background:#A0522D;color:#fff;cursor:pointer}
  .err{color:#B3261E} a{color:#8A4522}
</style></head><body>${body}</body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const denied = checkAdmin(ctx); if (denied) return denied
  if (!ctx.env.UNSPLASH_ACCESS_KEY) {
    return page(`<h1>Demo photos</h1><p class="err">UNSPLASH_ACCESS_KEY isn't set in Cloudflare Pages, so Unsplash can't be searched.</p>`)
  }
  const picks = await getDemoPhotoPicks(ctx.env)
  const sections: string[] = []
  for (const r of DEMO_RECIPES) {
    let results: UnsplashResult[] = []
    let error = ''
    try { results = await searchUnsplash(ctx.env, DEMO_PHOTO_QUERIES[r.id] ?? r.title) } catch (e) { error = e instanceof Error ? e.message : String(e) }
    const current = picks[r.id]
    const opts: string[] = []
    if (current) {
      opts.push(`<label class="opt"><img src="${esc(current.thumb)}" alt=""><input type="radio" name="pick:${r.id}" value="keep" checked>Current pick · ${esc(current.photographer)}</label>`)
    }
    for (const [i, p] of results.entries()) {
      if (current && p.id === current.unsplash_id) continue
      const payload: Payload = {
        id: p.id, raw: p.urls.raw, small: p.urls.small, alt: p.alt_description, name: p.user.name,
        userLink: p.user.links.html, photoLink: p.links.html, dl: p.links.download_location,
      }
      opts.push(`<label class="opt"><img src="${esc(p.urls.small)}" alt="${esc(p.alt_description ?? '')}" loading="lazy"><input type="radio" name="pick:${r.id}" value="${b64(payload)}"${!current && i === 0 ? ' checked' : ''}>${esc(p.user.name)} · ♥ ${p.likes}</label>`)
    }
    opts.push(`<label class="opt"><img src="${esc(demoPhotoKey(r.photo!).replace(/^demo\//, '/demo/'))}" alt=""><input type="radio" name="pick:${r.id}" value="bundled"${!current && !results.length ? ' checked' : ''}>Bundled CC0 photo</label>`)
    sections.push(`<fieldset><legend>${esc(r.title)} <span class="hint">· “${esc(DEMO_PHOTO_QUERIES[r.id] ?? r.title)}”</span></legend>${error ? `<p class="err">${esc(error)}</p>` : ''}<div class="grid">${opts.join('')}</div></fieldset>`)
  }
  return page(`<h1>Demo photos</h1>
<p class="hint">Pick a photo for each demo recipe. Choices are kept across reseeds, used by the public demo, tour and landing page, and credited to the photographer on Unsplash.</p>
<form method="POST">${sections.join('')}<div class="bar"><button type="submit">Save photos</button></div></form>`)
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const denied = checkAdmin(ctx); if (denied) return denied
  const form = await ctx.request.formData()
  const db = ctx.env.DB
  await db.prepare(CREATE_DEMO_PHOTOS).run()

  const ids = new Set(DEMO_RECIPES.map(r => r.id))
  const stmts: D1PreparedStatement[] = []
  const done: string[] = []
  const fields: [string, unknown][] = []
  form.forEach((value, key) => { fields.push([key, value]) })
  for (const [key, value] of fields) {
    if (!key.startsWith('pick:') || typeof value !== 'string') continue
    const recipeId = key.slice(5)
    if (!ids.has(recipeId) || value === 'keep') continue
    const seed = DEMO_RECIPES.find(r => r.id === recipeId)!

    if (value === 'bundled') {
      stmts.push(db.prepare('DELETE FROM demo_photos WHERE recipe_id = ?').bind(recipeId))
      stmts.push(db.prepare('UPDATE recipes SET hero_image_key = ? WHERE id = ? AND user_id = ?').bind(demoPhotoKey(seed.photo!), recipeId, DEMO_USER_ID))
      done.push(`${seed.title}: bundled photo`)
      continue
    }

    let p: Payload
    try { p = unb64(value) } catch { continue }
    // Only accept genuine Unsplash URLs (the form round-trips through the browser).
    if (!/^https:\/\/images\.unsplash\.com\//.test(p.raw) || !/^https:\/\/images\.unsplash\.com\//.test(p.small)
      || !/^https:\/\/unsplash\.com\//.test(p.userLink) || !/^https:\/\/unsplash\.com\//.test(p.photoLink)) continue

    await trackUnsplashDownload(ctx.env, p.dl)
    const url = displayUrl(p.raw)
    stmts.push(db.prepare(`
      INSERT INTO demo_photos (recipe_id, unsplash_id, url, thumb, alt, photographer, photographer_url, photo_url, chosen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
      ON CONFLICT(recipe_id) DO UPDATE SET unsplash_id = excluded.unsplash_id, url = excluded.url, thumb = excluded.thumb,
        alt = excluded.alt, photographer = excluded.photographer, photographer_url = excluded.photographer_url,
        photo_url = excluded.photo_url, chosen_at = excluded.chosen_at
    `).bind(recipeId, p.id, url, p.small, p.alt, p.name, `${p.userLink}?${UNSPLASH_UTM}`, `${p.photoLink}?${UNSPLASH_UTM}`))
    stmts.push(db.prepare('UPDATE recipes SET hero_image_key = ? WHERE id = ? AND user_id = ?').bind(url, recipeId, DEMO_USER_ID))
    done.push(`${seed.title}: ${p.name}`)
  }
  if (stmts.length) await db.batch(stmts)

  return page(`<h1>Demo photos saved</h1>
<p>${done.length ? done.map(esc).join('<br>') : 'No changes.'}</p>
<p class="hint">The public demo picks these up within about 5 minutes (edge cache).</p>
<p><a href="/api/admin/demo-photos">Back to the picker</a> · <a href="/demo">View the demo</a></p>`)
}
