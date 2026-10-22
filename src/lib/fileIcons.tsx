import React from "react";

// --- File Format Classification ---
// Purpose: Detect file types and provide stylized SVG icons with color badges.

export type FileCategory =
  | "pdf"
  | "word"
  | "image"
  | "text"
  | "spreadsheet"
  | "unknown";

export interface FileFormatInfo {
  category: FileCategory;
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export interface FileFormatIconProps {
  fileOrName: File | string;
  className?: string;
  iconClassName?: string;
}

// 1. File Category Detection
// Detect category from file extension or MIME type.
export function getFileCategory(fileOrName: File | string): FileCategory {
  const filename = typeof fileOrName === "string" ? fileOrName : fileOrName.name;
  const mimeType = typeof fileOrName === "object" && fileOrName.type ? fileOrName.type.toLowerCase() : "";
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (ext === "pdf" || mimeType === "application/pdf") {
    return "pdf";
  }

  if (
    ext === "doc" ||
    ext === "docx" ||
    mimeType.includes("word") ||
    mimeType === "application/msword"
  ) {
    return "word";
  }

  if (
    ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "tiff"].includes(ext) ||
    mimeType.startsWith("image/")
  ) {
    return "image";
  }

  if (["txt", "md", "rtf"].includes(ext) || mimeType.startsWith("text/")) {
    return "text";
  }

  if (
    ["csv", "xls", "xlsx"].includes(ext) ||
    mimeType.includes("csv") ||
    mimeType.includes("excel") ||
    mimeType.includes("spreadsheetml")
  ) {
    return "spreadsheet";
  }

  return "unknown";
}

// 2. Styling Metadata Resolver
// Map file category to corresponding Tailwind colors and badge styles.
export function getFileFormatInfo(category: FileCategory): FileFormatInfo {
  switch (category) {
    case "pdf":
      return {
        category,
        label: "PDF Document",
        colorClass: "text-red-400",
        bgClass: "bg-red-500/10",
        borderClass: "border-red-500/30",
      };
    case "word":
      return {
        category,
        label: "Word Document",
        colorClass: "text-blue-400",
        bgClass: "bg-blue-500/10",
        borderClass: "border-blue-500/30",
      };
    case "image":
      return {
        category,
        label: "Image / Scan",
        colorClass: "text-emerald-400",
        bgClass: "bg-emerald-500/10",
        borderClass: "border-emerald-500/30",
      };
    case "text":
      return {
        category,
        label: "Plain Text",
        colorClass: "text-amber-400",
        bgClass: "bg-amber-500/10",
        borderClass: "border-amber-500/30",
      };
    case "spreadsheet":
      return {
        category,
        label: "Spreadsheet",
        colorClass: "text-teal-400",
        bgClass: "bg-teal-500/10",
        borderClass: "border-teal-500/30",
      };
    case "unknown":
    default:
      return {
        category: "unknown",
        label: "Document",
        colorClass: "text-text-muted",
        bgClass: "bg-bg-secondary",
        borderClass: "border-border-subtle",
      };
  }
}

// 3. File Format Icon Component
// Render SVG icon corresponding to the categorized file format.
export function FileFormatIcon({
  fileOrName,
  className = "w-12 h-12 rounded-xl",
  iconClassName = "w-6 h-6",
}: FileFormatIconProps) {
  const category = getFileCategory(fileOrName);
  const info = getFileFormatInfo(category);

  return (
    <div
      className={`flex items-center justify-center border transition-all ${info.bgClass} ${info.borderClass} ${info.colorClass} ${className}`}
      title={info.label}
    >
      {category === "pdf" && (
        <svg className={iconClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 13h2m-2 4h4m-4-8h2"
          />
        </svg>
      )}

      {category === "word" && (
        <svg className={iconClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      )}

      {category === "image" && (
        <svg className={iconClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      )}

      {category === "text" && (
        <svg className={iconClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M8 9h8m-8 4h6m-6 4h8M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
          />
        </svg>
      )}

      {category === "spreadsheet" && (
        <svg className={iconClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3 10h18M3 14h18M10 3v18M14 3v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
          />
        </svg>
      )}

      {category === "unknown" && (
        <svg className={iconClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )}
    </div>
  );
}
