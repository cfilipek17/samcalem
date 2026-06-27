"use client";

import { useState } from "react";
import Link from "next/link";
import { generateTestImageAction } from "@/app/actions";

const SAMPLES = [
  "Uber, but the driver is also an unlicensed therapist.",
  "A subscription box that mails you one raw potato per month.",
  "AI smart fridge that locks itself and gaslights you about whether you ate.",
  "LinkedIn, but every post is read aloud by a medieval town crier.",
];

export default function LabPage() {
  const [idea, setIdea] = useState(SAMPLES[0]);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    setUrl(null);
    const res = await generateTestImageAction(idea.trim());
    setBusy(false);
    if (res.ok) {
      setUrl(res.url);
      setPrompt(res.prompt);
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-5 py-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Feed
        </Link>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
          dev image lab
        </span>
      </div>

      <h1 className="text-xl font-bold">Is Nano Banana funny enough?</h1>
      <p className="text-sm text-white/60">
        Paste an idea, generate, judge the image. No login or DB — this is just to tune the model
        and prompt style. Needs <code className="text-amber-300">GOOGLE_API_KEY</code> in{" "}
        <code className="text-amber-300">.env.local</code>.
      </p>

      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-lg bg-black/40 p-3 text-sm outline-none ring-1 ring-white/10 focus:ring-amber-400"
      />

      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button
            key={s}
            onClick={() => setIdea(s)}
            className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
          >
            {s.slice(0, 28)}…
          </button>
        ))}
      </div>

      <button
        onClick={go}
        disabled={busy || idea.trim().length < 4}
        className="rounded-xl bg-amber-400 py-3 font-bold text-black transition hover:bg-amber-300 disabled:opacity-40"
      >
        {busy ? "Generating…" : "Generate image"}
      </button>

      {error && (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300 ring-1 ring-red-500/30">
          {error}
        </div>
      )}

      {url && (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="generated" className="w-full rounded-xl ring-1 ring-white/10" />
          {prompt && <p className="text-xs text-white/40">prompt: {prompt}</p>}
        </div>
      )}
    </div>
  );
}
