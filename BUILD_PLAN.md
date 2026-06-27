# Pitchwreck — Build Plan / Backlog

Ordered backlog for building out the MVP. **Source of truth for product decisions is [`SPEC.md`](SPEC.md).**
This file is written so an autonomous build session can pick it up and execute top-to-bottom.

---

## How to work (read first)

- **The app lives in `web/`.** `cd web && npm install && npm run dev` → http://localhost:3000.
- **Verify changes** by loading `/`, `/create`, and `/lab` in a browser and exercising them.
- **Windows + OneDrive gotcha:** `npm run build` can fail with `EPERM unlink .next/...` if the dev
  server is running (it locks `.next`). Either stop the dev server before a production build, or just
  use `npm run dev` + `npx tsc --noEmit` for a quick typecheck. This is environmental, not a code bug.
- **Keep demo mode working:** the app must still run with no keys (it falls back to `MOCK_POSTS`).
  Don't introduce hard crashes when env vars are missing.
- **Commit + push incrementally** with clear messages. `main` is fine (solo project).
- **Honor the locked SPEC decisions:** web/PWA · open signup · paste-AI-text → image flow ·
  Nano Banana images in a *deadpan, eye-catching, NOT slapstick* style · 0–10 rating + crowd reveal ·
  category-extensible schema (Startup Ideas = category #1).

## Human-only prerequisites (an agent CANNOT do these)

- [x] **Enable Google billing** — DONE 2026-06-26; Nano Banana (`gemini-3.1-flash-image`) confirmed generating.
- [x] **`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`** — DONE; in `web/.env.local`, connection verified
      (reads the seeded `startup-ideas` category). `GOOGLE_API_KEY` also present and working. App runs in live mode.
- [ ] (Only if you want "Sign in with Google") configure Google OAuth in the Supabase dashboard +
      Google Cloud credentials. **Magic-link email login needs none of this** — prefer it for MVP.
- [ ] Vercel account for deploy; register `pitchwreck.com` + handles.

> NOTE for the build session: `web/.env.local` on this machine already has working Supabase + Google keys,
> so you CAN test the live feed, image generation, and (once built) auth end-to-end. Don't assume keys are missing.

## Already built ✅

- Next.js 16 PWA scaffold, dark vertical snap-scroll **feed** (demo + live-capable) — `web/src/app/page.tsx`, `web/src/components/`
- **0–10 rating + crowd-average reveal** UI + `submit_rating` RPC (O(1) running aggregates)
- **Posting flow** UI (copy-prompt → paste) + `createPostAction` + `create_post` RPC — `web/src/app/create/`, `web/src/app/actions.ts`
- **Pre-generation validation gate** (business-idea + PG) via Gemini — `web/src/lib/validate.ts`
- **Image wrapper**, default Nano Banana (`gemini-3.1-flash-image`), Together fallback — `web/src/lib/image.ts`
- **Full Postgres schema + RPCs + RLS** — `web/supabase/migrations/0001_init.sql` (already run on the live DB)
- **Dev image lab** at `/lab` (prod-guarded) to eyeball image quality — `web/src/app/lab/`
- Daily post-limit + regen-cap logic; PWA manifest + metadata

---

## Milestone 1 — Auth (CRITICAL — unblocks posting & rating)

Use **Supabase magic-link / email OTP** (works with just URL + anon key, no OAuth setup). Add Google OAuth later as optional.

- [ ] `web/src/middleware.ts` — session refresh via `@supabase/ssr` (the documented Next.js middleware pattern).
- [ ] `web/src/app/login/page.tsx` — email input → `supabase.auth.signInWithOtp({ email })`; "check your email" state.
- [ ] `web/src/app/auth/callback/route.ts` — `exchangeCodeForSession`, redirect to `/`.
- [ ] Sign-out server action; header shows logged-in state (username) + sign-out.
- [ ] Gate posting: `/create` redirects to `/login` when logged out (the action already returns `needs_auth`).
- [ ] `PostCard` rating: when logged out, tapping a score routes to `/login` (instead of local-only reveal).
- **Acceptance:** log in via emailed link → post → rate; refreshing the page keeps you logged in.

## Milestone 2 — Image storage to Supabase Storage

Right now generated images are stored as base64 **data URLs** (heavy in the DB). Move them to Storage.

- [ ] Create a public Storage bucket `post-images` (+ read policy). Document the SQL/dashboard step.
- [ ] In the create flow, decode the Nano Banana base64, upload to `post-images/{post_id}.png`, store the
      **public URL** in `posts.image_url` and the path in `posts.image_path` (stop storing data URLs).
- [ ] Update `web/src/lib/image.ts` / `actions.ts` accordingly (return bytes, or upload in the action).
- **Acceptance:** new posts reference a Storage URL; DB rows are small; images render in the feed.

## Milestone 3 — Posting hardening

- [ ] Post-generation **NSFW image check** (provider safety flag or a cheap classifier); on fail set `status='failed'`, don't store, ask user to retry. (SPEC §8.2)
- [ ] **Regenerate** button on a freshly created post → `/api/posts/:id/regenerate` (cap 3, atomic).
- [ ] Graceful error UX in `/create` for quota/429, validator rejection (already wired), image failure.
- **Acceptance:** full create flow is robust; junk/unsafe never produces a live post; limits hold.

## Milestone 4 — Comments

- [ ] Comment list + add form per post (table + RLS already exist) with pagination.
- [ ] Report a comment.
- **Acceptance:** can comment, read comments, report one.

## Milestone 5 — Moderation

- [ ] Report button on posts → insert into `reports` (table + policy exist); increment `report_count`.
- [ ] Auto-hide at `report_count >= 5` (trigger or RPC) → `status='removed'` pending review.
- [ ] `web/src/app/admin/moderation/page.tsx` — gated (service-role / allowlist) queue of open reports with hide/dismiss actions.
- **Acceptance:** reported content is reviewable and can be hidden.

## Milestone 6 — Feed polish

- [ ] Replace `limit 20` with **cursor/keyset pagination + infinite scroll** (SPEC §4); add `sort=top`.
- [ ] Loading skeletons, better empty state, image fade-in.
- **Acceptance:** smooth endless scroll, no jank on insert.

## Milestone 7 — Profiles

- [ ] Set/edit username (replace the auto `wreck_xxxx`); basic profile page (your posts + rating accuracy).
- **Acceptance:** username editable; profile lists your posts.

## Milestone 8 — PWA + deploy

- [ ] Proper icons (192/512 PNG), install prompt.
- [ ] Deploy to Vercel: **root directory = `web/`**, add env vars (Supabase URL/anon, `GOOGLE_API_KEY`).
- [ ] Confirm `/lab` is unreachable/guarded in prod (the action already refuses when `NODE_ENV=production`).
- **Acceptance:** installable PWA on a live URL; posting + rating work in prod.

---

## Phase 2 — Retention (deferred per SPEC §3, do AFTER the loop works)

- [ ] Leaderboard (top-rated + "craziest" = rating variance with ≥5 votes; `craziness` column exists).
- [ ] Daily challenge / "today's top slop" cadence.
- [ ] Personal accuracy stats + streaks.
- [ ] Referral / "founders club" gating (`referrals` table exists).
- [ ] Second category to prove extensibility (e.g. "Cursed Inventions") — just a `categories` insert + UI selector.

## Before public launch

- [ ] Seed 30–100 starter posts so the feed isn't empty (you + Sam farm them, or a seed script).
- [ ] Double-check no secrets committed (`.env.local` is gitignored; never commit keys).
- [ ] Register `pitchwreck.com` + social handles.
- [ ] Decide whether to remove `/lab` for prod.
