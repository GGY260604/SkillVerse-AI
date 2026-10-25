import Link from "next/link";

// --- Logo Component Properties ---
export interface LogoProps {
  showText?: boolean;
  text?: string;
  showBeta?: boolean;
  size?: "sm" | "md" | "lg";
  iconSize?: number;
  href?: string;
  className?: string;
  textClassName?: string;
  imageClassName?: string;
  onClick?: () => void;
}

/**
 * Logo Component
 * Render the official SkillVerse brand mark with configurable typography, sizing, and beta indicator.
 *
 * Component Requirements:
 * - Brand presentation: Display emblem and optional typography.
 * - Interactive navigation: Render next/link anchor if href is provided, or static container otherwise.
 *
 * Workflow:
 * 1. Compute icon dimensions and typography tokens from size presets.
 * 2. Build inner emblem image, typography label, and optional beta badge.
 * 3. Render either an interactive Link navigation container or a standard division.
 */
export default function Logo({
  showText = true,
  text = "SkillVerse AI",
  showBeta = false,
  size = "md",
  iconSize,
  href,
  className = "",
  textClassName = "",
  imageClassName = "",
  onClick,
}: LogoProps) {
  // ==========================================
  // Step 1: Compute Icon Dimensions and Typography Tokens
  // ==========================================
  // Determine pixel size based on preset and calculate typography scaling classes.
  const resolvedIconSize =
    iconSize ?? (size === "sm" ? 20 : size === "lg" ? 24 : 22);

  const defaultTextClasses =
    size === "sm"
      ? "text-xs sm:text-sm font-bold text-text-primary tracking-tight"
      : size === "lg"
      ? "text-lg font-bold text-text-primary tracking-tight"
      : "text-sm sm:text-base font-bold text-text-primary tracking-tight";

  // ==========================================
  // Step 2: Build Emblem Image, Typography Label, and Beta Badge
  // ==========================================
  // Assemble brand favicon image, customizable text title, and optional beta status pill.
  const content = (
    <>
      <img
        src="/favicon.ico"
        alt={`${text} Logo`}
        width={resolvedIconSize}
        height={resolvedIconSize}
        className={`rounded shrink-0 object-contain ${imageClassName}`}
      />
      {showText && (
        <span className={textClassName || defaultTextClasses}>{text}</span>
      )}
      {showBeta && (
        <span className="text-[8px] font-semibold text-accent bg-accent-glow px-2 py-0.5 rounded uppercase tracking-wider select-none">
          Beta
        </span>
      )}
    </>
  );

  const containerClasses = `inline-flex items-center gap-2.5 select-none ${
    href ? "no-underline cursor-pointer" : ""
  } ${className}`;

  // ==========================================
  // Step 3: Render Interactive Link or Division Container
  // ==========================================
  // ==========================================
  // Branch A: Interactive Link Navigation
  // ==========================================
  if (href) {
    return (
      <Link href={href} onClick={onClick} className={containerClasses}>
        {content}
      </Link>
    );
  }

  // ==========================================
  // Branch B: Static Division Container
  // ==========================================
  return (
    <div onClick={onClick} className={containerClasses}>
      {content}
    </div>
  );
}
