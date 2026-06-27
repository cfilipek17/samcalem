import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from "./config";

// Refreshes the Supabase auth session on every matched request and writes the
// rotated cookies back onto the response. This is the documented @supabase/ssr
// pattern; in Next.js 16 it's wired through `proxy.ts` (the renamed middleware).
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // Demo mode: no keys -> nothing to refresh, let the request pass straight through.
  if (!hasSupabase()) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: do not run code between createServerClient and getUser() — getUser
  // is what revalidates/refreshes the token and triggers the cookie setAll above.
  await supabase.auth.getUser();

  return response;
}
