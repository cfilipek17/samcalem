import { createClient } from "./server";
import { hasSupabase } from "./config";

export type SessionUser = {
  id: string;
  username: string;
};

// Server-side: who's logged in (with their profile username), or null.
// Safe in demo mode — returns null when Supabase isn't configured.
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!hasSupabase()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Username lives in profiles (auto-created by the on_auth_user_created trigger).
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    username: profile?.username ?? "wreck",
  };
}
