import { createClient } from "@supabase/supabase-js";

// Clean Supabase base URL by removing optional trailing REST endpoint path.
export function getSupabaseUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return rawUrl.replace(/\/rest\/v1\/?$/, "");
}

// Browser-Side Supabase Client Instance
// Reusable singleton client for client-side authentication and querying.
export const supabase = createClient(
  getSupabaseUrl(),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);
