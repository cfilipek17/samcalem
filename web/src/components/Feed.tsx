"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Post } from "@/lib/types";
import type { SessionUser } from "@/lib/supabase/auth";
import { signOutAction } from "@/app/actions";
import PostCard from "./PostCard";

export default function Feed({
  posts,
  live,
  user,
}: {
  posts: Post[];
  live: boolean;
  user: SessionUser | null;
}) {
  const scrollerRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Lock body scroll only while the feed is mounted, so /create and other
  // pages stay scrollable.
  useEffect(() => {
    document.body.classList.add("feed-locked");
    return () => document.body.classList.remove("feed-locked");
  }, []);

  // Active-item detection. Prefer the native scrollsnapchange event where
  // supported; fall back to IntersectionObserver(threshold 0.6). The active
  // card drives the slop-coin spin and the eager image window.
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    // --- Native scroll-snap event (Chrome/Edge 129+) ---
    type SnapEvent = Event & { snapTargetBlock?: Element | null };
    const supportsSnapEvent = "onscrollsnapchange" in root;
    if (supportsSnapEvent) {
      const onSnap = (e: Event) => {
        const target = (e as SnapEvent).snapTargetBlock;
        if (!target) return;
        const idx = Number((target as HTMLElement).dataset.index ?? "0");
        if (!Number.isNaN(idx)) setActiveIndex(idx);
      };
      root.addEventListener("scrollsnapchange", onSnap as EventListener);
      return () => root.removeEventListener("scrollsnapchange", onSnap as EventListener);
    }

    // --- IntersectionObserver fallback ---
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = Number((entry.target as HTMLElement).dataset.index ?? "0");
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        }
      },
      { root, threshold: 0.6 },
    );
    const cards = root.querySelectorAll("[data-index]");
    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [posts.length]);

  return (
    <div className="relative mx-auto h-[100svh] w-full max-w-[480px] bg-black sm:border-x sm:border-white/10">
      {/* ---- Top brand bar ---- */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 mx-auto flex max-w-[480px] items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
        <span className="text-lg font-black tracking-tight drop-shadow">
          Pitch<span className="text-amber-400">wreck</span>
        </span>

        <div className="pointer-events-auto flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-xs text-white/70 drop-shadow sm:inline">
                @{user.username}
              </span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur transition hover:bg-white/20"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur transition hover:bg-white/20"
            >
              Log in
            </Link>
          )}
          <Link
            href="/create"
            className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-bold text-black transition hover:bg-amber-300"
          >
            Post
          </Link>
        </div>
      </header>

      {!live && (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+52px)] z-30 mx-auto flex max-w-[480px] justify-center">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 backdrop-blur">
            demo mode · showing sample slop
          </span>
        </div>
      )}

      <main ref={scrollerRef} className="feed">
        {posts.map((p, i) => (
          <PostCard
            key={p.id}
            post={p}
            live={live}
            isLoggedIn={Boolean(user)}
            index={i}
            isActive={i === activeIndex}
            eager={i === 0 || Math.abs(i - activeIndex) <= 1}
          />
        ))}
      </main>
    </div>
  );
}
