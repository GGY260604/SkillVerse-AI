/**
 * Utility to extract a clean 2-character avatar initials string across the entire application.
 * E.g., "John Doe" -> "JD", "Alex" -> "AL", "王小明" -> "王小", "user@example.com" -> "US"
 */
export function getAvatarInitials(nameOrEmail?: string | null): string {
  if (!nameOrEmail) return "U";

  const clean = nameOrEmail.trim();
  if (!clean) return "U";

  // If it's an email and has no distinct name, use the portion before @
  const str = clean.includes("@") ? clean.split("@")[0].trim() : clean;
  if (!str) return "U";

  // Check if it contains Chinese/Japanese/Korean (CJK) characters
  const isCjk = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(str);
  if (isCjk) {
    // For CJK names, directly take the first 2 characters
    return str.slice(0, 2);
  }

  // Split by whitespace or common delimiters
  const words = str.split(/[\s._-]+/).filter(Boolean);
  if (words.length >= 2) {
    // First letter of first word + first letter of second word
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }

  // Single word: take first 2 characters if available, else 1
  return str.slice(0, 2).toUpperCase();
}
