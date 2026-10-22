// --- Admin Supabase Client ---
// Instantiate privileged Supabase client for server-side user management and data operations.
import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./client";

// Step 1: Admin Client Factory
// Build privileged client using the service role key for backend execution only.
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables.");
  }

  return createClient(getSupabaseUrl(), serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

