import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/config";

// Magic-link landing route. Supabase appends either:
//   ?code=...                    (PKCE flow — the @supabase/ssr default)
//   ?token_hash=...&type=email   (OTP verify fallback)
// We complete the session, then redirect to `next` (default "/"). The session
// cookies are written via the server client's cookie adapter.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Sanitize `next` so an attacker can't redirect off-site (open-redirect guard).
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") ? nextParam : "/";

  if (!hasSupabase()) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Couldn't establish a session — bounce to login with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
