"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/config";

function LoginForm() {
  const search = useSearchParams();
  // Where to send the user after the magic link completes (defaults to feed).
  const next = search.get("next") || "/";

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = hasSupabase();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const addr = email.trim();
    if (!addr) return;

    if (!configured) {
      setError("Login isn't available in demo mode (no Supabase keys configured).");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(false);

    if (otpErr) {
      setError(otpErr.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 py-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Feed
        </Link>
        <span className="text-lg font-black tracking-tight">
          Pitch<span className="text-amber-400">wreck</span>
        </span>
      </div>

      {sent ? (
        <div className="mt-6 rounded-xl bg-white/5 p-6 text-center ring-1 ring-white/10">
          <div className="mb-3 text-4xl">📬</div>
          <h1 className="text-xl font-bold">Check your email</h1>
          <p className="mt-2 text-sm text-white/60">
            We sent a magic sign-in link to{" "}
            <span className="font-medium text-white/90">{email.trim()}</span>. Tap it on this
            device to finish logging in.
          </p>
          <button
            onClick={() => {
              setSent(false);
              setError(null);
            }}
            className="mt-5 text-sm text-amber-400 hover:text-amber-300"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold">Log in to post &amp; rate</h1>
            <p className="mt-1 text-sm text-white/60">
              Enter your email and we&apos;ll send you a one-tap magic link. No password.
            </p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg bg-black/40 p-3 text-sm outline-none ring-1 ring-white/10 focus:ring-amber-400"
            />
            <button
              type="submit"
              disabled={busy || email.trim().length < 3}
              className="rounded-xl bg-amber-400 py-3 font-bold text-black transition hover:bg-amber-300 disabled:opacity-40"
            >
              {busy ? "Sending link…" : "Send magic link"}
            </button>
          </form>

          {error && (
            <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300 ring-1 ring-red-500/30">
              {error}
            </div>
          )}

          {!configured && (
            <p className="text-xs text-white/40">
              Demo mode: scrolling works without an account, but posting and rating need login.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
