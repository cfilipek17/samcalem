"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPostAction, type CreatePostResult } from "@/app/actions";
import type { ValidationResult } from "@/lib/types";

const COPY_PROMPT =
  "You are a delusional startup founder pitching to a VC who has already left the room. Invent ONE absurd, hilarious startup idea in 1-2 sentences. Make it sound like a real pitch but completely unhinged. Output ONLY the pitch text, nothing else.";

export default function CreateForm() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejected, setRejected] = useState<ValidationResult | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(COPY_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setMsg("Couldn't copy — select the prompt and copy it manually.");
    }
  }

  async function submit() {
    setBusy(true);
    setRejected(null);
    setMsg(null);
    const idea = pasted.trim();
    const res: CreatePostResult = await createPostAction(idea, caption.trim() || idea);
    setBusy(false);

    switch (res.status) {
      case "ok":
        router.push("/");
        break;
      case "rejected":
        setRejected(res.validation);
        break;
      case "needs_auth":
        // Session expired between the server gate and submit — send to login.
        router.push("/login?next=/create");
        break;
      case "limit":
        setMsg("You've hit today's posting limit (5). Come back tomorrow.");
        break;
      case "error":
        setMsg(res.message);
        break;
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 py-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Feed
        </Link>
        <span className="text-lg font-black tracking-tight">
          Pitch<span className="text-amber-400">wreck</span>
        </span>
      </div>

      <div>
        <h1 className="text-xl font-bold">Post a startup idea</h1>
        <p className="mt-1 text-sm text-white/60">
          Run this prompt in your own ChatGPT or Claude, then paste what it gives you back here.
          We&apos;ll turn it into a comical image.
        </p>
      </div>

      {/* Step 1 — copy the prompt */}
      <div className="rounded-xl bg-white/5 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          1 · Copy this prompt
        </div>
        <p className="text-sm text-white/80">{COPY_PROMPT}</p>
        <button
          onClick={copyPrompt}
          className="mt-3 rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-bold text-black hover:bg-amber-300"
        >
          {copied ? "Copied!" : "Copy prompt"}
        </button>
      </div>

      {/* Step 2 — paste the result */}
      <div className="rounded-xl bg-white/5 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          2 · Paste the AI&apos;s answer
        </div>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={4}
          placeholder="Paste the startup idea your AI wrote..."
          className="w-full resize-none rounded-lg bg-black/40 p-3 text-sm outline-none ring-1 ring-white/10 focus:ring-amber-400"
        />
      </div>

      {rejected && (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm ring-1 ring-red-500/30">
          <p className="font-semibold text-red-300">
            That doesn&apos;t look like a postable business idea.
          </p>
          {rejected.reason && <p className="mt-1 text-white/70">{rejected.reason}</p>}
          {rejected.fix_suggestions.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs uppercase tracking-wide text-white/50">Try one of these:</p>
              {rejected.fix_suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setPasted(s);
                    setRejected(null);
                  }}
                  className="block w-full rounded-lg bg-white/5 p-2 text-left text-white/80 hover:bg-white/10"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {msg && (
        <div className="rounded-xl bg-white/5 p-3 text-sm text-amber-300 ring-1 ring-white/10">
          {msg}
        </div>
      )}

      <button
        onClick={submit}
        disabled={busy || pasted.trim().length < 4}
        className="mt-auto rounded-xl bg-amber-400 py-3 font-bold text-black transition hover:bg-amber-300 disabled:opacity-40"
      >
        {busy ? "Generating slop…" : "Generate & post"}
      </button>
    </div>
  );
}
