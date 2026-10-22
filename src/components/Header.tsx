"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";

import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/context/auth/AuthContext";
import { useProfileModal } from "@/context/auth/ProfileModalContext";
import { useExpGain } from "@/context/auth/ExpGainContext";
import Logo from "@/components/Logo";

// --- Supported Languages Configuration ---
// Define available locales and visual labels for the header language switcher.
const LOCALES = [
  { code: "en", label: "EN" },
  { code: "ms", label: "MS" },
  { code: "zh", label: "ZH" },
] as const;

// --- Header Navigation Component ---
// Provide global branding, localized navigation links, language selection, and responsive mobile sidebar.
export default function Header() {
  const t = useTranslations("layout.nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { user, isLoggedIn, isLoading, openAuthModal, logout } = useAuth();
  const { openProfileModal } = useProfileModal();
  const { level, currentLevelExp } = useExpGain();

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

  // --- UI ---
  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full border-b border-border-subtle bg-bg-primary/85 backdrop-blur-xl transition-all duration-300 ${
          isMobileMenuOpen ? "blur-sm opacity-60 md:blur-none md:opacity-100" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          {/* Brand & Logo */}
          <Link href="/" className="no-underline">
            <Logo showBeta size="lg" />
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
            {isLoading ? (
              <div className="h-9 w-20 rounded-lg bg-bg-card/40 animate-pulse border border-border-subtle/50" />
            ) : isLoggedIn ? (
              <div className="flex items-center gap-2">
                <div className="relative inline-flex items-center justify-center">
                  <button
                    type="button"
                    onClick={openProfileModal}
                    aria-label={t("profile")}
                    title={`Level ${level} (${currentLevelExp}/100 EXP) - ${t("profile")}`}
                    className="w-9 h-9 rounded-full bg-linear-to-br from-accent to-accent-gradient-end flex items-center justify-center text-sm font-bold text-bg-primary cursor-pointer border-none shadow-[0_0_15px_var(--accent-glow)] transition-all hover:scale-105 hover:shadow-[0_0_20px_var(--accent-glow-strong)]"
                  >
                    {(user?.name || (user?.metadata?.name as string) || (user?.metadata?.full_name as string) || user?.email)?.charAt(0).toUpperCase() || "U"}
                  </button>

                  {/* Level Badge floating on top right upon the profile icon */}
                  <span
                    className="absolute -bottom-1 -right-1 w-4 h-4 text-[9px] font-extrabold font-mono bg-bg-elevated border border-accent/70 text-accent rounded-full shadow-[0_0_10px_var(--accent-glow)] pointer-events-none select-none flex items-center justify-center"
                    title={`Level ${level} (${currentLevelExp}/100 EXP)`}
                  >
                    {level}
                  </span>
                </div>

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

          {/* Mobile Right Controls: Profile Icon & Hamburger Button */}
          <div className="flex items-center gap-3 md:hidden">
            {/* Mobile Profile Icon / Login Button */}
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-bg-card/40 animate-pulse border border-border-subtle/50" />
            ) : isLoggedIn ? (
              <div className="relative inline-flex items-center justify-center">
                <button
                  type="button"
                  onClick={openProfileModal}
                  aria-label={t("profile")}
                  title={`Level ${level} (${currentLevelExp}/100 EXP) - ${t("profile")}`}
                  className="w-8 h-8 rounded-full bg-linear-to-br from-accent to-accent-gradient-end flex items-center justify-center text-xs font-bold text-bg-primary cursor-pointer border-none shadow-[0_0_12px_var(--accent-glow)] transition-all hover:scale-105 active:scale-95"
                >
                  {(user?.name || (user?.metadata?.name as string) || (user?.metadata?.full_name as string) || user?.email)?.charAt(0).toUpperCase() || "U"}
                </button>

                {/* Level Badge floating on top right upon the mobile profile icon */}
                <span
                  className="absolute -bottom-1 -right-1 w-3.5 h-3.5 text-[8px] font-extrabold font-mono bg-bg-elevated border border-accent/70 text-accent rounded-full shadow-[0_0_8px_var(--accent-glow)] pointer-events-none select-none flex items-center justify-center"
                  title={`Level ${level} (${currentLevelExp}/100 EXP)`}
                >
                  {level}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="px-3 py-1.5 text-xs font-semibold bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 font-mono shadow-[0_0_10px_var(--accent-glow)]"
              >
                {t("login")}
              </button>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-bg-card border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-accent transition-all cursor-pointer"
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
            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="no-underline">
              <Logo size="md" />
            </Link>
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
              className={`px-4 py-3 rounded-r-xl text-sm font-semibold uppercase tracking-wider transition-all border-l-2 ${
                isActive("/")
                  ? "border-accent text-text-primary font-bold bg-transparent"
                  : "border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-card"
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
              className={`px-4 py-3 rounded-r-xl text-sm font-semibold uppercase tracking-wider transition-all border-l-2 ${
                isActive("/analysis")
                  ? "border-accent text-text-primary font-bold bg-transparent"
                  : "border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-card"
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
              className={`px-4 py-3 rounded-r-xl text-sm font-semibold uppercase tracking-wider transition-all border-l-2 ${
                isActive("/shared")
                  ? "border-accent text-text-primary font-bold bg-transparent"
                  : "border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-card"
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

          {/* Auth Controls in Mobile Drawer */}
          {isLoading ? (
            <div className="w-full h-12 rounded-xl bg-bg-card/40 animate-pulse border border-border-subtle/50" />
          ) : isLoggedIn ? (
            <div className="flex items-center gap-2">
              {/* Profile Button with (S) Avatar & Level Badge */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openProfileModal();
                }}
                className="flex-1 h-12 px-3 rounded-xl bg-bg-card hover:bg-bg-card-hover border border-border-subtle hover:border-border-accent text-text-primary flex items-center gap-2.5 min-w-0 cursor-pointer transition-all"
              >
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-accent to-accent-gradient-end flex items-center justify-center text-xs font-bold text-bg-primary shadow-[0_0_10px_var(--accent-glow)]">
                    {(user?.name || (user?.metadata?.name as string) || (user?.metadata?.full_name as string) || user?.email)?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 text-[8px] font-extrabold font-mono bg-bg-elevated border border-accent/70 text-accent rounded-full shadow-[0_0_8px_var(--accent-glow)] pointer-events-none flex items-center justify-center">
                    {level}
                  </span>
                </div>
                <div className="flex flex-col text-left min-w-0 flex-1">
                  <span className="text-xs font-bold text-text-primary truncate">{user?.name || t("profile")}</span>
                  <span className="text-[10px] text-text-muted font-mono truncate">{user?.email}</span>
                </div>
              </button>

              {/* Quick Logout Button */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                aria-label={t("logout")}
                title={t("logout")}
                className="w-12 h-12 rounded-xl bg-bg-card hover:bg-negative/15 border border-border-subtle hover:border-negative/40 text-text-muted hover:text-negative flex items-center justify-center cursor-pointer transition-all shrink-0"
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
