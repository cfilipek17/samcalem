// Image generation wrapper. Default provider: Together AI (FLUX.1-schnell).
// Abstracted so we can A/B Nano Banana / fal.ai later without touching callers (SPEC §4).

const TOGETHER_URL = "https://api.together.xyz/v1/images/generations";

export type GenerateImageResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function generateImage(prompt: string): Promise<GenerateImageResult> {
  const key = process.env.TOGETHER_API_KEY;
  const model = process.env.TOGETHER_IMAGE_MODEL ?? "black-forest-labs/FLUX.1-schnell-Free";

  if (!key) {
    return { ok: false, error: "TOGETHER_API_KEY not set — image generation is disabled." };
  }

  try {
    const res = await fetch(TOGETHER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        width: 768,
        height: 768,
        n: 1,
        // FLUX-schnell is a few-step model; this keeps it fast + cheap.
        steps: 4,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Image API ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = await res.json();
    const item = data?.data?.[0];
    // Together can return a hosted url or base64 depending on the model/account.
    // TODO(prod): download + upload to Supabase Storage; provider URLs can expire.
    if (item?.url) return { ok: true, url: item.url };
    if (item?.b64_json) return { ok: true, url: `data:image/png;base64,${item.b64_json}` };
    return { ok: false, error: "Image API returned no image." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown image error" };
  }
}
