// Supabase Storage upload for generated post images (SPEC §5, Milestone 2).
// Server-only: uses the service-role admin client. Degrades gracefully — if the
// bucket/key is missing or the upload fails, callers keep the inline data-URL so
// posting still works.
import { createAdminClient } from "./supabase/admin";

export const POST_IMAGES_BUCKET = "post-images";

export type UploadedImage = { publicUrl: string; path: string };

// Upload a generated image's bytes to post-images/{postId}.png and return its
// public URL + object path. Returns null (never throws) when Storage isn't
// usable so the create flow can fall back to the data-URL.
export async function uploadPostImage(
  postId: string,
  bytes: Uint8Array,
  mime = "image/png"
): Promise<UploadedImage | null> {
  const admin = createAdminClient();
  if (!admin) return null; // no service-role key -> data-URL fallback

  const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
  const path = `${postId}.${ext}`;

  try {
    const { error } = await admin.storage
      .from(POST_IMAGES_BUCKET)
      .upload(path, bytes, {
        contentType: mime,
        upsert: true, // idempotent: a client retry overwrites instead of erroring
      });
    if (error) {
      // Bucket missing (migration not run yet) or any storage error -> fall back.
      console.error("[storage] upload failed:", error.message);
      return null;
    }

    const { data } = admin.storage.from(POST_IMAGES_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) return null;
    return { publicUrl: data.publicUrl, path };
  } catch (e) {
    console.error("[storage] upload threw:", e instanceof Error ? e.message : e);
    return null;
  }
}
