import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Per-request tRPC context. Resolves the authenticated Supabase user (if any).
 * Profile provisioning happens in the protected procedure, not here.
 */
export async function createContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
