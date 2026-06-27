// Image generation wrapper.
// Default provider: Google "Nano Banana" (Gemini 2.5 Flash Image) — best at
// deliberately funny, prompt-faithful cartoons. Together FLUX-schnell kept as a
// cheaper fallback. Switch with IMAGE_PROVIDER=together. (SPEC §4)

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const TOGETHER_URL = "https://api.together.xyz/v1/images/generations";

// Decode a base64 string to raw bytes. Runs server-side only (Node `Buffer`).
function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export type GenerateImageResult =
  | {
      ok: true;
      // Always usable directly as an <img src>. Either an inline data-URL (Gemini,
      // Together b64) or a provider-hosted URL (Together url mode). The data-URL is
      // the fallback persisted to the DB when Storage upload isn't available.
      url: string;
      // Raw decoded image bytes + mime, present only when the provider returned the
      // image inline (base64). Lets the create flow upload to Supabase Storage.
      // Absent when the provider returned only a hosted URL.
      bytes?: Uint8Array;
      mime?: string;
    }
  | { ok: false; error: string };

export async function generateImage(prompt: string): Promise<GenerateImageResult> {
  const provider = process.env.IMAGE_PROVIDER ?? "gemini";
  return provider === "together" ? generateWithTogether(prompt) : generateWithGemini(prompt);
}

async function generateWithGemini(prompt: string): Promise<GenerateImageResult> {
  const key = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
  if (!key) return { ok: false, error: "GOOGLE_API_KEY not set — image generation is disabled." };

  try {
    const res = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Gemini ${res.status}: ${body.slice(0, 300)}` };
    }

    const data = await res.json();
    const parts: Array<{ inlineData?: { mimeType?: string; data?: string } }> =
      data?.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find((p) => p?.inlineData?.data);
    if (img?.inlineData?.data) {
      const mime = img.inlineData.mimeType ?? "image/png";
      const b64 = img.inlineData.data;
      // url = data-URL fallback (used if Storage upload isn't possible);
      // bytes/mime let the caller upload the PNG to Supabase Storage.
      return {
        ok: true,
        url: `data:${mime};base64,${b64}`,
        bytes: base64ToBytes(b64),
        mime,
      };
    }
    return { ok: false, error: "Gemini returned no image." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown image error" };
  }
}

async function generateWithTogether(prompt: string): Promise<GenerateImageResult> {
  const key = process.env.TOGETHER_API_KEY;
  const model = process.env.TOGETHER_IMAGE_MODEL ?? "black-forest-labs/FLUX.1-schnell-Free";
  if (!key) return { ok: false, error: "TOGETHER_API_KEY not set — image generation is disabled." };

  try {
    const res = await fetch(TOGETHER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, width: 768, height: 768, n: 1, steps: 4 }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Together ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = await res.json();
    const item = data?.data?.[0];
    // Provider-hosted URL: no inline bytes, so Storage upload is skipped (the
    // create flow just keeps this URL — it's already a durable hosted link).
    if (item?.url) return { ok: true, url: item.url };
    if (item?.b64_json) {
      return {
        ok: true,
        url: `data:image/png;base64,${item.b64_json}`,
        bytes: base64ToBytes(item.b64_json),
        mime: "image/png",
      };
    }
    return { ok: false, error: "Together returned no image." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown image error" };
  }
}
