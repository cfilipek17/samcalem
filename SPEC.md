# SPEC — "AI Slop" Startup-Idea Rating Feed

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

## 3. MVP scope (locked decisions)

- **Platform:** Web app / PWA (installable, no app store).
- **Access:** Open signup. Anonymous users can scroll freely; login (Google or magic-link) required only to post/rate/comment.
- **Posting flow:** User copies our prompt → runs it in their *own* ChatGPT/Claude → pastes the result back → server turns it into a comical image. (~$0 LLM cost to us; their AI does the thinking.)
- **Image tier:** Cheap (~1¢ or less) comical images. Provider decision in §4.
- **Rating:** 0–10 per post, once per user; after voting you see the crowd average + your guess-vs-crowd delta.
- **Comments** per post.
- **Leaderboard:** top-rated + "craziest" (highest rating variance with enough votes).
- **Moderation:** NSFW filter at generation time + user-report queue.
- **Cost control:** cap regenerates per post (3) and posts/day per user (5).
- **Name:** TBD — shortlist in §9.

### Retention mechanics to include in MVP (the new requirement)
- **Daily cadence:** a "today's top slop" / daily challenge so there's a reason to come back each day.
- **Personal stats:** your rating accuracy vs the crowd ("you're a harsh judge"), streaks.
- **Leaderboard** visible and live from day one.
- *(Later: founders-club referral gating, remix/fork-an-idea, paid tiers.)*

---

## 4. Image generation — provider decision

Research finding: **Higgsfield does have a public API (~1¢ "Soul" tier), but it's async + credit-expiry billing and tuned for photoreal/cinematic, not clean comical cartoons.** For a simple, cheap, funny MVP there are better defaults:

| Option | ~Cost/image | Integration | Notes |
|---|---|---|---|
| **Together AI — FLUX.1-schnell** ⭐ primary | **~$0.003** | One synchronous `fetch`, OpenAI-shaped, no polling | Cheapest + simplest. Free tier to prototype. |
| **fal.ai — flux/schnell** (backup) | ~$0.003 | Synchronous `fal.run` | Biggest catalog if FLUX isn't cartoonish enough (Qwen, Seedream). |
| **Google "Nano Banana" (Gemini 2.5 Flash Image)** | ~$0.039 | Simple REST | Best at *deliberately funny, prompt-faithful* cartoons. Use as a "premium/funnier" tier. |
| **Higgsfield Soul** | ~$0.009 | Async jobs + credits | Distinctive aesthetic; keep on shortlist, not the default. |

**Recommendation:** Default to **Together FLUX.1-schnell** for cost + simplicity; abstract it behind a `generateImage(prompt) -> imageUrl` function so we can A/B **Nano Banana** for comedy quality on a "make it funnier" button. Comical look comes from prompt engineering: *"flat cartoon illustration, bold outlines, exaggerated comical expression, vibrant colors, satirical startup poster."*

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
- **Create-post:** insert `pending` row (idempotency anchor) → build prompt → `generateImage()` → NSFW check → upload to Storage → mark `ready`. Failure leaves a recoverable row; client retry never double-charges.

## 8. Moderation & rate limits

- **NSFW:** use provider safety flag, else a cheap classifier (e.g. `falconsai/nsfw_image_detection`); above threshold → don't store, ask user to retry.
- **Reports:** insert + increment counter; `report_count >= 5` auto-hides pending review; simple internal mod page over `reports where status='open'`.
- **Limits (server-side, transactional, before any paid API call):** 5 posts/day, 3 regens/post, 1 rating/post, 1 report/target, ~30 comments/hr, + edge IP rate-limit on `/api/posts*`.

---

## 9. Name shortlist

Top 3 from the council:
1. **SlopShop** — *Where the bad ideas are the good ideas.* (on-brand, meme-y; .com likely partly taken)
2. **Unicornucopia** — *A horn of plenty, full of nonsense.* (clever startup in-joke, ownable)
3. **Pitchwreck** — *Post your worst. Watch it burn.* (edgy roast-arena, likely available)

Also: **Slop Club** for the future founders/referral tier. Decision pending.

---

## 10. Cost model (cheap tier)

Image cost scales with **posts, not views** (scrolling serves already-made images). At ~$0.003–0.01/image:
- Launch (1k users): **~$1–2/mo**
- Traction (10k users): **~$25–80/mo** + infra ≈ $100–150/mo all-in
- Semi-viral (100k users): **~$250–800/mo**

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

- [ ] **Name** (§9)
- [ ] **Image provider** — confirm Together FLUX-schnell default + Nano Banana premium (§4)
- [ ] Confirm retention mechanics in MVP scope (§2/§3) — recommended yes
- [ ] Verify Together/fal current pricing + Higgsfield API details before coding
