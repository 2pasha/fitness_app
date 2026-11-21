import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getRuntimeConfig } from "@/lib/config";

export function getSupabaseAdmin(): SupabaseClient | null {
  const cfg = getRuntimeConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseServiceRoleKey) {
    return null;
  }
  return createClient(cfg.supabaseUrl, cfg.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
