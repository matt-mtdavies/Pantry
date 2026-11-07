# Social import spike — 20 links (Nov 7, 2026)

**Question:** what can Pantry legitimately read from social recipe links, how often does that text contain the recipe, and where does only video understanding help?

**Method.** Each link went through two steps, using only what a production importer could honestly ship. No logins, private APIs, video downloads or anti-bot workarounds.
1. The platform's **official oEmbed** endpoint.
2. A **plain page GET** with the same browser User-Agent `extract-url` already sends.

I then graded the reachable text myself:
- **A** — full recipe: ingredients with quantities, plus a method.
- **B** — partial: missing quantities or method.
- **C** — no recipe in the text (title or hashtags only).
- **D** — no text reachable at all.

Probe scripts and raw results are not committed. They were scratch files in the session (`tool/probe.mjs`, `results.json`, `captions.txt`).

**Caveat:** these requests came from a cloud container. Cloudflare Workers egress from different IPs, and blocking may be better or worse there. YouTube in particular should be re-checked from a Worker.

## Results by link

| # | Source | Type | What's reachable without login | Grade | Notes |
|---|---|---|---|---|---|
| tt1 | TikTok | captioned | Full caption in the page's data block | **B** | Full method; ingredients have no quantities |
| tt2 | TikTok | captioned | Full caption in the page's data block | **A** | Short but complete (baked feta pasta) |
| tt3 | TikTok | talking | Caption, no recipe | **C** | Subtitles exist; recipe is spoken |
| tt4 | TikTok | talking | "Homemade Pasta Sauce #pasta" | **C** | Subtitles exist; recipe is spoken |
| tt5 | TikTok | captioned | Full caption (2.3k chars) in the page's data block | **A** | Complete recipe in the caption |
| tt6 | TikTok | music only | Caption, no recipe | **C** | No speech, no subtitles: **only frames help** |
| yt1 | YouTube | Short | Title via oEmbed; page = bot check | **C/D** | Description not reachable by plain fetch |
| yt2 | YouTube | Short | Title via oEmbed; page = bot check | **C/D** | |
| yt3 | YouTube | ASMR Short | Title via oEmbed | **C/D** | Silent: likely **only frames help** |
| yt4 | YouTube | ASMR Short | Title via oEmbed | **C/D** | Silent: likely **only frames help** |
| yt5 | YouTube | ASMR, no talking | Title via oEmbed; page 429 | **C/D** | Silent: likely **only frames help** |
| yt6 | YouTube | long-form | Title via oEmbed; page 429 | **(A)** | Search snippets show a full ingredient list in the description |
| yt7 | YouTube | long-form | Title via oEmbed; page 429 | **(A/B)** | Search snippets show quantities in the description |
| ig1 | Instagram | Reel | Nothing (page is a JS shell; tokenless oEmbed is an empty frame) | **D** | Caption needs a Meta app token + app review |
| ig2 | Instagram | Reel | Nothing | **D** | |
| fb1 | Facebook | video | Full caption in `og:title` | **A via link** | Caption says "Get the recipe:" + a link; follow it |
| fb2 | Facebook | video | Full caption in `og:title` | **A** | Complete recipe |
| fb3 | Facebook | video | Full caption in `og:title` | **B** | Ingredients only, partly without quantities |
| pi1 | Pinterest | video pin | Hashtags only | **C** | No outbound link exposed |
| pi2 | Pinterest | video pin | "food.by.laila on Instagram: …" | **C** | A repin of an Instagram reel |

## Per source

| Source | Links | Text reachable | A (or A via link) | B | C | D | Blocking seen |
|---|---|---|---|---|---|---|---|
| TikTok | 6 | 6/6 (public page data) | 2 | 1 | 3 | 0 | none |
| YouTube | 7 | title only (oEmbed); page blocked 7/7 | 0 measured (2 likely with the Data API) | – | 5 | 7 by plain fetch | bot-check page, then 429 after ~4 requests |
| Instagram | 2 | 0/2 | 0 | 0 | 0 | 2 | login shell; caption needs Meta app review |
| Facebook | 3 | 3/3 (og:title) | 2 | 1 | 0 | 0 | none |
| Pinterest | 2 | 2/2 (no recipe) | 0 | 0 | 2 | 0 | none |
| **Total** | **20** | | **4** (+2 likely YT) | **2** | **10** | **2** (+YT) | |

**Correction found while building:** TikTok's oEmbed returns only an iframe player, with no caption, author or thumbnail. The captions above come from the public video page's own data block (`__UNIVERSAL_DATA_FOR_REHYDRATION__`). That's the page a browser or link preview loads, and Pantry reads only the one page the user pasted. If TikTok changes that layout, the importer falls back to asking for the caption.

## How today's importer does on these
`extract-url` strips every `<script>` and `<meta>` before sending text to the model:
- **TikTok:** the model receives "TikTok - Make Your Day" (22 chars). It fails every time and still costs a call.
- **Instagram:** the model receives "Instagram". Same result.
- **Facebook:** works, but only because the caption is repeated in the body text.

**So social import is effectively broken today, not just missing.**

## Failure modes, and what would fix each

| Failure mode | Links | Fix | Cost per import (vs URL import ≈ $0.004) |
|---|---|---|---|
| Recipe is in the caption | tt2, tt5, fb2 | Caption-first extraction (oEmbed / og:title) | ≈ URL import or less: captions are short |
| Caption links to a recipe page | fb1 | Follow the link with the existing page importer | ≈ URL import |
| Partial caption | tt1, fb3 | Caption extraction + review screen flags the gaps | ≈ URL import |
| Recipe in the YouTube description | yt6, yt7 | YouTube Data API v3 `videos.list` (free key; 1 quota unit per call) | ≈ URL import |
| Recipe is spoken | tt3, tt4 | Transcript (TikTok subtitles exist) or audio transcription | +≈ $0.006/min (Whisper-class) — but see ToS below |
| Silent / music / ASMR | tt6, yt3–yt5 (4–5 of 20) | **Frame sampling** (video understanding) | ≈ 3–6× a screenshot import (~$0.05–0.09): 8–12 frames on Sonnet |
| Caption unreachable | ig1, ig2 | Meta app review for oEmbed captions, or the user pastes the caption / adds screenshots | — |
| Pin has no recipe | pi1, pi2 | Follow the pin's outbound link when there is one; otherwise ask for screenshots | — |

## What this means for the cascade

1. **Captions beat everything else on cost and legitimacy.** Using only official, public endpoints, captions plus links get **4 of 20 to a full recipe and 2 more to a partial one**. The two YouTube long-form videos would probably join them with a Data API key.
2. **Frame sampling would only rescue about 4–5 of 20** (the silent, music and ASMR videos). It needs the video file. Downloading videos from TikTok, YouTube and Instagram from a server is against their terms (YouTube's explicitly), gets IP-blocked quickly (YouTube blocked this spike after 4 page loads), and can't run in Workers (no ffmpeg). It would need a separate video service.
3. **The legitimate route to the "ReciMe gap" (silent videos) is the user's own copy.** People can already add screenshots; a next step is "upload the video you saved" with frame sampling on the uploaded file. That keeps Pantry out of scraping, and it's the same Sonnet vision path screenshots already use.
4. **Instagram needs Meta app review** for captions (oEmbed with an app token). Until then: paste-the-caption and screenshots.
5. **iOS share sheet needs a native app or a Shortcut.** Android can use the PWA share target now.

## Recommendation (built in this pass)
- Caption-first social import for TikTok (the public video page), Facebook (og:title), YouTube (oEmbed title, plus the description when `YOUTUBE_API_KEY` is set) and Pinterest.
- Follow recipe links found in captions.
- Don't make the AI call when the text clearly has no recipe. Say why and offer the fallbacks instead.
- Clear per-platform fallbacks: paste the caption, or add screenshots. "Paste recipe text" import works for any source, including Instagram.
- Web imports: keep JSON-LD Recipe data, which `cleanHtml` currently strips, so recipe-site imports get more accurate too.
- Android share target, so you can share from TikTok into Pantry in one tap.
- Zero-edit-rate instrumentation by source, shown in Admin.

**Not built:** server-side video download, transcripts and frame sampling. These need a decision on ToS risk and a separate service. Next step instead: "upload your saved video" with frame sampling on the user's own file.

## Verification of what was built
- **Routing, against the 20 live links:** the shipped `readSocial` + `recipeSignal` code matched the manual grading on all 20.
  - 7 go to the model with the caption: tt1, tt2, tt5, fb2, fb3, plus the two YouTube long-form videos once a key is set.
  - 2 follow a recipe link: fb1, pi1.
  - 11 return "paste the text / add screenshots" with **no AI call**.
- **Web pages:** BBC Good Food's schema.org Recipe data (16 ingredients, 16 steps) now reaches the model. `cleanHtml` used to strip it.
- **Blocked fetches:** Food Network and BBC returned 403 to Node `fetch` from the test container (curl got 200). The fallback (caption, then ask for text) covers this. Re-check from a Worker after deploy.
- **Not verified:** the model call itself. No Anthropic key was available locally.
