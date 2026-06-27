# DESIGN — Pitchwreck Feed (TikTok / Reels-style, adapted)

**Status:** v1 (2026-06-26) · Owner: Calem & Sam
**Scope:** The vertical full-bleed rating feed only (`/`). Implementation-ready UI/UX spec for `Feed.tsx`, `PostCard.tsx`, `globals.css`, `layout.tsx`.
**Source of truth for product decisions:** [`SPEC.md`](../SPEC.md). Backlog: [`BUILD_PLAN.md`](../BUILD_PLAN.md).

This spec mirrors the TikTok "For You" / Instagram Reels interface, **adapted in two ways**:
1. The **media is a still image**, not video (no progress bar, no audio, no play/pause).
2. The **"like" action is replaced by Pitchwreck's 0–10 rating + crowd-average reveal** — the core game loop. Rating is a deliberate, primary action; a lightweight double-tap "🔥" reaction is the secondary, familiar gesture.

> **Why mirror TikTok at all?** SPEC §1 positions Pitchwreck as "celebrate the slop." The deadpan AI hero-shot images (SPEC §4) read as believable startup hero shots; floating white chrome over a full-bleed image is exactly the silhouette users already trust for "scroll, react, move on." We keep that silhouette and slot the rating mechanic where TikTok's like/progress lives.

All sizes are **on-device CSS values** for a mobile-first ~390–430px-wide viewport, given as Tailwind utilities. The TikTok/Reels design canvas is 1080×1920 (9:16); canvas-px ÷ ~2.77 ≈ CSS-px where a source quotes the canvas.

---

## 0. Design principles (locked)

1. **Mobile-first, one post = one viewport.** Vertical scroll-snap, exactly one card visible at rest.
2. **Full-bleed media behind everything.** All chrome floats as translucent overlays; two gradient scrims guarantee legibility over any AI image (which can be bright or busy).
3. **White chrome + drop-shadow** so icons/text survive over unknown imagery. No solid backgrounds except scrims and the rating panel.
4. **Amber `#FBBF24` (Tailwind `amber-400`) is the brand accent** — wordmark, Post pill, reveal highlight. It is the Pitchwreck analog of TikTok red `#FE2C55`. Use amber, NOT TikTok red, for the brand; red is reserved only if a future "like"/report needs a destructive color.
5. **Demo mode must keep working** (BUILD_PLAN: app runs with no keys → `MOCK_POSTS`). Every overlay degrades gracefully when a field (avatar, author, counts) is absent.

---

## 1. Layout map (what sits where)

```
┌──────────────────────────────────────┐
│ [top scrim]                          │
│  Pitchwreck                  [Post]  │  ← top bar (fixed)
│              New · Top               │  ← (optional) sort tabs, centered
│                                      │
│                                      │
│        FULL-BLEED MEDIA              │
│        (object-cover)                │
│                                      │     ╮
│                            ( 👤 )    │     │
│                             +        │     │  RIGHT
│                             🔥       │     │  ACTION
│                            128       │     │  RAIL
│                             💬       │     │  (w-14 column,
│                            842       │     │   bottom-aligned,
│                             ➤        │     │   grows upward)
│                            Share     │     │
│                            ( 🦄 )    │     │  ← spinning "slop coin"
│                                      │     ╯
│ [bottom scrim]                       │
│  @wreck_a1b2 · Startup Ideas         │  ╮ BOTTOM-LEFT
│  caption text, two lines max… more   │  │ META
│  ▸ avg 6.4 · 1,204 votes             │  ╯ (right-padded to clear rail)
│  ┌────────────────────────────────┐  │
│  │  RATE 0–10  [0][1]…[10]         │  │  ← rating overlay (full-width,
│  └────────────────────────────────┘  │     replaces TikTok's progress/CTA)
└──────────────────────────────────────┘
```

**Region budget (TikTok/Reels safe zones, normalized to on-device CSS):**

| Region | CSS size | Holds |
|---|---|---|
| Top bar | full width × ~56px (+ safe-area-top) | wordmark, Post pill, optional sort tabs |
| Right action rail | ~56–64px wide (`w-14`), bottom-aligned | avatar, 🔥, comment, share, slop coin |
| Bottom-left meta | bottom, left, `right-16` to clear rail | author, caption, stat line |
| Rating overlay | full-width, bottom-most content | 0–10 row → reveal card |

**Stacking (z-index):**
```
z-0   media <img>/placeholder
z-10  scrims (top + bottom), pointer-events-none
z-20  right rail, bottom-left meta, rating overlay
z-30  top bar (fixed)
z-40  double-tap 🔥 burst (transient)
```
*(Current code uses `z-10` for the caption block and `z-30` for the top bar; the rail/meta/rating move to `z-20`, scrims to `z-10`, burst to `z-40`.)*

---

## 2. The full-bleed media surface

- One post = one panel sized to the viewport. Container: `relative h-[100svh] w-full overflow-hidden bg-black`.
- **Use `100svh`, NOT `100dvh`.** (See research: `dvh` on snap items re-runs layout every frame as the mobile URL bar animates → WebKit scroll-snap jank / stranded cards. `svh` is stable.) This is a change from the current `globals.css` which uses `100dvh`.
- Media: `next/image` with `fill` + `sizes="100vw"` + `className="object-cover"`. **Do NOT use `priority`** — it is deprecated in Next.js 16 (`image.md` changelog). Use `loading="eager"` for the active ±1 cards, `"lazy"` otherwise, and `fetchPriority="high"` on the first card only.
- **`object-cover`** (fills, crops) to match TikTok. The deadpan hero-shot images are framed for this. Keep the existing hue-gradient placeholder + 🦄 for `image_url === null` and demo mode.

```tsx
<div className="absolute inset-0">
  <Image src={post.image_url} alt={post.caption} fill sizes="100vw"
         className="object-cover"
         loading={Math.abs(index - active) <= 1 ? "eager" : "lazy"}
         fetchPriority={index === 0 ? "high" : "auto"} />
</div>
```

---

## 3. Scrims (the legibility layer)

TikTok/Reels use **two** gradients, not one. The current code has only a bottom scrim — **add a top scrim** so the top bar survives over bright images. Both are `pointer-events-none absolute inset-x-0 z-10`.

- **Top scrim:** `top-0 h-32 bg-gradient-to-b from-black/50 to-transparent` — backs the top bar / sort tabs.
- **Bottom scrim:** `bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/35 to-transparent` — backs the meta block, rating overlay, and lower rail. (Current `from-black via-black/40 to-transparent` is close; standardize to these stops.)

Keep scrims subtle — the image is the content; do not crush it to mud.

---

## 4. Top bar

Container: `fixed inset-x-0 top-0 z-30 flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-3`. `pointer-events-none` on the bar, `pointer-events-auto` on the interactive children (matches current `Feed.tsx`).

- **Left — wordmark:** `Pitch<span class="text-amber-400">wreck</span>`, `text-lg font-black tracking-tight`, `drop-shadow`. (Unchanged from current.)
- **Right — Post pill** (occupies TikTok's search-icon slot): `rounded-full bg-amber-400 px-4 py-1.5 text-sm font-bold text-black`, hover `bg-amber-300`. (Unchanged from current.) When logged out it routes to `/login` per BUILD_PLAN M1; that's a behavior note, not a visual change.
- **Center — sort tabs (optional, ship when `sort=top` lands, BUILD_PLAN M6):** two text tabs **`New` · `Top`** styled exactly like TikTok's Following/For You:
  - Active: `text-[15px] font-bold text-white` with a sliding underline `absolute -bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-white`.
  - Inactive: `text-[15px] text-white/60`.
  - Until M6 ships, omit the tabs entirely (single category, single sort).
- **Demo-mode pill** (`demo mode · showing sample slop`) stays exactly as today: `fixed top-14 z-30`, centered, `bg-white/10 ... backdrop-blur`.

---

## 5. Right action rail (the signature element)

Anchored bottom-right, stacked vertically, bottom-aligned so it grows upward and clears the rating overlay. Container:

```
absolute right-2 bottom-44 z-20 flex flex-col items-center gap-5 text-white
drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]
```
(`right-2` ≈ 8px gutter; `gap-5` ≈ 20px between items; `bottom-44` sits the rail above the meta + rating block — tune so the lowest icon clears the caption.)

**Exact order, top → bottom (this order is locked to mirror TikTok):**

| # | Element | Size | Tailwind | Notes |
|---|---|---|---|---|
| 1 | **Author avatar + follow badge** | 48px circle | `h-12 w-12 rounded-full ring-2 ring-white object-cover` | Poster's avatar (`wreck_xxxx`). A `+` badge overlaps bottom-center: `absolute -bottom-2 left-1/2 -translate-x-1/2 grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-black text-xs`. Badge is **optional for MVP** (no follow graph yet) — render only if a follow feature exists; otherwise drop the badge, keep the avatar. `mb-1` extra gap below. |
| 2 | **🔥 React (like)** | 32px icon | `h-8 w-8` | Lightweight upvote, SEPARATE from rating. Outline flame; fills **amber-400** + scale-pop (`active:scale-90 transition`) when reacted. Count below. This is also what double-tap triggers (§9). |
| — | react count | 13px | `mt-1 text-[13px] font-semibold` | e.g. `128`. Hidden if 0/absent. |
| 3 | **Comment** | 32px icon | `h-8 w-8` | Speech-bubble outline → opens comments sheet (BUILD_PLAN M4). Count below. |
| 4 | **Share** | 32px icon | `h-8 w-8` | Paper-plane / forward glyph → Web Share API (copy link fallback). Label `Share` below. |
| 5 | **More (⋯)** | 24px icon | `h-6 w-6` | Three dots → report / not-interested (BUILD_PLAN M5). No label. |
| 6 | **Slop coin** (replaces TikTok's spinning audio disc) | 40px | `h-10 w-10 rounded-full bg-zinc-900 grid place-items-center ring-2 ring-white/70` | Pitchwreck has no audio. Spinning category token: a 🦄 (or category glyph). Spins ONLY on the active card: `animate-[spin_4.5s_linear_infinite]` gated by `data-active`. |

**Rail styling rules:**
- All icons **white**, ~2px stroke, **outline until activated** (then fill amber), each with `drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]`.
- Icons are **bare glyphs** floating on the scrim — NOT in pills. Only avatar and slop coin have shape/ring.
- Counts sit directly under their icon, centered, `text-[13px] font-semibold`, `mt-1`. Format with `k`/`m` compaction (`128`, `1.2k`).
- Vertical gap ≈ 20px (`gap-5`); avatar gets ~8px extra below (`mb-1`).

```tsx
<div className="absolute bottom-44 right-2 z-20 flex flex-col items-center gap-5
                text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
  {/* avatar (+ optional follow badge) */}
  <div className="relative mb-1">
    <img className="h-12 w-12 rounded-full object-cover ring-2 ring-white" src={post.author_avatar} alt="" />
    {/* optional: <span className="absolute -bottom-2 left-1/2 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full bg-amber-400 text-xs text-black">+</span> */}
  </div>
  {/* 🔥 react */}
  <button className="flex flex-col items-center transition active:scale-90" aria-label="React">
    <FlameIcon className="h-8 w-8" /><span className="mt-1 text-[13px] font-semibold">128</span>
  </button>
  {/* comment */}
  <button className="flex flex-col items-center" aria-label="Comments">
    <CommentIcon className="h-8 w-8" /><span className="mt-1 text-[13px] font-semibold">842</span>
  </button>
  {/* share */}
  <button className="flex flex-col items-center" aria-label="Share">
    <ShareIcon className="h-8 w-8" /><span className="mt-1 text-[13px] font-semibold">Share</span>
  </button>
  {/* more */}
  <button aria-label="More"><MoreIcon className="h-6 w-6" /></button>
  {/* slop coin — spins only when active */}
  <div data-active={isActive}
       className="grid h-10 w-10 place-items-center rounded-full bg-zinc-900 ring-2 ring-white/70
                  animate-[spin_4.5s_linear_infinite] [animation-play-state:paused]
                  data-[active=true]:[animation-play-state:running]">
    <span className="text-base">🦄</span>
  </div>
</div>
```

**MVP cut line:** if M4/M5 aren't built yet, render only **avatar + 🔥 react + slop coin**, and stub comment/share/more as disabled-looking (or omit). The rail must never show a control that does nothing.

---

## 6. Bottom-left meta block (author + caption)

Anchored bottom-left, left-aligned, **width-constrained to clear the rail**. Container:

```
absolute left-5 right-16 bottom-32 z-20 flex flex-col gap-2 text-white
```
(`right-16` ≈ 64px reserves the rail column so caption wraps before the icons. `bottom-32` sits it above the rating overlay; tune against the rating panel height.)

**Row 1 — author + category** (`flex items-center gap-2`):
- Author handle: `@{post.author ?? "wreck_anon"}`, `text-sm font-bold`, `drop-shadow`. Tappable → profile (BUILD_PLAN M7).
- Category chip (replaces TikTok's follow chip / audio source): `▸ Startup Ideas` or a bordered pill `rounded-md border border-white/40 px-2 py-0.5 text-xs font-semibold`. Reinforces the category-extensible design (SPEC §2b).

**Row 2 — caption:**
- `text-sm leading-snug drop-shadow`, white, regular weight. (Current uses `text-lg font-semibold` — **reduce to `text-sm`** to match TikTok density and leave room for the rating row.)
- **Truncate to 2 lines** with a `more` toggle: `line-clamp-2`; the trailing `more` in `text-white/70`, tap to expand to full text inline (rail/feed stay put).

**Row 3 — stat line** (Pitchwreck's repurposing of TikTok's music ticker):
- `flex items-center gap-1.5 text-xs font-medium text-white/85 drop-shadow`.
- Content: `▸ avg {post.rating_avg.toFixed(1)} · {post.rating_count} votes` (a crowd-stat teaser). **Hide the avg before the user has rated** so it doesn't spoil the reveal — show `▸ {post.rating_count} ratings` pre-vote, full `avg · votes` post-vote.

```tsx
<div className="absolute bottom-32 left-5 right-16 z-20 flex flex-col gap-2 text-white">
  <div className="flex items-center gap-2">
    <span className="text-sm font-bold drop-shadow">@{post.author ?? "wreck_anon"}</span>
    <span className="rounded-md border border-white/40 px-2 py-0.5 text-xs font-semibold">Startup Ideas</span>
  </div>
  <p className="line-clamp-2 text-sm leading-snug drop-shadow">
    {post.caption} {/* + tappable "more" when clamped */}
  </p>
  <div className="flex items-center gap-1.5 text-xs font-medium text-white/85 drop-shadow">
    <span>▸</span>
    <span>{picked === null
      ? `${post.rating_count} ratings`
      : `avg ${crowd.avg.toFixed(1)} · ${crowd.count} votes`}</span>
  </div>
</div>
```

---

## 7. Rating overlay (replaces the like — Pitchwreck's core)

This is where TikTok's progress bar / CTA lives. Full-width, bottom-most content, **above the home indicator**. Container:

```
absolute inset-x-0 bottom-0 z-20 px-5 pb-[calc(env(safe-area-inset-bottom)+24px)]
```

Two states, swapped in place (this matches the current `picked === null ? … : …` logic in `PostCard.tsx`; we restyle, not rewrite):

### 7a. Pre-vote — the 0–10 row
- Eyebrow: `RATE THIS IDEA 0–10`, `mb-2 text-xs uppercase tracking-wide text-white/60`.
- The row: `grid grid-cols-11 gap-1`. Each button:
  `rounded-md bg-white/10 py-2.5 text-sm font-bold backdrop-blur transition hover:bg-white/30 active:scale-95`.
  - **Tap target:** ≥40px tall (`py-2.5` + content ≈ 40px) for thumb accuracy; 11 buttons across a ~390px screen ≈ 30px wide each — acceptable, but ensure `min-h-[40px]`.
  - **Color ramp (optional polish):** tint 0→10 from cool to warm so the strip reads like a meter (e.g. `0` neutral white/10 → `10` amber/30). Keep contrast; don't pre-bias the vote.
- Logged-out: tapping a score routes to `/login` (BUILD_PLAN M1) instead of revealing.

### 7b. The reveal (post-vote — the payoff)
On vote, the 0–10 row is replaced by the **You vs Crowd** card. Keep the current structure, elevate the motion:

- Panel: `rounded-xl bg-white/10 p-4 backdrop-blur`.
- Layout (`flex items-end justify-between`):
  - **You** — `text-xs text-white/60` label, value `text-3xl font-black`.
  - `vs` — centered, `text-white/50`.
  - **Crowd (n)** — right-aligned, value `text-3xl font-black`.
- Reaction line: `mt-3 text-sm font-medium text-amber-300` using the existing `reaction(delta)` copy.

**Reveal interaction (the moment that has to feel good):**
1. On tap, the picked number **pops** (`scale 1 → 1.15 → 1`, ~150ms) and the row dims/blurs out (~120ms).
2. The crowd average **counts up** from 0 to `crowd.avg` over ~500ms (animated number, ease-out) so the comparison lands as a reveal, not a static print. Respect `prefers-reduced-motion` → skip the count, just show the value.
3. The **delta bar**: a thin horizontal track under the two numbers with two markers — "you" (amber) and "crowd" (white) — animating to their positions on a 0–10 scale, visually showing the gap. Optional but high-value; it makes the delta legible at a glance.
4. The `reaction(delta)` line fades in last (~200ms after the number settles).
5. The state is **sticky** — once revealed it stays revealed for that post for the session (current behavior; `picked` never resets). No re-vote (SPEC §7: one vote per user, idempotent RPC).

```tsx
{picked === null ? (
  <>
    <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Rate this idea 0–10</p>
    <div className="grid grid-cols-11 gap-1">
      {Array.from({ length: 11 }, (_, n) => (
        <button key={n} onClick={() => rate(n)} disabled={busy}
          className="min-h-[40px] rounded-md bg-white/10 py-2.5 text-sm font-bold backdrop-blur
                     transition hover:bg-white/30 active:scale-95">{n}</button>
      ))}
    </div>
  </>
) : (
  <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
    <div className="flex items-end justify-between">
      <div><div className="text-xs text-white/60">You</div>
           <div className="text-3xl font-black">{picked}</div></div>
      <div className="text-center text-white/50">vs</div>
      <div className="text-right"><div className="text-xs text-white/60">Crowd ({crowd.count})</div>
           <div className="text-3xl font-black tabular-nums">{crowd.avg.toFixed(1)}</div></div>
    </div>
    {/* delta bar (optional): markers for you (amber) + crowd (white) on a 0–10 track */}
    <p className="mt-3 text-sm font-medium text-amber-300">{reaction(delta)}</p>
  </div>
)}
```

---

## 8. Scroll-snap, active item, autoplay-equivalent

- **Feed container:** `h-[100svh] overflow-y-scroll snap-y snap-mandatory overscroll-y-contain`, scrollbar hidden. Put `overflow:hidden` on `html, body` so only the feed scrolls (kills iOS nested-scroll jank).
- **Each post:** `h-[100svh] snap-start` + **`scroll-snap-stop: always`** (so a fast flick can't skip a card — `snap-always` in Tailwind, or `[scroll-snap-stop:always]`).
- **Active-item detection** drives the slop-coin spin, image eager-window, and (later) any per-card animation. Prefer the native `scrollsnapchange` event (Chrome/Edge 129+); fall back to `IntersectionObserver(root=feed, threshold≈0.6)`. Only the active card spins its coin and counts as "playing." This makes `Feed.tsx` (or a thin wrapper around `<main>`) a client component; pass `isActive` + `index` to each `PostCard`.

**Required `globals.css` changes (from current):**
```css
html, body { height: 100%; overflow: hidden; overscroll-behavior: none; }  /* add overflow:hidden */
.feed { height: 100svh; overflow-y: scroll; scroll-snap-type: y mandatory;
        scrollbar-width: none; -webkit-overflow-scrolling: touch; }        /* 100svh not 100dvh */
.feed::-webkit-scrollbar { display: none; }
.snap { height: 100svh; scroll-snap-align: start; scroll-snap-stop: always; } /* svh + snap-stop */
```

---

## 9. Gestures

| Gesture | TikTok | Pitchwreck |
|---|---|---|
| **Swipe up/down** | next/prev video | next/prev post (scroll-snap) — identical |
| **Single tap on media** | pause/play | no-op on media (still image). Tapping the **caption's `more`** expands it; tapping a rating button rates. Do not hijack a bare media tap. |
| **Double-tap on media** | like + heart burst | **🔥 react** + burst. A large amber 🔥 (~88px) appears **at the tap point**, scales `0 → 1.2 → 1`, drifts up & fades over ~700ms, then unmounts; the rail 🔥 fills amber + pops. Double-tap only ever *adds* a react (never removes — toggle via the rail icon). Debounce against single-tap with a ~250–300ms discriminator. This is SEPARATE from the 0–10 rating. |
| **Tap rail 🔥** | toggle like | toggle react with `active:scale-90` pop, no center burst. |

```css
@keyframes reactBurst {
  0%   { transform: scale(0)   translateY(0)    rotate(-10deg); opacity: 0; }
  15%  { transform: scale(1.2) translateY(0)    rotate(-10deg); opacity: 1; }
  100% { transform: scale(1)   translateY(-40px) rotate(-10deg); opacity: 0; }
}
```
Respect `prefers-reduced-motion`: skip the burst, just toggle the rail state.

---

## 10. Color & typography tokens

**Colors** (extend the existing `globals.css` `:root`; `--background:#0a0a0a`, `--foreground:#ededed` stay):

| Token | Value | Use |
|---|---|---|
| Brand accent | `#FBBF24` (`amber-400`) | wordmark, Post pill, 🔥 active, reveal highlight, slop-coin badge |
| Accent hover | `#FCD34D` (`amber-300`) | Post pill hover, reaction line `text-amber-300` |
| Text on media | `#FFFFFF` + drop-shadow | all overlay text/icons |
| Muted text | `rgba(255,255,255,0.6)` (`white/60`) | eyebrows, inactive tab, secondary labels |
| Secondary text | `rgba(255,255,255,0.85)` (`white/85`) | stat line |
| Panel fill | `rgba(255,255,255,0.10)` + `backdrop-blur` | rating buttons, reveal card |
| Scrim | `black` @ 50–80% → transparent | top + bottom gradients |
| Icon shadow | `drop-shadow(0 1px 2px rgba(0,0,0,0.6))` | every white glyph/text over media |

**Type scale** (system stack already set: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto…`):

| Element | Size / weight | Tailwind |
|---|---|---|
| Wordmark | 18px / 900 | `text-lg font-black` |
| Sort tab (active) | 15px / 700 | `text-[15px] font-bold` |
| Author handle | 14px / 700 | `text-sm font-bold` |
| Caption | 14px / 400, 2-line clamp | `text-sm leading-snug line-clamp-2` |
| Category / stat | 12px / 500–600 | `text-xs font-medium` |
| Rail counts | 13px / 600 | `text-[13px] font-semibold` |
| Rating eyebrow | 12px / 600 uppercase | `text-xs uppercase tracking-wide` |
| Rating button | 14px / 700 | `text-sm font-bold` |
| Reveal numbers | 30px / 900, tabular | `text-3xl font-black tabular-nums` |
| Reaction line | 14px / 500 | `text-sm font-medium` |

---

## 11. Mobile-first sizing & safe areas

- **Enable safe areas:** add `viewportFit: "cover"` to `export const viewport` in `layout.tsx` (valid in Next.js 16's `Viewport` type). Without it, `env(safe-area-inset-*)` is inert. Also set `width:"device-width", initialScale:1, maximumScale:1` to stop accidental pinch-zoom of the feed. Keep `themeColor:"#0a0a0a"` and the existing `appleWebApp.statusBarStyle:"black-translucent"` (correct for edge-to-edge PWA).
- **Top bar** pads `env(safe-area-inset-top)` so the wordmark/Post clear the notch / Dynamic Island.
- **Rating overlay & rail** pad `env(safe-area-inset-bottom)` so the 0–10 buttons and lowest rail icon clear the iOS home indicator: `pb-[calc(env(safe-area-inset-bottom)+24px)]`.
- **Left/right** content margin ≈ 16–20px (`px-5`); the meta block's `right-16` keeps caption clear of the rail.
- **Tap targets** ≥40px in the smallest dimension (rating buttons, rail icons). The 11-across rating row is the tightest; enforce `min-h-[40px]` and `gap-1`.
- **Breakpoints:** mobile-first is the only required layout. On wide screens (`sm:` and up), **center the feed in a phone-width column** (`mx-auto max-w-[480px]`) on a black backdrop so desktop isn't a stretched mess — TikTok/Reels do the same.

---

## 12. Concrete diffs vs. current code

Current files: `web/src/components/Feed.tsx`, `web/src/components/PostCard.tsx`, `web/src/app/globals.css`, `web/src/app/layout.tsx`.

1. **`globals.css`:** `100dvh → 100svh` on `.feed` and `.snap`; add `scroll-snap-stop: always` to `.snap`; add `overflow:hidden` to `html, body`; standardize scrim stops.
2. **`layout.tsx`:** add `viewportFit:"cover"`, `width`, `initialScale`, `maximumScale` to `viewport`.
3. **`PostCard.tsx`:**
   - Add a **top scrim** (only bottom exists today); standardize bottom scrim stops.
   - Move the caption block from centered `max-w-md` to **bottom-LEFT, `right-16`-constrained**; shrink caption `text-lg font-semibold → text-sm`; clamp to 2 lines + `more`.
   - Add the **right action rail** (§5) — the biggest visual change.
   - Add the **author/category/stat meta rows** (§6).
   - Restyle the rating block as the bottom **rating overlay** with the **animated reveal** (§7b): count-up crowd avg, pop, optional delta bar.
   - Accept `index` + `isActive` props; switch `<img>` → `next/image` (`fill`/`sizes`/eager-window); gate slop-coin spin on `isActive`.
   - Add **double-tap 🔥 burst** + rail react toggle (§9), separate from rating.
4. **`Feed.tsx`:** add active-item detection (`scrollsnapchange` + `IntersectionObserver` fallback), pass `index`/`isActive` to cards; add optional `New · Top` sort tabs (M6); becomes/ wraps a client component for the observer.
5. **`types.ts`:** `Post` will need optional `author` (handle) and `author_avatar` for the rail/meta; both render with fallbacks so demo mode and missing data don't break. (Schema/RPC change is out of scope for this design doc — list as a follow-up.)

**Order to build (low-risk first):** scrims + svh/snap-stop + safe-area (pure CSS/viewport) → meta block reposition → rating overlay restyle + reveal animation → right rail → active-item detection + next/image → double-tap burst.

---

## 13. Accessibility & graceful degradation

- Every rail icon and rating button has an `aria-label`; counts are decorative text.
- All motion (count-up, burst, coin spin, button pops) is gated behind `prefers-reduced-motion: reduce` → static fallbacks.
- Contrast: white-on-scrim and amber-on-dark both exceed WCAG AA at these sizes; the drop-shadow is the floor for legibility over bright images.
- **Demo mode / missing data:** avatar → fallback monogram or hidden; author → `wreck_anon`; counts of 0 → hidden; `image_url === null` → existing hue-gradient + 🦄 placeholder. No overlay control may render in a broken/no-op state.
- Keyboard: rating buttons are real `<button>`s (already are); rail actions are buttons; feed is scrollable with arrow/Page keys via native scroll.
