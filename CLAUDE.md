# Pantry — Claude Code Project Memory

## What this is
A recipe management web app. Users save, share, discover, and cook from a personal recipe collection. Built as a React SPA on Cloudflare Pages with a serverless backend via Pages Functions.

**Live URL:** https://myopenpantry.com  
**Dev branch:** `claude/recipe-app-build-tywp5u`  
**Repo:** `matt-mtdavies/Pantry`

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | CSS Modules + design tokens (no Tailwind) |
| Routing | React Router v6 |
| Backend | Cloudflare Pages Functions (file-based, `functions/` dir) |
| Database | Cloudflare D1 (SQLite) — binding `DB` |
| File storage | Cloudflare R2 — binding `R2` |
| AI (recipes) | Anthropic Claude API — `claude-haiku-*` for URL/dinner, `claude-sonnet-*` for screenshots |
| AI (voice) | OpenAI TTS — `tts-1` for cook mode steps, `tts-1-hd` for celebration |
| Email | Resend API |
| Auth | Session cookies (`pantry_session`) + JWT-style sessions in D1 |

---

## Design System

### Colour palette
Always use the CSS variables from `src/index.css`, not raw hexes.
```
--accent          #A0522D   Sienna — primary actions, links, brand
--accent-strong   #8A4522   Hover / pressed accent
--terra-light     #F5E8E2   Accent tint backgrounds
--sage / -strong / -light / -text   Secondary: tags, done states, success
--ivory           #FAF7F2   Page background
--border          #E8E0D4   Borders
--surface         #F3EFE8   Hover / placeholder backgrounds
--ink             #1F1B16   Body text
--ink-soft        #6B6459   Secondary text (use for all muted TEXT — passes AA)
--ink-muted       #9C9189   Icons + placeholders only (fails AA as text)
--error / --error-tint       #B3261E / #FBEAE8   Errors — never use --accent for errors
--warning / --warning-tint   #92400E / #FEF3C7   Warnings, verify-email banner
--ink-rgb / --ivory-rgb / --accent-rgb          For rgba() overlays
```
Shared UI: `.form-error` / `.form-hint` (index.css), `<LoadError onRetry>` for failed
fetches (never show the empty state on error), `<RecipeCard>` is the only recipe card
(`compact` for 2-up grids), `<ServingsStepper>` for serving scalers.
Don't add `outline: none` to focus styles — the global `:focus-visible` ring must show.
New surfaces target 44px touch targets and WCAG 2.1 AA contrast. On the dark `--ink` bars use `--ivory` (or ivory ≥ .72 alpha) for text, never `--accent`/`--ink-soft`. `.sr-only` is in index.css.

### Design tokens (defined in `src/index.css`)
```css
--sp-1 … --sp-20   /* spacing scale */
--radius-sm/md/lg/full
--font-display      /* headings */
--font-ui           /* body/UI */
--text-xs/sm/base/lg/xl/2xl/3xl/4xl
--nav-height        /* fixed nav bar height */
--banner-height     /* verify email banner (0px when hidden) */
--max-wide          /* max content width */
```

### Layout conventions
- `page-shell` → full-height wrapper
- `page-main` → main content area, respects `--nav-height` + `--banner-height`
- `wide-col` → centred content column at `--max-wide`
- Fixed nav at top; mobile bottom tab bar; FAB for primary action

---

## Architecture

### Frontend (`src/`)
```
src/
  pages/          # One file per route (PageName.tsx + PageName.module.css)
  components/     # Shared components
  hooks/          # useAuth, etc.
  lib/api.ts      # All fetch calls to /api/*
  types/index.ts  # Shared TypeScript interfaces
```

### Backend (`functions/`)
```
functions/
  _middleware.ts          # Auth: validates session cookie, sets ctx.data.userId + ctx.data.email
  env.d.ts                # Env interface (DB, R2, API keys)
  api/
    auth/                 # Login, signup, verify, reset password
    admin/
      stats.ts            # Admin dashboard stats
      users.ts            # Admin user list
      migrate.ts          # Run DB migrations (hit GET /api/admin/migrate after deploy)
    tts.ts                # OpenAI TTS proxy
    recipes/              # CRUD + import from URL/screenshot
    chefs.ts              # Chef discovery list
    follows/[id].ts       # POST=follow, DELETE=unfollow
    users/[id].ts         # Public profile
    ...
```

### Auth flow
- Session stored in `sessions` table, ID in `pantry_session` cookie (HttpOnly)
- Middleware at `functions/_middleware.ts` validates every `/api/*` request except public prefixes
- `ctx.data.userId` and `ctx.data.email` available in all protected handlers
- Admin endpoints check `ctx.data.email` against `ADMIN_EMAILS` env var (comma-separated)

### Demo account
Fixed demo login for reviews: **demo@myopenpantry.com / TryPantry-Demo-2026** (throwaway; holds no real data).
Seed content lives in `shared/demoContent.ts` (10 recipes, 2 collections, 3 favourites, a CC0/public-domain photo
for every recipe in `public/demo/` with credits in the file, 1 share link); credentials stay server-side in `functions/lib/demo.ts`.
- **(Re)seed:** sign in as an admin and open `/api/admin/seed-demo` → "Reseed now" (POST). Run `/api/admin/migrate` first on a fresh DB.
  Resets the demo account to the exact seed state in one D1 batch (all-or-nothing) and signs out its sessions.
  Every delete is scoped to the demo user ID / demo recipe + collection IDs; refuses if the demo email belongs to another account.
- **Premium demo photos (Unsplash):** an admin opens `/api/admin/demo-photos`, which searches Unsplash (`UNSPLASH_ACCESS_KEY`)
  with tuned queries and lets them pick a photo per demo recipe. Picks live in `demo_photos`. They are
  **hotlinked** from images.unsplash.com (never copied), trigger Unsplash's download endpoint on selection, and are
  **credited** ("Photo by X on Unsplash", `<PhotoCredit>`) on the demo recipe page, landing hero, demo grid and the signed-in
  demo account's recipe page. Reseeding uses the picks; recipes without a pick fall back to the bundled CC0 photo.
  The public demo reads picks from `GET /api/demo/photos` (public, edge-cached 5 min; saving in the picker clears it).
- **Every demo surface must show a photo**: landing hero, "Stuck on dinner?" panel and demo strip; `/demo` grid and recipe pages;
  every tour scene (incl. the recorded dinner-picker ideas in `src/lib/demoPicker.ts`, which are demo recipes); the
  shared demo link; the signed-in demo account. Read photos via `getDemoRecipes()` / `getDemoRecipe()` after
  `useDemoPhotos()` is ready, never hard-coded paths, so picks apply everywhere.
- The demo user is `is_public = 0`, so it is excluded from Explore, Leaderboard, Chefs, Community and public profiles.
  `PUT /api/me` can't flip it public. Keep any new public query filtering on `u.is_public = 1`.
- **Public read-only demo** (`/demo`, `/demo/recipe/:id`, `/demo/recipe/:id/cook`) renders the *seed content*
  bundled from `shared/demoContent.ts`, not the live account, so no one can deface it (the demo login is shared).
  It makes no API calls besides images and the read-only `GET /api/demo/photos`; `/api/images/demo/*.jpg` falls back to the
  static file if R2 hasn't been seeded. Keep it that way: no writes or AI calls from `/demo`.
- Locally, test with `wrangler pages dev dist --binding ADMIN_EMAILS=…` (don't pass `--d1 DB`; it ignores the migrated local DB).

### Front door
- `/` renders `LandingPage` for logged-out visitors and `HomePage` when signed in (`HomeOrLanding` in `App.tsx`).
  Landing + demo pages are lazy-loaded. The sign-in card is `<AuthCard>` (shared with `/auth`).
- Landing copy must only sell what exists (import, cook mode, collections, sharing, units, dinner picker, export).
- `useDocumentMeta` / `useRecipeMeta` set per-page title, description, canonical and Recipe JSON-LD.
  `public/robots.txt` + `public/sitemap.xml` (regenerate the sitemap if demo recipe IDs change).

### Demo tour
- `/tour` (`src/pages/tour/`): 7 scenes / 5 chapters, autoplay, skippable. Scenes use real components plus the demo
  seed content. Import and dinner picker are **recorded replays** (labelled), so the tour never calls AI endpoints.
- `<TourPill>` is the always-visible entry on landing and demo pages. Progress lives in sessionStorage
  (`lib/tourState.ts`), so the pill offers "Resume tour" after a mid-tour exit.

### Recipe import (web, social, text)
- `POST /api/extract-url` routes by host (`functions/lib/social.ts`):
  - **Web pages:** schema.org Recipe JSON-LD plus the visible text go to Haiku.
  - **TikTok:** caption from the public video page's data block.
  - **Facebook:** caption from `og:title`.
  - **YouTube:** oEmbed title, plus the description when `YOUTUBE_API_KEY` is set.
  - **Pinterest:** og tags plus the outbound link.
  - **Instagram:** can't be read without Meta app review, so the user is asked to paste the caption.
- `recipeSignal()` decides before any AI spend.
  - A strong caption is extracted.
  - A caption link ("get the recipe: …") is followed.
  - Otherwise return 422 with `code: no_recipe_in_caption | caption_unreachable` and **no AI call**. The import page then opens the paste-text panel.
- `POST /api/extract-text` imports pasted text. The prompt and model call are shared in `functions/lib/extractRecipe.ts`.
- Never add logins, private platform APIs, anti-bot workarounds or video downloads here. See `docs/briefs/2026-11-07-social-import-spike.md`.
- `import_outcomes` (recipe_id, user_id, source, edited) records whether each import was saved without edits. Admin shows the zero-edit rate by source. Reseeding the demo clears its rows.
- Android share sheet: `share_target` in `public/manifest.json` → `/import?url=&text=&title=` auto-imports the first link.

### After every schema change
Hit `https://myopenpantry.com/api/admin/migrate` after deploying to run any new `CREATE TABLE IF NOT EXISTS` statements.

---

## Auth System

Dual-mode: magic link (passwordless) + email/password. No third-party auth service.

### Magic link flow
1. `POST /api/auth/send-link` — rate-limits (3/15min per email, 5/15min per IP), stores 64-char hex token in `magic_tokens` (15min TTL), sends email via Resend.
2. `GET /api/auth/verify?token=…` — returns plain HTML page with a `<form method="POST">` button. No JS. Prevents email scanners from consuming the token (they prefetch GET, won't submit POST).
3. `POST /api/auth/verify` — marks token used, upserts user, creates session, sets `pantry_session` cookie, redirects via inline `<script>window.location.replace('/auth/complete?s=<sessionId>')` so Safari ITP fallback works.

### Password flow
- PBKDF2-SHA256, 100,000 iterations, stored `salt:hash` (hex).
- Register: allows adding a password to an existing magic-link account. New accounts start `email_verified = 0`.
- Login: always returns "Incorrect email or password" — never reveal if the email exists.

### Session cookie
```
pantry_session=<16-byte-hex>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000
```

### Middleware
`functions/_middleware.ts` — validates cookie on all `/api/*` except public prefixes. Fallback: `Authorization: Bearer <id>` header for Safari ITP. Sets `ctx.data.userId`, `ctx.data.email`.

---

## Onboarding

Full-screen overlay, shown once on first sign-in. `localStorage('onboarding-complete')` gate.

- `<Onboarding onClose={fn} />` above the router in `App.tsx`.
- `OnboardingContext` with `open()` for re-triggering from any component.
- 3 slides: Welcome · Save recipes · Cook mode. Each has an inline SVG illustration.
- Swipe navigation via `touchstart`/`touchend` (50px threshold). Dot nav + Next/Skip buttons.
- Last slide CTA: "Get cooking →".

---

## Invite System

Any signed-in user generates a 10-char unambiguous token (`POST /api/invites`). Public landing page at `/invite/:token`.

- Token charset excludes ambiguous chars (no `0/O`, `1/I/l`). Collision-checked up to 5 retries.
- Invite page: shows inviter's avatar + name, 3 feature bullets, "Accept invite →" CTA → `/auth?mode=register&invite=<token>`.
- Logged-in visitors see "You're already on Pantry!" + link to app instead of the CTA.
- Token stored in `sessionStorage('pantry_invite')` before redirect so registration can record who invited them.
- Sharing: `navigator.share({ title, text: \`${msg} ${url}\` })` — URL embedded in text, not a separate param (separate param = two iMessage bubbles).
- `invite_tokens` table: `token, user_id, created_at, used_at, used_by_user_id`.

---

## Key Database Tables
```sql
users           -- id (TEXT/UUID), email, display_name, country, avatar_id, avatar_image_key,
                   email_verified, is_admin, created_at (unixepoch)
sessions        -- id, user_id, expires_at
recipes         -- id, user_id, title, description, ingredients, steps, cuisine, image_key,
                   is_public, created_at, updated_at
recipe_ratings  -- recipe_id, user_id, rating (1-5), created_at
user_follows    -- follower_id, following_id, created_at (composite PK)
invite_tokens   -- token, created_by, used_by, created_at, used_at
ai_usage_log    -- call_type (screenshot/url/dinner/tts), date (YYYY-MM-DD), count
```

---

## Environment Variables (Cloudflare Pages)
```
DB                  D1 database binding
R2                  R2 bucket binding
ANTHROPIC_API_KEY   Anthropic API key
OPENAI_API_KEY      OpenAI API key (for TTS)
RESEND_API_KEY      Resend email API key
RESEND_FROM_EMAIL   From address for emails
APP_URL             https://myopenpantry.com
ADMIN_EMAILS        matt.t.davies@gmail.com (comma-separated)
CF_ZONE_ID          Cloudflare zone ID (32-char hex, no trailing chars)
CF_API_TOKEN        Cloudflare token with Zone Analytics Read permission
YOUTUBE_API_KEY     Optional — YouTube Data API v3 key; lets imports read video descriptions
```

---

## Important Quirks & Fixes

### iOS audio (Web Audio API)
`new Audio().play()` after `await fetch()` is blocked by iOS user gesture chain.
Solution: create and `.resume()` an `AudioContext` **synchronously** in the click handler before any `await`. See `src/pages/CookModePage.tsx`.

### iOS share (single message)
`navigator.share({ text, url })` sends two separate iMessage bubbles.
Solution: embed URL in the text string: `navigator.share({ text: \`${text} ${url}\` })`.

### Mobile nav layout
6 items (5 destinations + 1 action) have no natural centre in a tab bar.
Solution: FAB pattern — 5 destination tabs in `mobileNav`, `/import` as a floating `+` circle above the bar. See `Navigation.tsx` + `Navigation.module.css`.

### Email verify banner
`document.body.classList.toggle('has-verify-banner', showBanner)` drives a CSS `--banner-height` custom property that shifts all fixed-position content down. Pages must use `calc(var(--nav-height) + var(--banner-height, 0px))` for top padding.

### Prices & currency
Recipes store `cost_per_serving` + `cost_currency` (whatever currency the estimate was made in).
**Always display prices in the viewer's currency** — never raw or USD:
- `useCurrency()` (`src/hooks/useCurrency.tsx`) → `{ currency, convert, formatCost }`. Viewer currency =
  profile `country` → currency, else browser region, else USD.
- Rates: `GET /api/fx` (public) — live from open.er-api.com, edge-cached 12h, falls back to
  `FALLBACK_USD_RATES` in `shared/currency.ts` (shared by app + API).
- AI estimates (extract, extract-url, dinner-suggestion, backfill) are generated in the user's currency.
- Explore's cost filter sends `currency=`; `/api/search` converts in SQL before comparing.

### Cloudflare Analytics
Use `httpRequests1dGroups` (available on all plans). `httpRequestsAdaptiveGroups` requires a paid plan and silently returns empty data.

---

## Mobile Navigation Structure
```
Desktop nav:  [Pantry brand] [My Recipes] [Explore] [Community] [Chefs] [Add Recipe] [invite btn] [avatar]
Mobile tabs:  [Recipes] [Explore] [Community] [Chefs] [Profile]
Mobile FAB:   Floating + button (terracotta circle) above tab bar → /import
```

---

## AI Cost Reference
```
screenshot (Claude Sonnet): ~$0.015/call
url import (Claude Haiku):  ~$0.004/call (web pages + social captions)
text import (Claude Haiku): ~$0.003/call
dinner suggestion (Haiku):  ~$0.005/call
tts step (OpenAI tts-1):    ~$0.003/call
tts celebration (tts-1-hd): ~$0.003/call
```
