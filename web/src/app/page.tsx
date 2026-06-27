import Feed from "@/components/Feed";
import { hasSupabase } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/auth";
import { MOCK_POSTS } from "@/lib/mockPosts";
import type { Post } from "@/lib/types";

export default async function Home() {
  const live = hasSupabase();
  let posts: Post[] = MOCK_POSTS;

  if (live) {
    const supabase = await createClient();
    // Embed the author profile (handle + avatar) for the action rail / meta.
    const { data } = await supabase
      .from("posts")
      .select(
        "id, category_id, caption, image_url, rating_avg, rating_count, created_at, author:profiles!posts_author_id_fkey(username, avatar_url)",
      )
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(20);
    // Fall back to mock if the table is empty so the feed never looks broken.
    if (data && data.length > 0) {
      // Batch-fetch the viewer's existing votes for these posts in ONE query
      // (no N+1), so already-rated posts render the crowd-reveal with the real
      // stored score instead of re-prompting (SPEC §7). RLS on `ratings`
      // restricts this to the caller's own rows; anon users get an empty map.
      const myScores = new Map<string, number>();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const postIds = data.map((row) => row.id);
        const { data: myRatings } = await supabase
          .from("ratings")
          .select("post_id, score")
          .eq("user_id", user.id)
          .in("post_id", postIds);
        for (const r of myRatings ?? []) myScores.set(r.post_id, r.score);
      }
      posts = data.map((row): Post => {
        // PostgREST may return the embedded profile as an object or a 1-element
        // array depending on relationship inference — normalize both.
        const rawAuthor = (
          row as {
            author?:
              | { username?: string; avatar_url?: string | null }
              | { username?: string; avatar_url?: string | null }[]
              | null;
          }
        ).author;
        const profile = Array.isArray(rawAuthor) ? rawAuthor[0] : rawAuthor;
        return {
          id: row.id,
          category_id: row.category_id,
          caption: row.caption,
          image_url: row.image_url,
          rating_avg: row.rating_avg,
          rating_count: row.rating_count,
          created_at: row.created_at,
          author: profile?.username ?? null,
          author_avatar: profile?.avatar_url ?? null,
          my_score: myScores.get(row.id) ?? null,
        };
      });
    }
  }

  const user = await getSessionUser();

  return <Feed posts={posts} live={live} user={user} />;
}
