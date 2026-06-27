"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/config";
import { validateIdea } from "@/lib/validate";
import { generateImage } from "@/lib/image";
import { uploadPostImage } from "@/lib/storage";
import { buildImagePrompt } from "@/lib/prompts";
import type { RatingResult, ValidationResult } from "@/lib/types";

const MAX_POSTS_PER_DAY = 5;

// Signs the current user out and returns them to the feed. Used by the header
// sign-out button (a form action). The proxy-refreshed cookies are cleared here.
export async function signOutAction() {
  if (hasSupabase()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/");
  redirect("/");
}

export type CreatePostResult =
  | { status: "ok"; postId: string }
  | { status: "needs_auth" }
  | { status: "rejected"; validation: ValidationResult }
  | { status: "limit" }
  | { status: "error"; message: string };

// Posting flow (SPEC §7): validate text -> claim daily slot -> generate image -> insert.
export async function createPostAction(
  sourceText: string,
  caption: string,
  categoryId = "startup-ideas"
): Promise<CreatePostResult> {
  if (!hasSupabase()) return { status: "error", message: "Supabase not configured yet." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "needs_auth" };

  // 1. Cheap text gate BEFORE any image cost.
  const validation = await validateIdea(sourceText);
  if (!validation.is_business_idea || !validation.is_pg) {
    return { status: "rejected", validation };
  }

  // 2. Atomically claim a daily posting slot.
  const { data: allowed, error: slotErr } = await supabase.rpc("claim_post_slot", {
    p_max: MAX_POSTS_PER_DAY,
  });
  if (slotErr) return { status: "error", message: slotErr.message };
  if (!allowed) return { status: "limit" };

  // 3. Generate the comical image.
  const prompt = buildImagePrompt(sourceText);
  const img = await generateImage(prompt);
  if (!img.ok) return { status: "error", message: img.error };

  // 4. Insert the finished post. Seed with the inline data-URL (or provider URL)
  //    so a row always exists and the feed renders even if Storage is offline.
  const { data: post, error: insErr } = await supabase
    .rpc("create_post", {
      p_category_id: categoryId,
      p_caption: caption.slice(0, 280),
      p_source_text: sourceText,
      p_image_prompt: prompt,
      p_image_url: img.url,
    })
    .select()
    .single();
  if (insErr) return { status: "error", message: insErr.message };
  const postId = (post as { id: string }).id;

  // 5. Move the image into Supabase Storage and swap the heavy data-URL for the
  //    permanent public URL. Best-effort: if Storage isn't available (no bucket /
  //    no service-role key) or the provider returned only a hosted URL, we leave
  //    the data-URL fallback in place and posting still succeeds.
  if (img.bytes) {
    const uploaded = await uploadPostImage(postId, img.bytes, img.mime);
    if (uploaded) {
      const { error: setErr } = await supabase.rpc("set_post_image", {
        p_post_id: postId,
        p_image_url: uploaded.publicUrl,
        p_image_path: uploaded.path,
      });
      if (setErr) {
        // Non-fatal: the post already has the working data-URL.
        console.error("[create-post] set_post_image failed:", setErr.message);
      }
    }
  }

  revalidatePath("/");
  return { status: "ok", postId };
}

// Dev-only image lab: generate one image from an idea to judge model quality.
// Refuses in production so it can't be abused to rack up image costs.
export async function generateTestImageAction(
  idea: string
): Promise<{ ok: true; url: string; prompt: string } | { ok: false; error: string }> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "Image lab is disabled in production." };
  }
  const prompt = buildImagePrompt(idea);
  const img = await generateImage(prompt);
  if (!img.ok) return { ok: false, error: img.error };
  return { ok: true, url: img.url, prompt };
}

export async function submitRatingAction(
  postId: string,
  score: number
): Promise<RatingResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_rating", {
    p_post_id: postId,
    p_score: score,
  });
  if (error) throw new Error(error.message);
  return data as RatingResult;
}
