import Link from "next/link";
import type { Post } from "@/lib/types";
import PostCard from "./PostCard";

export default function Feed({ posts, live }: { posts: Post[]; live: boolean }) {
  return (
    <div className="relative">
      {/* Top bar */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-4">
        <span className="text-lg font-black tracking-tight">
          Pitch<span className="text-amber-400">wreck</span>
        </span>
        <Link
          href="/create"
          className="pointer-events-auto rounded-full bg-amber-400 px-4 py-1.5 text-sm font-bold text-black transition hover:bg-amber-300"
        >
          Post
        </Link>
      </header>

      {!live && (
        <div className="pointer-events-none fixed inset-x-0 top-14 z-30 flex justify-center">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 backdrop-blur">
            demo mode · showing sample slop
          </span>
        </div>
      )}

      <main className="feed">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} live={live} />
        ))}
      </main>
    </div>
  );
}
