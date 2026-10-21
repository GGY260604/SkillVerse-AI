import Link from "next/link";

// Logo Component Properties
export interface LogoProps {
  // Toggle text visibility beside icon.
  showText?: boolean;
  // Custom brand text or label.
  text?: string;
  // Toggle Beta badge indicator.
  showBeta?: boolean;
  // Responsive sizing preset.
  size?: "sm" | "md" | "lg";
  // Explicit icon dimension override.
  iconSize?: number;
  // Optional navigation destination link.
  href?: string;
  // Custom outer container styling.
  className?: string;
  // Custom typography styling.
  textClassName?: string;
  // Custom icon image styling.
  imageClassName?: string;
  // Optional click handler callback.
  onClick?: () => void;
}

// Reusable Brand Logo Component
// Renders the official SkillVerse mark with customizable text, beta pill, and sizing.
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
  // Compute default icon dimensions based on size preset.
  const resolvedIconSize =
    iconSize ?? (size === "sm" ? 20 : size === "lg" ? 24 : 22);

  // Compute text typography classes based on size preset.
  const defaultTextClasses =
    size === "sm"
      ? "text-xs sm:text-sm font-bold text-text-primary tracking-tight"
      : size === "lg"
      ? "text-lg font-bold text-text-primary tracking-tight"
      : "text-sm sm:text-base font-bold text-text-primary tracking-tight";

  // Inner logo content block.
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

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={containerClasses}>
        {content}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className={containerClasses}>
      {content}
    </div>
  );
}
