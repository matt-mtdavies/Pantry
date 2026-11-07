# Pantry — Revised Build Brief: Quick Fixes, Front Door, Demo Tour, Import Spike

**Nov 7, 2026. Replaces "Social Import, Landing Page, Demo Tour" (Nov 6).** It takes in the hands-on loop review and corrects the parts of that review and brief that don't match the code.

- Repo: `matt-mtdavies/Pantry`, base branch `claude/recipe-app-build-tywp5u`. Live: https://myopenpantry.com.
- Design system: warm editorial cookbook (Fraunces / Source Serif, sienna + sage on ivory). Keep it.
- Demo account: `demo@myopenpantry.com`. Reseed at `/api/admin/seed-demo` (admin only).

## What changed from the Nov 6 brief, and why

| Nov 6 brief | Revised | Why |
|---|---|---|
| Headline "The recipe app that knows what's in your kitchen" | A headline about import + cook, e.g. "Every recipe you save, ready to cook." | No pantry exists. The old brief's own rule says sell what is real. |
| "Explore the demo" signs visitors in to the demo account | A **read-only public demo** served like share links. No session, no writes, no AI calls. | Signing visitors in automatically is a backdoor: one shared editable account, anonymous AI spend, and reseeds sign out every visitor. |
| Tour runs live imports and dinner picks | Tour **replays recorded results** for import and dinner picker, and shows live demo recipe content | Live AI costs money, takes ~20 s, can fail, and would duplicate recipes on the shared account. |
| Video frame sampling, on-device extraction, share sheet | **Spike first**, measuring success, cost and blocking per source. No pipeline commitment yet. | TikTok/Instagram block downloads. Workers can't run ffmpeg. The web app has no on-device step. iOS has no web share target. |
| "Report bugs, don't fix them" | Step 1 quick fixes are in scope | Otherwise they keep sitting in the "still open" list. |

## Review corrections (verified against code + live data, Nov 7)

- **"Home sidebar fails to render" (the review's P0): not a bug. Dropped.** The home page has no sidebar and never had one. "Needs attention" is a banner that shows only when an import failed. The live demo account has 0 such recipes, so it correctly doesn't render. `/needs-attention` is also reachable directly.
- **"Chicken traybake is the only seeded recipe without a photo."** The seed gives only Shakshuka a photo. On the live account, 9 of 10 now have photos because Profile → "Recipe improvements" (image backfill) was run on the demo account during review. So the account was *not* left at its seed state. Reseed it.
- **"Costs in A$, no currency setting."** By design: currency follows Profile → Country, else browser region. Fine as is. A clearer label is optional, not a fix.
- **"Thai filter returns non-Thai cards".** The filter matches the exact `thai` tag, but cards show only their first 2 tags. Not a matching bug. A possible later improvement is to show the matched tag.
- **"Screenshot picker doesn't open."** A standard `<input type="file">` is there. Automated browsers often show no native picker. Verify on a real phone before calling it broken.

## Step 1 — Quick fixes (in progress)

1. **Branded 404** for unmatched URLs, reusing the share/invite not-found pattern. Today an unknown URL renders a blank page.
2. **Import page.**
   - URL field first, screenshot drop zone second.
   - No "Claude" in user-facing copy.
   - Strip source suffixes from imported titles ("Chilli con carne recipe" → "Chilli con carne").
   - Dedupe: importing a URL you already saved offers the existing recipe.
3. **Explore ranking.** Rank by a Bayesian-weighted rating so one 5★ rating doesn't beat several 5★ ratings. Keep the "ranked by rating" copy true.
4. **Cook mode.** Escape closes the celebration overlay, and it gets a visible close button.
5. **Small polish.** The "In: …" collection pill no longer clips. Fix the Profile typo "costfor".

Acceptance:
- Each fix verified locally (desktop and 390px where layout is involved).
- `tsc` and the build pass.
- No change to recipe, cook-mode, collection or sharing behaviour beyond the items above.

## Step 2 — Front door: landing page + read-only demo

- `/` for logged-out visitors renders a landing page, not a redirect to `/auth`. Logged-in users still get their recipes.
- Landing page content:
  - Honest headline.
  - The loop in 3–4 steps, all real: import → cook mode → collections → share.
  - "What's for dinner tonight?" shown as a feature.
  - Trust line: your recipes are exportable any time (`/api/me/export` exists).
  - Embedded sign-in / create-account card.
  - No pricing claims beyond "free".
- **Read-only demo at `/demo`.** A public API that returns the demo account's recipes and collections, and only the demo account's.
  - It renders with the real recipe card, recipe page and cook-mode components, with editing disabled.
  - Every write or AI action becomes a "Create your free account" prompt.
  - Rate-limited and edge-cached.
  - Never exposes other users' data.
- **SEO.** Shared and demo recipe pages get titles, descriptions and Recipe JSON-LD.

Acceptance:
- A logged-out visitor can reach demo recipes and cook mode with no account and no session cookie.
- No AI endpoint is reachable anonymously.
- The demo can't be modified from `/demo`.
- No copy claims a feature that doesn't exist.

## Step 3 — Demo tour (on top of `/demo`)

- 6–8 scenes, about 2–3 minutes, with chapters, skippable throughout. Build the **end card with CTA first**.
- Scenes:
  1. Recipe box.
  2. Import (recorded BBC chilli result).
  3. Reading + serving scaler.
  4. Cook mode.
  5. Dinner picker (recorded result).
  6. Collections + sharing.
  7. End card.
- The tour entry stays visible for the whole tour, including after a mid-tour exit.
- Verified at desktop and 390px.

## Step 4 — Social import spike (report before building)

- Run 20 real links: TikTok, Instagram Reels, YouTube incl. Shorts, Facebook, Pinterest. Mix captioned, silent and ASMR videos.
- Per source, report:
  - Can we fetch caption/description from a Worker?
  - Does a transcript exist?
  - Is the platform blocking requests?
  - Extraction success.
  - Cost per import.
  - Which failures only frame sampling would fix.
- **Hypothesis to test:** caption + description extraction covers most recipe videos at URL-import cost. Video frames need a separate service (not Workers) and are only worth building if the spike shows a large silent-video gap.
- Mobile capture: Android PWA share target is possible. iOS needs a native app or a Shortcut. Decide after the spike.
- Instrument a **zero-edit rate**: share of imports saved without edits.

## Step 1b — Remaining review fixes (done on `claude/determined-ritchie-wrwelh`, awaiting merge)

- **Units.**
  - A Metric / Imperial toggle sits next to the serving scaler on the recipe page and the guest share page. The share page also gets the serving scaler.
  - The choice is remembered per device and also applies to cook mode.
  - Order of precedence: device choice, then Profile → Unit system, then browser region (US → imperial).
  - Saving the profile setting clears the device choice.
- **Print.**
  - A print button on the recipe page, plus print styles for the recipe and share pages.
  - Printing hides nav, buttons, controls and dialogs, keeps the hero small and avoids splitting a step across pages.
- **Explore.**
  - Sort control: Top rated (Bayesian), Newest, Quickest.
  - Recent searches (last 6, per device) appear when the empty search box is focused. They are saved on Enter or when a result is opened.
  - The hero copy no longer says "ranked by rating", since the order now depends on the sort.
- **Hero image.** Now scales with the viewport: 16:9 up to min(70vh, 640px) on desktop, 4:3 on phones. It was a fixed 480px crop.

## Later (not scheduled)

- Mobile (390px) pass of the whole app.
- Real HTTP 404 status for unknown URLs (the branded 404 is currently rendered client-side with a 200).

## Rules

- No pantry inventory work.
- No pricing/paywall work.
- No merge without Matthew. No deploy without his go-ahead.
- No real user's data touched. Reseed the demo after any test that dirties it.
- No "Claude" in user-facing copy.
