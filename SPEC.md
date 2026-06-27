# SPEC — Pitchwreck (AI-Slop Startup-Idea Rating Feed)

**Status:** Draft v1 (2026-06-26) · Owners: Calem & Sam
**One-liner:** A vertical-scroll feed where people post AI-generated funny startup ideas as comical images, and everyone rates them 0–10 — then sees how their guess compared to the crowd.

---

## 1. Positioning

The internet (TikTok/IG/YouTube) is actively *purging* AI content. We do the opposite: **the slop is the point.** A feed of intentionally ridiculous AI startup ideas you scroll, rate, and laugh at. Counter-cyclical, contrarian, meme-able — good for free press and a sharp identity.

⚠️ **Positioning is a marketing moat, not a product moat.** It's easily copied once proven. Our durable edge has to be the *game loop + community*, not the slop itself (see §2).

---

## 2. The #1 strategic finding (read this twice)

Every comparable AI-content feed **spiked then cratered**:
- **OpenAI's Sora** (TikTok-style all-AI feed): 3.3M downloads in days → **~1% day-30 retention** (TikTok's is ~32%) → **shut down within months.** "It's AI" was a hook with a 2–4 week half-life.
- **Gas / tbh / Hot-or-Not**: single-mechanic novelty apps that went viral and collapsed once the novelty wore off.

**Conclusion:** The AI-slop feed is a great *acquisition* hook and a proven *retention failure* on its own. The thing that has to carry retention is the **vote → crowd-reveal game**, plus daily cadence, leaderboards, and the community/club layer.

**Therefore the plan changes in one way:** the retention mechanics can't all be "later." The MVP must ship with the game loop + a daily reason to return + a leaderboard. Monetization and the full referral-cult can still come later — but not the core habit loop.

---

## 2b. Product vision beyond startup ideas (architect for it now)

Pitchwreck is **not** "the startup-idea app" — it's "the feed where you post funny AI creations and the crowd rates them 0–10." Startup ideas are just **category #1.** The anti-Sora edge isn't "we do slop," it's "we turn slop into a *game* across formats people want to scroll." Future categories: fake product names, worst AI movie pitches, cursed inventions, AI conspiracy theories, etc.

**Architectural consequence (do this in the MVP schema even though we ship one category):** posts belong to a **category** with its own **prompt template** and validation rule. Adding a new format later = inserting a `categories` row, not a rebuild. MVP seeds exactly one category ("Startup Ideas") so the UI/flow is identical to the original plan.

## 3. MVP scope (locked decisions)

- **Platform:** Web app / PWA (installable, no app store).
- **Access:** Open signup. Anonymous users can scroll freely; login (Google or magic-link) required only to post/rate/comment.
- **Posting flow:** User copies our prompt → runs it in their *own* ChatGPT/Claude → pastes the result back → server turns it into a comical image. (~$0 LLM cost to us; their AI does the thinking.)
- **Image tier:** Cheap (~1¢ or less) comical images. Provider decision in §4.
- **Rating:** 0–10 per post, once per user; after voting you see the crowd average + your guess-vs-crowd delta.
- **Comments** per post.
- **Leaderboard:** top-rated + "craziest" (highest rating variance with enough votes).
- **Pre-post validation:** a fast, cheap text check *before* image generation confirms the pasted text is (a) actually a business/startup idea and (b) PG. Junk or unsafe input never reaches the more expensive image step (§8.1).
- **Moderation:** pre-gen text gate + NSFW filter on the output image + user-report queue.
- **Cost control:** cap regenerates per post (3) and posts/day per user (5).
- **Name:** TBD — shortlist in §9.

### Retention mechanics — DEFERRED to post-MVP (decision 2026-06-26)
MVP ships **feed + posting + rating first.** Important: the single most valuable retention element — the **vote → crowd-reveal** loop — is already part of rating, so it stays *in* the MVP regardless. What's deferred:
- Daily challenge / "today's top slop" cadence
- Personal accuracy stats + streaks
- Leaderboard
- *(Later: founders-club referral gating, remix/fork-an-idea, paid tiers.)*

⚠️ Tradeoff acknowledged: deferring these accepts the Sora-style novelty-cliff risk in §2. Revisit fast if early retention sags.

---

## 4. Image generation — provider decision

Research finding: **Higgsfield does have a public API (~1¢ "Soul" tier), but it's async + credit-expiry billing and tuned for photoreal/cinematic, not clean comical cartoons.** For a simple, cheap, funny MVP there are better defaults:

| Option | ~Cost/image | Integration | Notes |
|---|---|---|---|
| **Together AI — FLUX.1-schnell** ⭐ primary | **~$0.003** | One synchronous `fetch`, OpenAI-shaped, no polling | Cheapest + simplest. Free tier to prototype. |
| **fal.ai — flux/schnell** (backup) | ~$0.003 | Synchronous `fal.run` | Biggest catalog if FLUX isn't cartoonish enough (Qwen, Seedream). |
| **Google "Nano Banana" (Gemini 2.5 Flash Image)** | ~$0.039 | Simple REST | Best at *deliberately funny, prompt-faithful* cartoons. Use as a "premium/funnier" tier. |
| **Higgsfield Soul** | ~$0.009 | Async jobs + credits | Distinctive aesthetic; keep on shortlist, not the default. |

**Decision (updated 2026-06-26):** Start with **Nano Banana (Google Gemini 2.5 Flash Image)** as the default — at MVP volume the cost difference (~4¢ vs ~0.3¢) is a few dollars, and for a comedy app the image quality *is* the product, so optimize funny over cheap. Abstracted behind `generateImage(prompt) -> imageUrl` with `IMAGE_PROVIDER=together` as a one-line switch to the cheaper FLUX-schnell fallback. The cheap validation check (§8.1) also runs on Gemini, so **one Google AI Studio key powers both** image gen and validation. **Image style intent:** the *idea* carries the comedy; the image renders the absurd premise **straight** — polished, eye-catching, believable like a real startup's hero shot, with only a subtle dry twist. NOT slapstick / cartoonish / "trying to be funny." Deadpan > goofy. (See `web/src/lib/prompts.ts`.)

> Open item: keep "upload your own image" as a 1-day fallback if any image API stalls launch.

---

## 5. Tech stack

Next.js (App Router) PWA · Supabase (Postgres + Auth + Storage) · Vercel · server-side `generateImage()`. Mutations run server-side with the service-role key; anonymous reads use anon key + Row Level Security.

---

## 6. Data model (Postgres)

Tables: `profiles` (1:1 with auth.users, daily post counter, `referred_by`), `posts` (caption, source_text, image_prompt, image_url, status, **running rating aggregates** rating_sum/count/avg, craziness, regen_count, report_count), `ratings` (PK `(post_id,user_id)` → one vote per user), `comments`, `reports` (polymorphic, unique per reporter+target), `referrals` (for later).

Key indexes: feed `(created_at desc) where status='ready'`, ranked `(rating_avg desc, rating_count desc)`, craziness `where rating_count>=5`.

RLS: posts selectable by all when `status='ready'`; all aggregate writes go through `SECURITY DEFINER` RPCs so clients can't tamper.

## 7. Core mechanics

- **Rating + crowd average:** single atomic RPC `submit_rating(post_id, score)` — inserts the vote (`on conflict do nothing` = idempotent), updates running `rating_sum/count/avg` in O(1), returns `{crowd_avg, count, your_score, delta}`. Never scans all rows.
- **Feed pagination:** cursor/keyset (no OFFSET), default newest, `sort=top` ranked. Each page returns viewer's `my_score` in one batched query (no N+1).
- **Create-post:** insert `pending` row (idempotency anchor) → **validate pasted text (PG + is-it-a-business-idea gate, §8.1)** → on fail, return redo options and stop *before any image cost* → build prompt → `generateImage()` → NSFW check on the image → upload to Storage → mark `ready`. Failure leaves a recoverable row; client retry never double-charges.

## 8. Moderation & rate limits

### 8.1 Pre-generation gate (text) — runs before any image is made
One cheap LLM classifier call on the pasted text returns structured JSON:
`{ is_business_idea: bool, is_pg: bool, reason: string, fix_suggestions: string[] }`.

- **Pass** (business idea AND PG) → proceed to image generation.
- **Fail** → skip image gen entirely; show a quick redo screen with ~3 one-tap options:
  - **Edit text** (user fixes/repastes — $0 AI cost, the default free path)
  - **Try again** (re-run their own AI with the prompt again)
  - **Auto-fix** (optional) — same cheap model rewrites it into a PG business idea (~$0.0003)
- **Provider:** a small/cheap model — Groq or Together Llama, or Claude Haiku — for the "is it a business idea" judgment; optionally pair with OpenAI's **free moderation endpoint** for the safety half. ~$0.0001–0.0005 per check.
- **Why it pays for itself:** the text check is ~10–50× cheaper than an image, so gating here *reduces* total spend by killing wasted image gens on junk/unsafe input.

### 8.2 Image + reports
- **NSFW (image):** use provider safety flag, else a cheap classifier (e.g. `falconsai/nsfw_image_detection`); above threshold → don't store, ask user to retry. (Defense-in-depth: text can pass but an image still come out weird.)
- **Reports:** insert + increment counter; `report_count >= 5` auto-hides pending review; simple internal mod page over `reports where status='open'`.
- **Limits (server-side, transactional, before any paid API call):** 5 posts/day, 3 regens/post, 1 rating/post, 1 report/target, ~30 comments/hr, + edge IP rate-limit on `/api/posts*`.

---

## 9. Name shortlist

**CHOSEN: Pitchwreck** — *Post your worst. Watch it burn.* (edgy roast-arena, fits the 0–10 rating + future leaderboard; domain likely available — grab it).

Runners-up kept for reference: **SlopShop**, **Unicornucopia**. **Slop Club** reserved for the future founders/referral tier.

> TODO: register pitchwreck.com (+ handles) before launch.

---

## 10. Cost model (cheap tier)

Image cost scales with **posts, not views** (scrolling serves already-made images). At ~$0.003–0.01/image:
- Launch (1k users): **~$1–2/mo**
- Traction (10k users): **~$25–80/mo** + infra ≈ $100–150/mo all-in
- Semi-viral (100k users): **~$250–800/mo**

The pre-generation text check (§8.1) adds ~$0.0001–0.0005 per attempt — far cheaper than an image, and it *reduces* net cost by blocking junk before the image step.

Infra (Supabase + Vercel + Cloudflare/Supabase storage) is ~$0–25/mo until real volume. Self-hosting an open-source model to "save money" would *cost more* until massive scale — don't.

---

## 11. Build milestones

1. **Skeleton:** Next.js PWA + Supabase project + auth + DB schema/RPCs.
2. **Riskiest path first:** anon feed read + create-post with inline image generation + rating RPC (proves the 3 hardest paths end-to-end).
3. Comments, reports/moderation, rate limits.
4. Retention layer: daily challenge, personal accuracy stats, leaderboard.
5. Polish, PWA install, seed content, soft launch to referral list.

---

## 12. Open decisions

- [x] **Name** — Pitchwreck (§9)
- [x] **Image provider** — Together FLUX-schnell default + Nano Banana premium (§4)
- [x] **Retention scope** — deferred to post-MVP; crowd-reveal stays in rating (§3)
- [ ] Register pitchwreck.com + social handles
- [ ] Get a Together AI API key
- [ ] Pick the cheap classifier provider for the pre-gen gate (Groq / Together / Haiku) (§8.1)
- [ ] Verify Together/fal current pricing before coding
