import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./client";

// Admin-Level Supabase Client Setup
// Used exclusively within protected server API routes for user management and verification.
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
