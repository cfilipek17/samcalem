import Feed from "@/components/Feed";
import { hasSupabase } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { MOCK_POSTS } from "@/lib/mockPosts";
import type { Post } from "@/lib/types";

export default async function Home() {
  const live = hasSupabase();
  let posts: Post[] = MOCK_POSTS;

  if (live) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("posts")
      .select("id, category_id, caption, image_url, rating_avg, rating_count, created_at")
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(20);
    // Fall back to mock if the table is empty so the feed never looks broken.
    if (data && data.length > 0) posts = data as Post[];
  }

  return <Feed posts={posts} live={live} />;
}
