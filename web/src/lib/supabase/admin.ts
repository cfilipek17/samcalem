import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./config";

// Privileged, sessionless Supabase client using the service-role key. RLS is
// bypassed, so this is SERVER-ONLY — never import it into a client component.
// Used for Storage uploads in the create-post flow. Returns null when the
// service-role key isn't configured (e.g. demo mode), so callers can fall back
// to the inline data-URL and keep posting working.
export function createAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
