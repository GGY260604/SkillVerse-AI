// --- Browser Supabase Client ---
// Initialize client-side Supabase client singleton using public environment variables.
import { createClient } from "@supabase/supabase-js";

// Clean Supabase base URL by removing optional trailing REST endpoint path.
export function getSupabaseUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return rawUrl.replace(/\/rest\/v1\/?$/, "");
}

// Step 1: Client Singleton Instance
// Reusable singleton client for browser authentication and data querying.
export const supabase = createClient(
  getSupabaseUrl(),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

