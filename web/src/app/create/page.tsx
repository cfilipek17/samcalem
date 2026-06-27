import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/supabase/config";
import { getSessionUser } from "@/lib/supabase/auth";
import CreateForm from "./CreateForm";

// Server gate: posting requires auth. In live mode, logged-out visitors are sent
// to /login (returning to /create afterward). Demo mode (no keys) renders the form
// so the flow stays explorable without a Supabase project.
export default async function CreatePage() {
  if (hasSupabase()) {
    const user = await getSessionUser();
    if (!user) redirect("/login?next=/create");
  }

  return <CreateForm />;
}
