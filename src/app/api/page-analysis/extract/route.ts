import { NextRequest, NextResponse } from "next/server";
import { fetchWithFastApiFallback } from "@/lib/fastapi/client";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAuthenticatedUser,
  applyAuthCookies,
} from "@/lib/supabase/cookies";
import {
  normalizeProfileForForm,
  normalizeWorkArrangement,
  normalizeEmploymentStatus,
  normalizeYearsOfExperience,
  normalizeEducationLevel,
  normalizeIndustry,
  normalizeCareerGoal,
  normalizeWeeklyCommitmentHours,
  normalizeLearningProviders,
  normalizeTargetSectors,
} from "@/lib/profileNormalization";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit
const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
const ALLOWED_MIME_PREFIXES = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/jpg"];

/**
 * POST /api/page-analysis/extract
 * Accepts resume/CV document upload (PDF or Image, max 10MB), forwards to FastAPI extract engine (/api/v1/extract),
 * and automatically persists extracted profile attributes into the database users table.
 * Preserves existing identity fields (name, email, locale) and non-extracted fields.
 *
 * Request Requirements:
 * - Authentication: Optional (persists to profile if authenticated; otherwise returns extracted profile directly).
 * - Query Parameters: None.
 * - Request Body: FormData containing:
 *   - file (required): File. PDF or Image (PNG, JPG, WEBP) resume document, max 10MB.
 *
 * Workflow:
 * 1. Validate file presence, size, and MIME type.
 * 2. Forward resume document to FastAPI extraction service.
 * 3. Parse extraction payload from upstream engine.
 * 4. Persist extracted profile fields for authenticated users.
 * 5. Dispatch normalized profile response.
 */
export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: Validate File Presence, Size, and MIME Type
    // ==========================================
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Please upload a valid file." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File exceeds maximum allowed size of 10 MB. Current size: ${(
            file.size /
            (1024 * 1024)
          ).toFixed(2)} MB`,
        },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const fileType = (file.type || "").toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    const hasValidMime =
      ALLOWED_MIME_PREFIXES.some((mime) => fileType.startsWith(mime)) ||
      fileType.startsWith("image/");

    if (!hasValidExt && !hasValidMime) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported file format. Please upload a PDF or image file (PNG, JPG, WEBP).",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // Step 2: Forward Resume Document to FastAPI Extraction Service
    // ==========================================
    const forwardFormData = new FormData();
    forwardFormData.append("file", file, file.name);

    let extractData: Record<string, any> | null = null;
    let lastError: Error | null = null;

    try {
      const response = await fetchWithFastApiFallback(
        "/api/v1/extract",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          body: forwardFormData,
        },
        { timeoutMs: 70000 }
      );

      if (response.ok) {
        extractData = await response.json();
      } else {
        const errText = await response.text();
        let errMsg = `FastAPI returned HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.detail) errMsg = parsed.detail;
          else if (parsed.message) errMsg = parsed.message;
        } catch {
          if (errText) errMsg += `: ${errText.slice(0, 150)}`;
        }
        lastError = new Error(errMsg);
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    // ==========================================
    // Step 3: Parse Extraction Payload from Upstream Engine
    // ==========================================
    if (!extractData || !extractData.extractedProfile) {
      console.error("[/api/page-analysis/extract] Extraction failure:", lastError);
      return NextResponse.json(
        {
          success: false,
          error: lastError?.message || "Failed to process resume through extraction engine.",
        },
        { status: 502 }
      );
    }

    const extracted = extractData.extractedProfile;

    // ==========================================
    // Step 4: Persist Extracted Profile Fields for Authenticated Users
    // ==========================================
    let newAuthTokens = null;
    try {
      const { user, newTokens } = await getAuthenticatedUser();
      newAuthTokens = newTokens;

      if (user) {
        const admin = createAdminClient();

        // Check if user record already exists
        const { data: existingUser } = await admin
          .from("users")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        // Build selective update payload: only include fields that were extracted with valid values
        const updatePayload: Record<string, any> = {
          updatedAt: new Date().toISOString(),
        };

        if (extracted.employmentStatus) {
          updatePayload.employmentStatus = normalizeEmploymentStatus(extracted.employmentStatus);
        }
        if (extracted.currentJobTitle !== undefined && extracted.currentJobTitle !== null && extracted.currentJobTitle !== "") {
          updatePayload.currentJobTitle = extracted.currentJobTitle;
        }
        if (extracted.industry !== undefined && extracted.industry !== null && extracted.industry !== "") {
          updatePayload.industry = normalizeIndustry(extracted.industry);
        }
        if (extracted.educationLevel !== undefined && extracted.educationLevel !== null && extracted.educationLevel !== "") {
          updatePayload.educationLevel = normalizeEducationLevel(extracted.educationLevel);
        }
        if (extracted.yearsOfExperience !== undefined && extracted.yearsOfExperience !== null && extracted.yearsOfExperience !== "") {
          updatePayload.yearsOfExperience = normalizeYearsOfExperience(extracted.yearsOfExperience);
        }
        if (Array.isArray(extracted.skills) && extracted.skills.length > 0) {
          updatePayload.skills = extracted.skills;
        }
        if (Array.isArray(extracted.toolsAndSoftware) && extracted.toolsAndSoftware.length > 0) {
          updatePayload.toolsAndSoftware = extracted.toolsAndSoftware;
        }
        if (extracted.casualDescription !== undefined && extracted.casualDescription !== null && extracted.casualDescription !== "") {
          updatePayload.casualDescription = extracted.casualDescription;
        }
        if (Array.isArray(extracted.languages) && extracted.languages.length > 0) {
          updatePayload.languages = extracted.languages;
        }
        if (extracted.careerGoal) {
          updatePayload.careerGoal = normalizeCareerGoal(extracted.careerGoal);
        }
        if (Array.isArray(extracted.targetSectors) && extracted.targetSectors.length > 0) {
          updatePayload.targetSectors = normalizeTargetSectors(extracted.targetSectors);
        }
        if (extracted.targetJobTitle !== undefined && extracted.targetJobTitle !== null && extracted.targetJobTitle !== "") {
          updatePayload.targetJobTitle = extracted.targetJobTitle;
        }
        if (extracted.workArrangement) {
          updatePayload.workArrangement = normalizeWorkArrangement(extracted.workArrangement);
        }
        if (extracted.weeklyCommitmentHours) {
          updatePayload.weeklyCommitmentHours = normalizeWeeklyCommitmentHours(extracted.weeklyCommitmentHours);
        }
        if (Array.isArray(extracted.learningProviders) && extracted.learningProviders.length > 0) {
          updatePayload.learningProviders = normalizeLearningProviders(extracted.learningProviders);
        }
        if (extracted.outputLanguage) {
          updatePayload.outputLanguage = extracted.outputLanguage;
        }

        if (existingUser) {
          // Update only extracted fields, preserving name, email, locale and other non-extracted data
          await admin
            .from("users")
            .update(updatePayload)
            .eq("id", user.id);
        } else {
          // If user has no record in users table yet, create initial record with auth identity and extracted fields
          const insertPayload = {
            id: user.id,
            email: user.email || "",
            name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            locale: "en",
            ...updatePayload,
          };
          await admin.from("users").upsert(insertPayload, { onConflict: "id" });
        }
      }
    } catch (dbErr) {
      console.warn("[/api/page-analysis/extract] Non-critical database sync warning:", dbErr);
    }

    // ==========================================
    // Step 5: Dispatch Normalized Profile Response
    // ==========================================
    const response = NextResponse.json({
      success: true,
      message: extractData.message || "Resume parsed successfully.",
      extractedProfile: normalizeProfileForForm(extracted),
      rawTextPreview: extractData.rawTextPreview || null,
      extractionMethod: extractData.extractionMethod || "gemini",
      usedKey: extractData.usedKey || null,
    });
    return applyAuthCookies(response, newAuthTokens);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    console.error("[/api/page-analysis/extract] Unexpected error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
