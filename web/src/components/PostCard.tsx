"use client";

import { useState } from "react";
import type { Post, RatingResult } from "@/lib/types";
import { submitRatingAction } from "@/app/actions";

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

export default function PostCard({ post, live }: { post: Post; live: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [crowd, setCrowd] = useState({ avg: post.rating_avg, count: post.rating_count });
  const [busy, setBusy] = useState(false);
  const hue = hueFromId(post.id);

  async function rate(score: number) {
    if (picked !== null || busy) return;
    setBusy(true);
    setPicked(score);
    // Optimistic local reveal against the known average.
    if (live) {
      try {
        const res: RatingResult = await submitRatingAction(post.id, score);
        setCrowd({ avg: res.crowd_avg, count: res.count });
      } catch {
        // Not logged in / outage — keep the local reveal. Auth UI lands next milestone.
      }
    }
    setBusy(false);
  }

  const delta = picked === null ? 0 : picked - crowd.avg;

  return (
    <section className="snap relative flex flex-col items-center justify-end">
      {/* Image / placeholder */}
      <div className="absolute inset-0">
        {post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt={post.caption} className="h-full w-full object-cover" />
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
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      {/* Caption + rating */}
      <div className="relative z-10 w-full max-w-md px-5 pb-10">
        <p className="mb-5 text-lg font-semibold leading-snug drop-shadow">{post.caption}</p>

        {picked === null ? (
          <>
            <p className="mb-2 text-xs uppercase tracking-wide text-white/60">
              Rate this idea 0–10
            </p>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, n) => (
                <button
                  key={n}
                  onClick={() => rate(n)}
                  disabled={busy}
                  className="rounded-md bg-white/10 py-2 text-sm font-bold backdrop-blur transition hover:bg-white/30 active:scale-95"
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-white/60">You</div>
                <div className="text-3xl font-black">{picked}</div>
              </div>
              <div className="text-center text-white/50">vs</div>
              <div className="text-right">
                <div className="text-xs text-white/60">Crowd ({crowd.count})</div>
                <div className="text-3xl font-black">{crowd.avg.toFixed(1)}</div>
              </div>
            </div>
            <p className="mt-3 text-sm font-medium text-amber-300">{reaction(delta)}</p>
          </div>
        )}
      </div>
    </section>
  );
}
