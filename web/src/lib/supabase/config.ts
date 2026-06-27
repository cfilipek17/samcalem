export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Server-only. Used for privileged operations like Storage uploads that bypass
// RLS. Never import this into client code. Optional — when absent the app keeps
// working with the data-URL image fallback.
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function hasSupabase(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// True when we can do server-side privileged work (Storage uploads).
export function hasServiceRole(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}
