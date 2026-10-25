/**
 * Avatar Initials Extraction Utility
 * Extract a standardized 2-character avatar initials string across the platform.
 * Supports Western naming conventions, CJK ideographs, and email fallbacks.
 *
 * Workflow:
 * 1. Clean input string and fall back to default initials if empty.
 * 2. Strip domain suffix if input is an email address.
 * 3. Extract initials based on character taxonomy (CJK, multi-word, or single word).
 */
export function getAvatarInitials(nameOrEmail?: string | null): string {
  // ==========================================
  // Step 1: Clean Input String and Handle Empty Fallbacks
  // ==========================================
  if (!nameOrEmail) return "U";

  const clean = nameOrEmail.trim();
  if (!clean) return "U";

  // ==========================================
  // Step 2: Extract Username Portion for Email Addresses
  // ==========================================
  const str = clean.includes("@") ? clean.split("@")[0].trim() : clean;
  if (!str) return "U";

  // ==========================================
  // Step 3: Extract Initials Based on Character Taxonomy
  // ==========================================
  // ==========================================
  // Branch A: Chinese, Japanese, or Korean Ideographs
  // ==========================================
  const isCjk = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(str);
  if (isCjk) {
    // Take the first two ideograph characters.
    return str.slice(0, 2);
  }

  // ==========================================
  // Branch B: Multi-Word Western Names
  // ==========================================
  const words = str.split(/[\s._-]+/).filter(Boolean);
  if (words.length >= 2) {
    // Combine the initial letters of the first and second words.
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }

  // ==========================================
  // Branch C: Single Word Names
  // ==========================================
  return str.slice(0, 2).toUpperCase();
}
