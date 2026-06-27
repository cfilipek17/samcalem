"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Post, RatingResult } from "@/lib/types";
import { submitRatingAction } from "@/app/actions";
import { FlameIcon, CommentIcon, ShareIcon, MoreIcon } from "./icons";

function reaction(delta: number): string {
  if (delta <= -2.5) return "Brutal. You're a harsh judge.";
  if (delta < -0.75) return "Tougher than the crowd.";
  if (Math.abs(delta) <= 0.75) return "Dead on — you read the room.";
  if (delta < 2.5) return "You're feeling generous.";
  return "You LOVED it. The crowd didn't.";
}

// Deterministic color so each card's placeholder looks distinct (no Math.random).
function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

// 1234 -> "1.2k", 2_740_000 -> "2.7m". Whole numbers stay as-is.
function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`.replace(".0", "");
  return `${(n / 1_000_000).toFixed(1)}m`.replace(".0", "");
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

// Animated count-up for the crowd average reveal (0 -> target over ~500ms,
// ease-out). Skips the animation under prefers-reduced-motion.
function useCountUp(target: number, run: boolean): number {
  const [value, setValue] = useState(run ? 0 : target);
  useEffect(() => {
    if (!run) return;
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const duration = 500;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return value;
}

export default function PostCard({
  post,
  live,
  isLoggedIn,
  index,
  isActive,
  eager,
}: {
  post: Post;
  live: boolean;
  isLoggedIn: boolean;
  index: number;
  isActive: boolean;
  // Load this image now (active card ±1, or first card) vs. lazily.
  eager: boolean;
}) {
  const router = useRouter();
  // Seed `picked` from the viewer's already-stored vote so returning users see
  // the crowd-reveal (with their real score) instead of the pre-vote row (SPEC §7).
  const [picked, setPicked] = useState<number | null>(post.my_score ?? null);
  const [crowd, setCrowd] = useState({ avg: post.rating_avg, count: post.rating_count });
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reacted, setReacted] = useState(false);
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const hue = hueFromId(post.id);
  const author = post.author ?? "wreck_anon";
  // Mock posts (from MOCK_POSTS) carry placeholder ids, not real DB UUIDs. They
  // appear in demo mode AND as the empty-table fallback while live=true, so the
  // id — not `live` — is the reliable signal for whether submit_rating can run.
  const isMock = post.id.startsWith("mock-");

  // ----- Rating (logic preserved exactly from the original card) -----
  async function rate(score: number) {
    if (picked !== null || busy) return;

    // Rating writes require auth (the submit_rating RPC needs auth.uid()). In live
    // mode, send logged-out users to log in instead of faking a crowd reveal.
    if (live && !isMock && !isLoggedIn) {
      router.push("/login?next=/");
      return;
    }

    setBusy(true);
    setPicked(score);
    // Optimistic local reveal against the known average. Skip the network call
    // for mock ids (no real row → submit_rating would 404 on a bogus UUID) and
    // in demo mode; both stay local-only.
    if (live && !isMock) {
      try {
        const res: RatingResult = await submitRatingAction(post.id, score);
        setCrowd({ avg: res.crowd_avg, count: res.count });
      } catch {
        // Outage / RLS rejection — keep the local reveal rather than hard-failing.
      }
    }
    setBusy(false);
  }

  const delta = picked === null ? 0 : picked - crowd.avg;
  const animatedAvg = useCountUp(crowd.avg, picked !== null);

  // ----- 🔥 react (separate from rating; double-tap or rail tap) -----
  function toggleReact() {
    setReacted((r) => !r);
  }

  // Double-tap discriminator on the media surface: a second tap within 280ms
  // fires a react + a burst at the tap point. A bare single tap is a no-op
  // (still image — nothing to pause).
  const lastTap = useRef(0);
  const burstId = useRef(0);
  function onMediaPointer(e: React.PointerEvent<HTMLDivElement>) {
    const now = performance.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      if (!reacted) setReacted(true);
      if (!prefersReducedMotion()) {
        const rect = e.currentTarget.getBoundingClientRect();
        const id = ++burstId.current;
        const burst = { id, x: e.clientX - rect.left, y: e.clientY - rect.top };
        setBursts((b) => [...b, burst]);
        window.setTimeout(() => {
          setBursts((b) => b.filter((x) => x.id !== id));
        }, 750);
      }
    } else {
      lastTap.current = now;
    }
  }

  // Demo-stable derived react count (no real react table yet).
  const reactCount = (post.rating_count % 900) + (reacted ? 1 : 0);

  return (
    <section data-index={index} className="snap relative overflow-hidden bg-black">
      {/* ---- Full-bleed media ---- */}
      <div
        className="absolute inset-0"
        onPointerUp={onMediaPointer}
        style={{ touchAction: "manipulation" }}
      >
        {post.image_url ? (
          <Image
            src={post.image_url}
            alt={post.caption}
            fill
            sizes="(min-width: 480px) 480px, 100vw"
            quality={90}
            className="media-fade object-cover"
            data-loaded={mediaLoaded}
            onLoad={() => setMediaLoaded(true)}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "auto"}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `radial-gradient(120% 120% at 50% 20%, hsl(${hue} 70% 35%), hsl(${(hue + 40) % 360} 65% 12%))`,
            }}
          >
            <span className="text-7xl opacity-30">🦄</span>
          </div>
        )}

        {/* Double-tap 🔥 bursts */}
        {bursts.map((b) => (
          <span
            key={b.id}
            className="react-burst pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 text-[88px] leading-none"
            style={{ left: b.x, top: b.y, color: "var(--brand)" }}
            aria-hidden="true"
          >
            🔥
          </span>
        ))}
      </div>

      {/* ---- Scrims (legibility layer) ---- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-black/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/5 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

      {/* ---- Right action rail ---- */}
      <div className="absolute bottom-44 right-2 z-20 flex flex-col items-center gap-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
        {/* Author avatar */}
        <div className="relative mb-1">
          {post.author_avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.author_avatar}
              alt=""
              className="h-12 w-12 rounded-full object-cover ring-2 ring-white"
            />
          ) : (
            <div
              className="grid h-12 w-12 place-items-center rounded-full text-base font-black uppercase text-white ring-2 ring-white"
              style={{ background: `hsl(${hue} 55% 38%)` }}
              aria-hidden="true"
            >
              {author.replace(/[^a-z0-9]/gi, "").slice(0, 1) || "?"}
            </div>
          )}
        </div>

        {/* 🔥 React (separate from rating) */}
        <button
          type="button"
          onClick={toggleReact}
          className="flex flex-col items-center transition active:scale-90"
          aria-label={reacted ? "Remove reaction" : "React"}
          aria-pressed={reacted}
        >
          <FlameIcon
            className="h-8 w-8 transition-colors"
            filled={reacted}
          />
          <span
            className="mt-1 text-[13px] font-semibold tabular-nums"
            style={reacted ? { color: "var(--brand)" } : undefined}
          >
            {compact(reactCount)}
          </span>
        </button>

        {/* Comment (M4 not built — disabled, never a no-op live control) */}
        <button
          type="button"
          disabled
          className="flex cursor-not-allowed flex-col items-center opacity-50"
          aria-label="Comments (coming soon)"
        >
          <CommentIcon className="h-8 w-8" />
          <span className="mt-1 text-[13px] font-semibold tabular-nums">
            {compact(Math.round(reactCount / 6))}
          </span>
        </button>

        {/* Share */}
        <ShareButton post={post} className="flex flex-col items-center transition active:scale-90">
          <ShareIcon className="h-8 w-8" />
          <span className="mt-1 text-[13px] font-semibold">Share</span>
        </ShareButton>

        {/* More (M5 not built — disabled) */}
        <button
          type="button"
          disabled
          className="cursor-not-allowed opacity-50"
          aria-label="More (coming soon)"
        >
          <MoreIcon className="h-6 w-6" />
        </button>

        {/* Slop coin — spins only on the active card */}
        <div
          data-active={isActive}
          className="slop-coin grid h-10 w-10 place-items-center rounded-full bg-zinc-900 ring-2 ring-white/70"
          aria-hidden="true"
        >
          <span className="text-base">🦄</span>
        </div>
      </div>

      {/* ---- Bottom-left meta (author + caption + stat) ---- */}
      <div className="absolute bottom-32 left-5 right-16 z-20 flex flex-col gap-2 text-white">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold drop-shadow">@{author}</span>
          <span className="rounded-md border border-white/40 px-2 py-0.5 text-xs font-semibold drop-shadow">
            Startup Ideas
          </span>
        </div>

        <p
          className={`text-sm leading-snug drop-shadow ${expanded ? "" : "line-clamp-2"}`}
        >
          {post.caption}{" "}
          {!expanded && post.caption.length > 70 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="font-medium text-white/70"
            >
              more
            </button>
          )}
        </p>

        <div className="flex items-center gap-1.5 text-xs font-medium text-white/85 drop-shadow">
          <span>▸</span>
          <span className="tabular-nums">
            {picked === null
              ? `${compact(post.rating_count)} ratings`
              : `avg ${crowd.avg.toFixed(1)} · ${compact(crowd.count)} votes`}
          </span>
        </div>
      </div>

      {/* ---- Rating overlay (the core game loop) ---- */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        {picked === null ? (
          <>
            <p className="mb-2 text-xs uppercase tracking-wide text-white/60 drop-shadow">
              Rate this idea 0–10
            </p>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, n) => (
                <button
                  key={n}
                  onClick={() => rate(n)}
                  disabled={busy}
                  aria-label={`Rate ${n} out of 10`}
                  className="min-h-[40px] rounded-md py-2.5 text-sm font-bold backdrop-blur transition hover:bg-white/30 active:scale-95 disabled:opacity-60"
                  style={{
                    // Subtle cool->warm meter: low scores read neutral, high
                    // scores pick up an amber tint. Kept faint so it never
                    // pre-biases the vote.
                    backgroundColor: `hsla(45, 90%, 60%, ${0.08 + (n / 10) * 0.16})`,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="reveal-in rounded-xl bg-white/10 p-4 backdrop-blur">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-white/60">You</div>
                <div className="pick-pop text-3xl font-black tabular-nums">{picked}</div>
              </div>
              <div className="pb-1 text-center text-white/50">vs</div>
              <div className="text-right">
                <div className="text-xs text-white/60">Crowd ({compact(crowd.count)})</div>
                <div className="text-3xl font-black tabular-nums">
                  {animatedAvg.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Delta bar: you (amber) + crowd (white) on a 0–10 track */}
            <div className="relative mt-3 h-1.5 w-full rounded-full bg-white/20">
              <span
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-2 ring-black/30 transition-all duration-500"
                style={{ left: `${(crowd.avg / 10) * 100}%` }}
                aria-hidden="true"
              />
              <span
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-black/30 transition-all duration-500"
                style={{ left: `${((picked ?? 0) / 10) * 100}%`, background: "var(--brand)" }}
                aria-hidden="true"
              />
            </div>

            <p
              className="reaction-fade mt-3 text-sm font-medium"
              style={{ color: "var(--brand-hover)" }}
            >
              {reaction(delta)}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// Share via Web Share API with a clipboard fallback. Self-contained so the rail
// stays declarative.
function ShareButton({
  post,
  className,
  children,
}: {
  post: Post;
  className?: string;
  children: React.ReactNode;
}) {
  const onShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: "Pitchwreck",
      text: post.caption,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to copy
    }
    try {
      await navigator.clipboard?.writeText(`${post.caption} ${url}`.trim());
    } catch {
      // clipboard blocked — nothing more we can do silently
    }
  };

  return (
    <button type="button" onClick={onShare} className={className} aria-label="Share">
      {children}
    </button>
  );
}
