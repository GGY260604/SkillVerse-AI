import Link from "next/link";
import "./globals.css";

/**
 * Root platform 404 fallback page.
 * Render global dark futuristic fallback when the requested route does not resolve to any localized path.
 */
export default function GlobalNotFound() {
  // ==========================================
  // Step 1: Render Global Fallback Document Structure
  // ==========================================
  // Construct root HTML document shell and link typography assets.
  return (
    <html lang="en" className="dark scheme-dark">
      <head>
        <title>404 - Page Not Found | SkillVerse AI</title>
        <meta name="description" content="The page you are looking for does not exist or has been relocated." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg-primary text-text-primary font-sans antialiased flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
        {/* ========================================== */}
        {/* Background Ambient Glow */}
        {/* ========================================== */}
        {/* Render radial ambient backdrop glow. */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-100 bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_70%)] pointer-events-none" />

        {/* ========================================== */}
        {/* 404 Status Indicator */}
        {/* ========================================== */}
        {/* Display oversized monospace 404 status indicator. */}
        <h1 className="text-8xl sm:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-b from-text-primary via-text-secondary to-transparent font-mono select-none drop-shadow-2xl mb-4">404</h1>

        {/* ========================================== */}
        {/* Narrative Description */}
        {/* ========================================== */}
        {/* Present human-readable explanation and navigation guidance. */}
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-3 text-center max-w-lg">Lost in the Skill Universe</h2>
        <p className="text-sm text-text-secondary text-center max-w-md leading-relaxed mb-8">The page you requested does not exist or has been relocated. Return to the platform homepage to explore workforce pathways.</p>

        {/* ========================================== */}
        {/* Navigation Action Button */}
        {/* ========================================== */}
        {/* Render return-to-home navigation link. */}
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-bg-primary text-xs font-semibold uppercase tracking-wider font-mono hover:opacity-90 hover:shadow-[0_0_25px_var(--accent-glow-strong)] transition-all duration-300 no-underline"
        >
          <span>←</span>
          <span>Return Home</span>
        </Link>
      </body>
    </html>
  );
}
