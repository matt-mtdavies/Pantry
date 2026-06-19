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
```
Terracotta (primary): #C4633E
Terracotta dark:       #a8532f
Terracotta bg:         #F5E8E2
Cream bg:              #FAF7F2
Off-white border:      #E8E0D4
Hover bg:              #F3EFE8
Dark text:             #1F1B16
Mid text:              #6B6459
Muted text:            #9C9189
Verify banner bg:      #92400E
Verify banner text:    #FEF3C7
```

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

### After every schema change
Hit `https://myopenpantry.com/api/admin/migrate` after deploying to run any new `CREATE TABLE IF NOT EXISTS` statements.

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
url import (Claude Haiku):  ~$0.004/call
dinner suggestion (Haiku):  ~$0.005/call
tts step (OpenAI tts-1):    ~$0.003/call
tts celebration (tts-1-hd): ~$0.003/call
```
