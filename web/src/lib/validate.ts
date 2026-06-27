// Pre-generation gate (SPEC §8.1): one cheap LLM call that checks the pasted
// text is (a) a business idea and (b) PG — BEFORE we spend money on an image.
// ~10-50x cheaper than an image, so it lowers net cost by killing junk early.

import type { ValidationResult } from "./types";

const TOGETHER_CHAT_URL = "https://api.together.xyz/v1/chat/completions";

const SYSTEM = `You are a strict content gate for a comedy app where people post FUNNY startup/business ideas.
Decide two things about the user's text:
1. is_business_idea: true only if it is plausibly a startup/business/product idea (it can be absurd or a joke — that's fine — but it must be an *idea for a thing*, not random text, a greeting, or gibberish).
2. is_pg: true if it is roughly PG-13 — no sexual content, slurs, graphic violence, or hate.
Respond with ONLY minified JSON: {"is_business_idea":bool,"is_pg":bool,"reason":"short","fix_suggestions":["..."]}.
fix_suggestions: 1-3 short rewrites turning it into a PG business idea (empty array if it passes).`;

export async function validateIdea(text: string): Promise<ValidationResult> {
  const key = process.env.TOGETHER_API_KEY;
  const model = process.env.VALIDATION_MODEL ?? "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";

  // No key yet → don't block local testing.
  if (!key) {
    return { is_business_idea: true, is_pg: true, reason: "validation skipped (no API key)", fix_suggestions: [] };
  }

  try {
    const res = await fetch(TOGETHER_CHAT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 200,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: text.slice(0, 1000) },
        ],
      }),
    });

    if (!res.ok) {
      // Fail open (allow) but flag — better to let a post through than block on an outage.
      return { is_business_idea: true, is_pg: true, reason: `validator error ${res.status}`, fix_suggestions: [] };
    }

    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json);
    return {
      is_business_idea: !!parsed.is_business_idea,
      is_pg: !!parsed.is_pg,
      reason: String(parsed.reason ?? ""),
      fix_suggestions: Array.isArray(parsed.fix_suggestions) ? parsed.fix_suggestions.slice(0, 3) : [],
    };
  } catch {
    return { is_business_idea: true, is_pg: true, reason: "validator parse error", fix_suggestions: [] };
  }
}
