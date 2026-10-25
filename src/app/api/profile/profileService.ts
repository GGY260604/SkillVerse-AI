import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UserProfileSummary {
  id: string;
  name: string | null;
  email: string;
  level: number;
  currentJobTitle: string | null;
  industry: string | null;
  skills?: string[];
  locale?: string;
  [key: string]: any;
}

export interface FetchProfilesOptions {
  userIds: string[];
  currentUserId?: string;
  admin?: SupabaseClient;
}

/**
 * Fetch profiles for multiple users in batch from the users table.
 * Standard profile reader helper for api/profile, page-analysis, and page-shared endpoints.
 *
 * Request Requirements:
 * - userIds: string[] (array of user UUIDs).
 * - currentUserId (optional): string. Requester user ID.
 * - admin (optional): SupabaseClient instance.
 */
export async function fetchUserProfilesBatch(
  options: FetchProfilesOptions
): Promise<{ success: boolean; users: UserProfileSummary[]; profiles: any[]; error?: string }> {
  try {
    const { userIds, admin = createAdminClient() } = options;
    if (!userIds || userIds.length === 0) {
      return { success: true, users: [], profiles: [] };
    }

    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    const { data: userRecords, error } = await admin
      .from("users")
      .select("*")
      .in("id", uniqueIds);

    if (error) {
      return { success: false, users: [], profiles: [], error: error.message };
    }

    const users: UserProfileSummary[] = (userRecords || []).map((u) => ({
      id: u.id,
      name: u.name || null,
      email: u.email || "",
      level: u.level ?? 1,
      currentJobTitle: u.currentJobTitle || null,
      industry: u.industry || null,
      skills: u.skills || [],
      locale: u.locale || "en",
    }));

    return {
      success: true,
      users,
      profiles: userRecords || [],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return { success: false, users: [], profiles: [], error: message };
  }
}
