import Link from "next/link";
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
  return (
    <div className="relative">
      {/* Top bar */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-4">
        <span className="text-lg font-black tracking-tight">
          Pitch<span className="text-amber-400">wreck</span>
        </span>

        <div className="pointer-events-auto flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-xs text-white/60 sm:inline">@{user.username}</span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/20"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/20"
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
        <div className="pointer-events-none fixed inset-x-0 top-14 z-30 flex justify-center">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 backdrop-blur">
            demo mode · showing sample slop
          </span>
        </div>
      )}

      <main className="feed">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} live={live} isLoggedIn={Boolean(user)} />
        ))}
      </main>
    </div>
  );
}
