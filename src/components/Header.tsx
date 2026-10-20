"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";

import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/context/AuthContext";

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

  const { user, isLoggedIn, openAuthModal, openProfileModal, logout } = useAuth();

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
    _href: string
  ) => {
    if (!isLoggedIn) {
      e.preventDefault();
      openAuthModal("login");
    }
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full border-b border-border-subtle bg-bg-primary/85 backdrop-blur-xl transition-all duration-300 ${
          isMobileMenuOpen ? "blur-sm opacity-60 md:blur-none md:opacity-100" : ""
        }`}
      >
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

            {/* Login / Profile Avatar & Quick Logout Controls */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openProfileModal}
                  aria-label={t("profile")}
                  title={t("profile")}
                  className="w-9 h-9 rounded-full bg-linear-to-br from-accent to-accent-gradient-end flex items-center justify-center text-sm font-bold text-bg-primary cursor-pointer border-none shadow-[0_0_15px_var(--accent-glow)] transition-all hover:scale-105 hover:shadow-[0_0_20px_var(--accent-glow-strong)]"
                >
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </button>

                <button
                  type="button"
                  onClick={logout}
                  aria-label={t("logout")}
                  title={t("logout")}
                  className="w-9 h-9 rounded-full bg-bg-card hover:bg-negative/15 border border-border-subtle hover:border-negative/40 text-text-muted hover:text-negative flex items-center justify-center cursor-pointer transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="px-5 py-2 text-xs font-semibold bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 hover:shadow-[0_0_20px_var(--accent-glow-strong)] transition-all duration-300 font-mono"
              >
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
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-md transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Mobile Navigation Sidebar Drawer */}
      <aside
        className={`fixed top-0 right-0 z-60 h-full w-72 max-w-[85vw] bg-bg-secondary/95 backdrop-blur-2xl border-l border-border-subtle p-6 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
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
          {isLoggedIn ? (
            <div className="flex flex-col gap-2">
              <div className="py-2.5 px-4 rounded-xl bg-bg-card border border-border-subtle flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-accent to-accent-gradient-end flex items-center justify-center text-xs font-bold text-bg-primary">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="truncate flex-1">
                  <span className="block text-xs font-semibold text-text-primary truncate">{user?.email}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openProfileModal();
                }}
                className="w-full py-2.5 text-xs font-semibold text-text-primary hover:text-accent bg-bg-card hover:bg-bg-card-hover border border-border-subtle rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{t("profile")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="w-full py-2.5 text-xs font-semibold text-negative hover:bg-negative/10 border border-negative/30 rounded-xl bg-transparent cursor-pointer transition-all font-mono flex items-center justify-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>{t("logout")}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                openAuthModal("login");
              }}
              className="w-full py-3 text-xs font-semibold bg-accent text-bg-primary rounded-xl border-none cursor-pointer tracking-wide hover:opacity-90 shadow-[0_0_15px_var(--accent-glow)] transition-all font-mono"
            >
              {t("login")}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

