import { createClient } from "@supabase/supabase-js";

// ==========================================
// Browser Supabase Client Configuration
// ==========================================

// Strip optional trailing REST endpoint path and trailing slashes from the base URL.
export function getSupabaseUrl(): string {
  const rawUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://placeholder.supabase.co";
  return rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

// Client singleton instance configured with stateless session persistence.
export const supabase = createClient(
  getSupabaseUrl(),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "placeholder-anon-key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
