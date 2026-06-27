// Pre-generation gate (SPEC §8.1): one cheap LLM call that checks the pasted
// text is (a) a business idea and (b) PG — BEFORE we spend money on an image.
// Defaults to Gemini (same key as image gen); falls back to Together if that's
// the only key present. Fails OPEN on errors so an outage never blocks posting.

import type { ValidationResult } from "./types";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const TOGETHER_CHAT_URL = "https://api.together.xyz/v1/chat/completions";

const INSTRUCTION = `You are a strict content gate for a comedy app where people post FUNNY startup/business ideas.
Decide two things about the user's text:
1. is_business_idea: true only if it is plausibly a startup/business/product idea (it can be absurd or a joke — that's fine — but it must be an *idea for a thing*, not random text, a greeting, or gibberish).
2. is_pg: true if it is roughly PG-13 — no sexual content, slurs, graphic violence, or hate.
Respond with ONLY minified JSON: {"is_business_idea":bool,"is_pg":bool,"reason":"short","fix_suggestions":["..."]}.
fix_suggestions: 1-3 short rewrites turning it into a PG business idea (empty array if it passes).`;

const PASS = (reason: string): ValidationResult => ({
  is_business_idea: true,
  is_pg: true,
  reason,
  fix_suggestions: [],
});

export async function validateIdea(text: string): Promise<ValidationResult> {
  const googleKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  const togetherKey = process.env.TOGETHER_API_KEY;

  try {
    if (googleKey) return await validateWithGemini(text, googleKey);
    if (togetherKey) return await validateWithTogether(text, togetherKey);
    return PASS("validation skipped (no API key)");
  } catch {
    return PASS("validator error — allowed through");
  }
}

function parseResult(raw: string): ValidationResult {
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const parsed = JSON.parse(json);
  return {
    is_business_idea: !!parsed.is_business_idea,
    is_pg: !!parsed.is_pg,
    reason: String(parsed.reason ?? ""),
    fix_suggestions: Array.isArray(parsed.fix_suggestions) ? parsed.fix_suggestions.slice(0, 3) : [],
  };
}

async function validateWithGemini(text: string, key: string): Promise<ValidationResult> {
  const model = process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash-lite";
  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: INSTRUCTION }] },
      contents: [{ parts: [{ text: text.slice(0, 1000) }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) return PASS(`validator error ${res.status}`);
  const data = await res.json();
  return parseResult(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
}

async function validateWithTogether(text: string, key: string): Promise<ValidationResult> {
  const model = process.env.VALIDATION_MODEL ?? "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";
  const res = await fetch(TOGETHER_CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 200,
      messages: [
        { role: "system", content: INSTRUCTION },
        { role: "user", content: text.slice(0, 1000) },
      ],
    }),
  });
  if (!res.ok) return PASS(`validator error ${res.status}`);
  const data = await res.json();
  return parseResult(data?.choices?.[0]?.message?.content ?? "");
}
