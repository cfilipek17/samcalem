# BUILD REPORT — Pitchwreck (overnight build, 2026-06-26)

**For:** Calem (read this first thing). **Source of truth:** [`SPEC.md`](../SPEC.md) · backlog [`BUILD_PLAN.md`](../BUILD_PLAN.md) · feed design [`DESIGN.md`](./DESIGN.md).
**Branch:** `main` (everything committed + pushed). **Typecheck:** `npx tsc --noEmit` passes clean (exit 0).

> ⚠️ **Biggest honest caveat up front:** this was built by headless agents that **cannot see the rendered page.** Everything below is verified by typecheck + code reading + cost-controlled reasoning. The **visual** quality of the TikTok/Reels feed and the 9 real images **needs your eyes in the morning** (`cd web && npm run dev` → http://localhost:3000). Nothing here is confirmed "looks good," only "compiles and is wired correctly."

---

## What got built tonight

### 1. DESIGN.md research → feed redesign
- Wrote [`web/DESIGN.md`](./DESIGN.md) (~27 KB): an implementation-ready spec mirroring the TikTok "For You" / Instagram Reels interface, adapted so (a) media is a **still image** (no scrubber/audio) and (b) the "like" slot becomes Pitchwreck's **0–10 rating + crowd-average reveal**. Locked design principles: mobile-first one-post-per-viewport scroll-snap, full-bleed media with gradient scrims, white chrome + drop-shadow for legibility over any AI image, **amber `#FBBF24`** as the brand accent (the Pitchwreck analog of TikTok red).
- Rebuilt `src/components/Feed.tsx` (active-item detection on scroll) and `src/components/PostCard.tsx` (full-bleed media, right-side action rail, author/meta overlay, rating panel + reveal). CSS foundation updated for `100svh`, scroll-snap stops, scrims, and reveal animations; `layout.tsx` viewport handles safe-area insets; `next.config.ts` got `remotePatterns` for Storage image hosts.

### 2. Auth (Milestone 1 — magic-link / email OTP)
- `src/app/login/page.tsx` (email → `signInWithOtp`, "check your email" state), `src/app/auth/callback/route.ts` (`exchangeCodeForSession` → redirect `/`).
- **Session refresh:** implemented in `src/proxy.ts` (Next.js 16 renamed the `middleware` convention to **`proxy`** — note this, it's not `middleware.ts`) backed by `src/lib/supabase/middleware.ts`.
- Sign-out server action; header shows logged-in state; `/create` gates to `/login` when logged out; logged-out rating routes to `/login` instead of a local-only reveal.

### 3. Posting + Supabase Storage (Milestone 2)
- `generateImage()` now returns raw **bytes + mime** (not just a data-URL) so the create flow can upload the PNG.
- Added service-role admin client (`src/lib/supabase/admin.ts`) + `src/lib/storage.ts` upload helper; create action uploads to `post-images/{id}.png` and stores the public URL via a `set_post_image` RPC. Migration written: `supabase/migrations/0002_storage.sql` (bucket + read/insert/update policies + RPC). Degrades gracefully to a data-URL when the service-role key / bucket aren't present yet.

### 4. Real images generated (~$0.36)
- **9 unique images** generated via Nano Banana (`gemini-3.1-flash-image`) across critique rounds, at ~$0.04 each ≈ **$0.36 total** (well under the 12-image hard cap). Content-hash dedupe confirms 9 distinct PNGs in `web/public/seed/`; the curated final set is `idea-1.png … idea-6.png` (6 shown in the feed), with 3 additional round-2 variants kept for reference.
- **Critique rounds** tightened the image prompt (`src/lib/prompts.ts`): the **idea** carries the comedy; the image renders the absurd premise **straight** — a single hero object in sharp focus, premium ad/editorial photography, deadpan and dignified, **NOT** slapstick/cartoonish (per SPEC §4 + your 2026-06-26 note). This is baked into `DEFAULT_STYLE`.

---

## Verified vs. needs human sign-off

| Area | Status |
|---|---|
| `npx tsc --noEmit` | ✅ Verified — passes clean |
| Demo mode (no env keys → `MOCK_POSTS`) | ✅ Preserved by design; graceful fallbacks throughout |
| `.env.local` secrets not committed | ✅ Verified — gitignored, not tracked |
| Auth code path (OTP → callback → session refresh) | ⚠️ Code-verified only — **not exercised end-to-end** (no headless inbox). Needs a real magic-link login test. |
| Posting flow (validate → image → upload → ready) | ⚠️ Code-verified only — **intentionally did NOT trigger real image gen** (budget rule). The Gemini text-validation path is fine to run. |
| Feed/PostCard **visual** rendering | ❌ **Needs your eyes** — agents can't see pixels. Check spacing, scrim legibility, rating reveal, snap feel on a phone-width viewport. |
| Image **comedy/quality** | ❌ **Needs your eyes** — is the deadpan-ad style landing? Swap any weak `idea-*.png`. |

---

## Remaining BUILD_PLAN items (not done tonight)

**Blocked on two HUMAN steps** (agents can't do these — service-role key is a secret, Storage needs the dashboard SQL editor):
1. Paste the real **`SUPABASE_SERVICE_ROLE_KEY`** into `web/.env.local` (currently empty → uploads skipped, images persist as data-URLs).
2. Run **`supabase/migrations/0002_storage.sql`** in the Supabase SQL editor (creates the bucket + policies + `set_post_image` RPC; verified NOT yet applied). Also consider `0003_rating_persisted_score.sql` (re-tap correctness).

After those two, run `node scripts/seed-posts.mjs` (needs the service-role key) to insert **real DB-seeded posts** authored by a "house" user — until then the live feed falls back to `MOCK_POSTS` because the `posts` table is empty. **Real DB-seeded posts also implicitly need a logged-in user context for *user* posting**, but the seed script bypasses that via the admin key.

**Still on the backlog (code not written):**
- **Milestone 3 — posting hardening:** post-gen NSFW image check, regenerate button (cap 3), graceful quota/429 UX.
- **Milestone 4 — comments** (table + RLS exist; UI not built).
- **Milestone 5 — moderation:** report button, auto-hide at `report_count ≥ 5`, admin queue page.
- **Milestone 6 — feed polish:** cursor/keyset **infinite scroll** + `sort=top` (currently `limit 20`), skeletons, image fade-in.
- **Milestone 7 — profiles:** editable username, profile page (your posts + accuracy).
- **Milestone 8 — Vercel deploy** (human-only: root dir = `web/`, env vars, OAuth) + register `pitchwreck.com`.
- **Phase 2 (deferred per SPEC §3):** leaderboard, daily challenge, accuracy stats/streaks, referral gating, 2nd category.

---

## Honest limitations
- **No visual verification.** The single largest risk is that the feed or images look wrong despite compiling. Budget 10 minutes in the morning to scroll it on a phone.
- **No real auth round-trip** (no inbox) and **no real image-gen run in the posting flow** (deliberate, to respect the 12-image budget cap). Both are wired and typecheck-clean but unproven against the live services.
- **Storage + DB seeding are inert** until the two human steps above; the app currently runs on `MOCK_POSTS` / data-URL fallbacks, which is correct demo-mode behavior but is **not** the production data path.
