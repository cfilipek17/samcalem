// Pitchwreck — seed starter posts so the live feed isn't empty (BUILD_PLAN
// "Before public launch" + FIXER issue: empty `posts` table -> page.tsx falls
// back to MOCK_POSTS while live=true).
//
// What it does (NO image generation — uses the already-rendered files in
// web/public/seed/*.png, so it costs $0 and never calls the Gemini image API):
//   1. Ensures a dedicated "house" auth user exists (creates it via the admin
//      API; the on_auth_user_created trigger makes its profile row).
//   2. Inserts `status='ready'` posts authored by that user, with image_url
//      pointing at the public /seed/idea-N.png files, plus a spread of
//      pre-baked rating aggregates so the crowd-reveal has something to reveal.
//   3. Idempotent: re-running won't duplicate (matches on caption).
//
// Requirements (HUMAN STEP — an agent can't supply these):
//   - web/.env.local must contain NEXT_PUBLIC_SUPABASE_URL and a REAL
//     SUPABASE_SERVICE_ROLE_KEY (service_role JWT from Supabase -> Project
//     Settings -> API). The anon key cannot bypass RLS to insert posts.
//
// Run from the web/ folder:   node scripts/seed-posts.mjs
//
// Storage note: these rows reference /seed/*.png (bundled static assets), which
// render immediately and need no Storage bucket. Real user posts still go
// through Supabase Storage once 0002_storage.sql is applied + the key is set.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Minimal .env.local parser (no dotenv dependency) ---
function loadEnv() {
  const path = resolve(__dirname, "..", ".env.local");
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return {};
  }
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[m[1]] = val;
  }
  return env;
}

const env = { ...loadEnv(), ...process.env };
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_ROLE) {
  console.error(
    "[seed] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in web/.env.local.\n" +
      "       Paste the real service_role JWT (Supabase -> Project Settings -> API) and re-run.",
  );
  process.exit(1);
}

const HOUSE_EMAIL = "house@pitchwreck.local";
const HOUSE_USERNAME = "pitchwreck";
const CATEGORY_ID = "startup-ideas";

// Captions + the seed image each maps to + plausible pre-baked aggregates.
// (These mirror the demo MOCK_POSTS so the live feed looks like the product.)
const SEED = [
  {
    caption:
      "Uber, but the driver is also an unlicensed therapist who will not stop talking about their ex.",
    image: "/seed/idea-1.png",
    sum: 3010,
    count: 418,
  },
  {
    caption:
      "A subscription box that mails you one (1) raw potato per month. The brand is built on mystery.",
    image: "/seed/idea-2.png",
    sum: 5534,
    count: 1203,
  },
  {
    caption:
      "An AI smart fridge that locks itself and gaslights you about whether you already ate.",
    image: "/seed/idea-3.png",
    sum: 24386,
    count: 2740,
  },
  {
    caption: "LinkedIn, but every post is read aloud by a medieval town crier.",
    image: "/seed/idea-4.png",
    sum: 537,
    count: 88,
  },
  {
    caption: "Airbnb, but for renting your neighbor's unsecured wifi by the hour.",
    image: "/seed/idea-5.png",
    sum: 3659,
    count: 642,
  },
  {
    caption:
      "A dating app that only matches people with the exact same phone battery percentage.",
    image: "/seed/idea-6.png",
    sum: 12137,
    count: 1556,
  },
];

const admin = createClient(URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Find or create the dedicated house auth user, return its uuid.
async function ensureHouseUser() {
  // listUsers is paginated; the house account is created first so page 1 has it.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw new Error(`listUsers failed: ${listErr.message}`);
  const existing = list.users.find((u) => u.email === HOUSE_EMAIL);
  if (existing) return existing.id;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: HOUSE_EMAIL,
    email_confirm: true,
    user_metadata: { seed: true },
  });
  if (createErr) throw new Error(`createUser failed: ${createErr.message}`);
  return created.user.id;
}

async function main() {
  const houseId = await ensureHouseUser();
  console.log(`[seed] house user: ${houseId}`);

  // Give the house profile a friendly handle (trigger created it as wreck_xxxx).
  const { error: upErr } = await admin
    .from("profiles")
    .update({ username: HOUSE_USERNAME })
    .eq("id", houseId);
  // Unique-violation just means the handle's already taken by this row — ignore.
  if (upErr && !/duplicate|unique/i.test(upErr.message)) {
    console.warn(`[seed] could not set username: ${upErr.message}`);
  }

  let inserted = 0;
  for (const s of SEED) {
    // Idempotency: skip if a post with this caption already exists.
    const { data: dupe } = await admin
      .from("posts")
      .select("id")
      .eq("caption", s.caption)
      .limit(1)
      .maybeSingle();
    if (dupe) {
      console.log(`[seed] exists, skip: "${s.caption.slice(0, 40)}..."`);
      continue;
    }

    const avg = s.count > 0 ? s.sum / s.count : 0;
    const { error: insErr } = await admin.from("posts").insert({
      category_id: CATEGORY_ID,
      author_id: houseId,
      caption: s.caption,
      source_text: s.caption,
      image_prompt: "(seeded — pre-rendered hero image)",
      image_url: s.image,
      status: "ready",
      rating_sum: s.sum,
      rating_count: s.count,
      rating_avg: avg,
    });
    if (insErr) {
      console.error(`[seed] insert failed: ${insErr.message}`);
      continue;
    }
    inserted++;
    console.log(`[seed] + "${s.caption.slice(0, 40)}..."  (avg ${avg.toFixed(1)})`);
  }

  console.log(`[seed] done. inserted ${inserted} new post(s).`);
}

main().catch((e) => {
  console.error("[seed] fatal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
