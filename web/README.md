# Pitchwreck (web)

The Pitchwreck app — a vertical-scroll feed of funny AI startup ideas you rate 0–10.
Next.js 16 (App Router, PWA) + Supabase + Together AI. Product spec: [`../SPEC.md`](../SPEC.md).

## Run it locally (demo mode — no keys needed)

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000. With no environment configured it runs in **demo mode** with
sample posts, and the 0–10 rating reveal works locally.

## Go live (connect real data + image generation)

1. **Create a Supabase project** at https://supabase.com → grab the Project URL + anon key
   (Project Settings → API).
2. **Run the schema:** open Supabase → SQL Editor → paste [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → Run.
3. **Get a Together AI key** at https://api.together.xyz/settings/api-keys (free tier is fine to start).
4. **Configure env:** copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `TOGETHER_API_KEY`
5. `npm run dev` again — the feed now reads from Supabase and posting generates real images.

## What's built (MVP milestone 1)

- ✅ Vertical snap-scroll feed (demo + live-capable)
- ✅ 0–10 rating with crowd-average reveal (`submit_rating` RPC, running aggregates)
- ✅ Posting flow: copy-prompt → paste → **validation gate** → image gen → post (`create_post` RPC)
- ✅ Pre-generation gate (business-idea + PG check) and daily post-limit, image wrapper (Together FLUX-schnell)
- ✅ Category-extensible schema (startup ideas = category #1)
- ✅ PWA manifest + metadata

## Not yet built (next milestones)

- ⬜ **Auth UI** (Google / magic-link) — posting/rating requires login; the backend is ready, the screens aren't
- ⬜ Comments, report/moderation UI, NSFW image check
- ⬜ Upload to Supabase Storage (currently stores the provider image URL)
- ⬜ Retention layer: leaderboard, daily challenge, streaks (deferred — see SPEC §3)

## Structure

```
src/app/page.tsx        feed (server component)
src/app/create/page.tsx posting flow
src/app/actions.ts      server actions: createPost, submitRating
src/components/         Feed, PostCard (rating UI)
src/lib/                supabase clients, image gen, validation, prompts, types
supabase/migrations/    database schema + RPCs
```
