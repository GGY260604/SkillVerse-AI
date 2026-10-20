"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";

import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import { IS_LOGGED_IN } from "@/constants/auth";

// Supported Languages Configuration
// Define available locales and visual labels for the header language switcher.
const LOCALES = [
  { code: "en", label: "EN" },
  { code: "ms", label: "MS" },
  { code: "zh", label: "ZH" },
] as const;

// Header Navigation Component
// Provide global branding, localized navigation links, language selection, and responsive mobile sidebar.
export default function Header() {
  const t = useTranslations("other.nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determine whether a given navigation link is currently active.
  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  // Switch application locale smoothly using React transition.
  const handleLocaleSwitch = (newLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  // Guard protected navigation links when unauthenticated.
  const handleProtectedNav = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (!IS_LOGGED_IN) {
      e.preventDefault();
      router.push(href);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-bg-primary/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          {/* Brand & Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <img src="/favicon.ico" width={24} height={24} alt="SkillVerse AI" />
            <span className="text-lg font-bold text-text-primary tracking-tight">SkillVerse AI</span>
            <span className="text-[8px] font-semibold text-accent bg-accent-glow px-2 py-0.5 mr-auto rounded uppercase">Beta</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className={`text-sm font-medium uppercase tracking-wider transition-colors duration-200 relative ${
                isActive("/")
                  ? "text-text-primary after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-0.5 after:bg-accent after:rounded-full"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t("home")}
            </Link>
            <Link
              href="/analysis"
              onClick={(e) => handleProtectedNav(e, "/analysis")}
              className={`text-sm font-medium uppercase tracking-wider transition-colors duration-200 relative ${
                isActive("/analysis")
                  ? "text-text-primary after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-0.5 after:bg-accent after:rounded-full"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t("analysis")}
            </Link>
            <Link
              href="/shared"
              onClick={(e) => handleProtectedNav(e, "/shared")}
              className={`text-sm font-medium uppercase tracking-wider transition-colors duration-200 relative ${
                isActive("/shared")
                  ? "text-text-primary after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-0.5 after:bg-accent after:rounded-full"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t("shared")}
            </Link>
          </nav>

          {/* Desktop Right Controls: Language Switcher & Auth */}
          <div className="hidden md:flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex items-center bg-bg-card rounded-lg border border-border-subtle overflow-hidden">
              {LOCALES.map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => handleLocaleSwitch(code)}
                  disabled={isPending}
                  className={`px-3 py-1.5 text-xs font-semibold border-none cursor-pointer transition-all duration-200 ${
                    locale === code
                      ? "bg-accent text-bg-primary"
                      : "bg-transparent text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Login / Profile Button */}
            {IS_LOGGED_IN ? (
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-accent to-accent-gradient-end flex items-center justify-center text-sm font-bold text-bg-primary cursor-pointer">
                U
              </div>
            ) : (
              <button className="px-5 py-2 text-xs font-semibold bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 hover:shadow-[0_0_20px_var(--accent-glow-strong)] transition-all duration-300">
                {t("login")}
              </button>
            )}
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-bg-card border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-accent transition-all cursor-pointer"
          >
            {isMobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay Backdrop */}
      <div
        onClick={() => setIsMobileMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Mobile Navigation Sidebar Drawer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] bg-bg-secondary/95 backdrop-blur-2xl border-l border-border-subtle p-6 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between pb-5 border-b border-border-subtle mb-6">
            <div className="flex items-center gap-2">
              <img src="/favicon.ico" width={22} height={22} alt="SkillVerse AI" />
              <span className="text-base font-bold text-text-primary tracking-tight">SkillVerse AI</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-8 h-8 rounded-lg bg-bg-card border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-border-accent transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Mobile Nav Links */}
          <nav className="flex flex-col gap-2">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider transition-all ${
                isActive("/")
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
              }`}
            >
              {t("home")}
            </Link>
            <Link
              href="/analysis"
              onClick={(e) => {
                setIsMobileMenuOpen(false);
                handleProtectedNav(e, "/analysis");
              }}
              className={`px-4 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider transition-all ${
                isActive("/analysis")
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
              }`}
            >
              {t("analysis")}
            </Link>
            <Link
              href="/shared"
              onClick={(e) => {
                setIsMobileMenuOpen(false);
                handleProtectedNav(e, "/shared");
              }}
              className={`px-4 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider transition-all ${
                isActive("/shared")
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
              }`}
            >
              {t("shared")}
            </Link>
          </nav>
        </div>

        {/* Sidebar Bottom Controls */}
        <div className="pt-6 border-t border-border-subtle flex flex-col gap-4">
          {/* Language Switcher in Sidebar */}
          <div>
            <span className="block text-[11px] font-mono uppercase text-text-muted mb-2 tracking-wider">Language</span>
            <div className="grid grid-cols-3 bg-bg-card rounded-xl border border-border-subtle p-1 gap-1">
              {LOCALES.map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => {
                    handleLocaleSwitch(code);
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isPending}
                  className={`py-2 text-xs font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 text-center ${
                    locale === code
                      ? "bg-accent text-bg-primary shadow-sm"
                      : "bg-transparent text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Auth Button */}
          {IS_LOGGED_IN ? (
            <div className="py-2.5 px-4 rounded-xl bg-bg-card border border-border-subtle flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-accent to-accent-gradient-end flex items-center justify-center text-xs font-bold text-bg-primary">
                U
              </div>
              <span className="text-xs font-semibold text-text-primary">User Profile</span>
            </div>
          ) : (
            <button className="w-full py-3 text-xs font-semibold bg-accent text-bg-primary rounded-xl border-none cursor-pointer tracking-wide hover:opacity-90 shadow-[0_0_15px_var(--accent-glow)] transition-all">
              {t("login")}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

