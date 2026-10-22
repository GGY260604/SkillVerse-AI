"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth, AuthModalView } from "@/context/auth/AuthContext";
import Logo from "@/components/Logo";

// --- Password Visibility Toggle Component ---
function PasswordEyeToggle({
  show,
  onToggle,
}: {
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 rounded-md transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"
      aria-label={show ? "Hide password" : "Show password"}
      title={show ? "Hide password" : "Show password"}
      tabIndex={-1}
    >
      {show ? (
        /* Eye Slash Icon (Hide Password) */
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
          />
        </svg>
      ) : (
        /* Eye Open Icon (Show Password) */
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      )}
    </button>
  );
}

// --- Authentication Overlay Modal Component ---
// Supports Email/Password Login, Registration with 6-digit OTP, and Password Recovery with 6-digit OTP.
export default function AuthModal() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const {
    isAuthModalOpen,
    authModalView,
    pendingEmail,
    closeAuthModal,
    setAuthModalView,
    setPendingEmail,
    checkAuth,
  } = useAuth();

  // --- Form State ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // --- Password Visibility State ---
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  // --- Request Status State ---
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const modalRef = useRef<HTMLDivElement>(null);

  // --- Modal Effects ---
  // Reset password visibility when switching views or modal opens
  useEffect(() => {
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowNewPassword(false);
    setShowResetConfirmPassword(false);
  }, [authModalView, isAuthModalOpen]);

  // Sync pendingEmail into local email state whenever modal opens or view changes.
  useEffect(() => {
    if (pendingEmail) {
      setEmail(pendingEmail);
    }
  }, [pendingEmail, authModalView]);

  // Initialize remembered credentials and preferences from browser local storage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedRemember = localStorage.getItem("skillverse_remember_me");
    const storedEmail = localStorage.getItem("skillverse_remembered_email");
    const storedPassword = localStorage.getItem("skillverse_remembered_password");
    if (storedRemember !== null) {
      setRememberMe(storedRemember === "true");
    }
    if (storedEmail && !pendingEmail) {
      setEmail(storedEmail);
    }
    if (storedRemember === "true" && storedPassword) {
      setPassword(storedPassword);
    }
  }, [pendingEmail]);

  // Clear transient error and success notices when view transitions.
  useEffect(() => {
    setErrorMsg("");
    setSuccessMsg("");
    setOtpToken("");
  }, [authModalView]);

  // Handle countdown timer for OTP resend action.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle Escape key to dismiss modal.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  // --- Error Message Mapping ---
  // Map server error codes and fallback messages to localized strings.
  const getLocalizedError = (code?: string, rawMsg?: string): string => {
    if (code === "invalid_credentials") return t("common.errors.invalid_credentials");
    if (code === "email_not_confirmed") return t("common.errors.email_not_confirmed");
    if (code === "user_already_exists") return t("common.errors.user_already_exists");
    if (code === "password_mismatch") return t("common.errors.password_mismatch");
    if (code === "password_too_short") return t("common.errors.password_too_short");
    if (code === "invalid_otp") return t("common.errors.invalid_verification_code");
    if (code === "network_error") return t("common.errors.network");
    if (code === "email_required") return t("common.errors.email_required");

    const lower = (rawMsg || "").toLowerCase();
    if (lower.includes("invalid login credentials")) return t("common.errors.invalid_credentials");
    if (lower.includes("email not confirmed")) return t("common.errors.email_not_confirmed");
    if (lower.includes("already registered") || lower.includes("already exists") || lower.includes("already in use")) {
      return t("common.errors.user_already_exists");
    }
    if (lower.includes("token has expired") || lower.includes("invalid token") || lower.includes("otp")) {
      return t("common.errors.invalid_verification_code");
    }

    return rawMsg || t("common.errors.unexpected");
  };

  // --- Form Submission Handlers ---
  // 1. Submit Handler: Email & Password Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(getLocalizedError(data.errorCode, data.error));
        return;
      }

      // Persist or clear remembered credentials in browser storage based on preference.
      if (typeof window !== "undefined") {
        if (rememberMe) {
          localStorage.setItem("skillverse_remember_me", "true");
          localStorage.setItem("skillverse_remembered_email", email.trim());
          localStorage.setItem("skillverse_remembered_password", password);
        } else {
          localStorage.setItem("skillverse_remember_me", "false");
          localStorage.removeItem("skillverse_remembered_email");
          localStorage.removeItem("skillverse_remembered_password");
        }
      }

      await checkAuth();
      closeAuthModal();
    } catch {
      setErrorMsg(t("common.errors.network"));
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Handler: Account Registration (Dispatches 6-Digit OTP)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg(t("common.errors.password_mismatch"));
      return;
    }

    if (password.length < 6) {
      setErrorMsg(t("common.errors.password_too_short"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, locale }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(getLocalizedError(data.errorCode, data.error));
        return;
      }

      setPendingEmail(email.trim());
      setResendCooldown(60);
      setSuccessMsg("Verification code dispatched to your email.");
      setAuthModalView("verify-register");
    } catch {
      setErrorMsg(t("common.errors.network"));
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit Handler: Verify Registration 6-Digit OTP
  const handleVerifyRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (otpToken.trim().length !== 6 || !/^\d{6}$/.test(otpToken.trim())) {
      setErrorMsg(t("common.errors.invalid_verification_code"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          token: otpToken.trim(),
          type: "signup",
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(getLocalizedError(data.errorCode, data.error));
        return;
      }

      await checkAuth();
      closeAuthModal();
    } catch {
      setErrorMsg(t("common.errors.network"));
    } finally {
      setLoading(false);
    }
  };

  // 4. Submit Handler: Send Forgot Password 6-Digit OTP
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim()) {
      setErrorMsg(t("common.errors.email_required"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(getLocalizedError(data.errorCode, data.error));
        return;
      }

      setPendingEmail(email.trim());
      setResendCooldown(60);
      setSuccessMsg("Password recovery code sent to your email.");
      setAuthModalView("verify-forgot");
    } catch {
      setErrorMsg(t("common.errors.network"));
    } finally {
      setLoading(false);
    }
  };

  // 5. Submit Handler: Verify Forgot OTP & Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (otpToken.trim().length !== 6 || !/^\d{6}$/.test(otpToken.trim())) {
      setErrorMsg(t("common.errors.invalid_verification_code"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(t("common.errors.password_mismatch"));
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg(t("common.errors.password_too_short"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          token: otpToken.trim(),
          newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(getLocalizedError(data.errorCode, data.error));
        return;
      }

      await checkAuth();
      closeAuthModal();
    } catch {
      setErrorMsg(t("common.errors.network"));
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP code action for registration or recovery flows.
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg("");
    setLoading(true);

    try {
      const endpoint =
        authModalView === "verify-register"
          ? "/api/auth/register"
          : "/api/auth/forgot-password";

      const payload =
        authModalView === "verify-register"
          ? { email: email.trim(), password: password || "TempPassword123!", locale }
          : { email: email.trim(), locale };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(getLocalizedError(data.errorCode, data.error));
        return;
      }

      setResendCooldown(60);
      setSuccessMsg("A fresh 6-digit code has been sent.");
    } catch {
      setErrorMsg(t("common.errors.network"));
    } finally {
      setLoading(false);
    }
  };

  // --- UI ---
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      {/* Modal Container */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain bg-bg-card/95 border border-border-subtle rounded-2xl p-4 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)]"
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-36 pointer-events-none" />

        {/* Modal Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Brand Header */}
        <div className="mb-4">
          <Logo size="md" />
        </div>

        {/* View 1: Sign In View */}
        {authModalView === "login" && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-1.5">{t("login.title")}</h2>
            <p className="text-xs sm:text-sm text-text-secondary mb-6 leading-relaxed">{t("login.description")}</p>

            {/* Error & Success Alerts */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-negative/10 border border-negative/30 text-negative text-xs leading-relaxed">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                  {t("common.email_label")}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("common.email_placeholder")}
                  className="w-full px-3.5 py-2.5 bg-bg-secondary/70 border border-border-subtle focus:border-accent rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                  {t("common.password_label")}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("common.password_placeholder")}
                    className="w-full px-3.5 py-2.5 pr-10 bg-bg-secondary/70 border border-border-subtle focus:border-accent rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                  />
                  <PasswordEyeToggle
                    show={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                  />
                </div>
              </div>

              {/* Remember Me Option and Forgot Password Link */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-border-subtle bg-bg-secondary text-accent accent-accent focus:ring-0 focus:outline-none cursor-pointer"
                  />
                  <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors font-medium">
                    {t("login.remember_me")}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setAuthModalView("forgot")}
                  className="text-xs text-accent hover:underline border-none bg-transparent cursor-pointer p-0 font-medium"
                >
                  {t("login.forgot_password_link")}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 text-xs font-semibold uppercase tracking-wider bg-accent text-bg-primary rounded-xl border-none cursor-pointer hover:shadow-[0_0_20px_var(--accent-glow-strong)] transition-all duration-300 disabled:opacity-50 mt-2 font-mono"
              >
                {loading ? t("login.signing_in") : t("login.button")}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-border-subtle text-center text-xs text-text-muted">
              {t("login.no_account")}{" "}
              <button
                type="button"
                onClick={() => setAuthModalView("register")}
                className="text-accent hover:underline font-semibold border-none bg-transparent cursor-pointer p-0"
              >
                {t("login.register_link")}
              </button>
            </div>
          </div>
        )}

        {/* View 2: Registration View */}
        {authModalView === "register" && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-1.5">{t("register.title")}</h2>
            <p className="text-xs sm:text-sm text-text-secondary mb-6 leading-relaxed">{t("register.description")}</p>

            {/* Error Alert */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-negative/10 border border-negative/30 text-negative text-xs leading-relaxed">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                  {t("common.email_label")}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("common.email_placeholder")}
                  className="w-full px-3.5 py-2.5 bg-bg-secondary/70 border border-border-subtle focus:border-accent rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                  {t("common.password_label")}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("common.password_placeholder")}
                    className="w-full px-3.5 py-2.5 pr-10 bg-bg-secondary/70 border border-border-subtle focus:border-accent rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                  />
                  <PasswordEyeToggle
                    show={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                  {t("common.confirm_password_label")}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("common.password_placeholder")}
                    className="w-full px-3.5 py-2.5 pr-10 bg-bg-secondary/70 border border-border-subtle focus:border-accent rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                  />
                  <PasswordEyeToggle
                    show={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 text-xs font-semibold uppercase tracking-wider bg-accent text-bg-primary rounded-xl border-none cursor-pointer hover:shadow-[0_0_20px_var(--accent-glow-strong)] transition-all duration-300 disabled:opacity-50 mt-2 font-mono"
              >
                {loading ? t("common.processing") : t("register.button")}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-border-subtle text-center text-xs text-text-muted">
              {t("register.have_account")}{" "}
              <button
                type="button"
                onClick={() => setAuthModalView("login")}
                className="text-accent hover:underline font-semibold border-none bg-transparent cursor-pointer p-0"
              >
                {t("common.signin_link")}
              </button>
            </div>
          </div>
        )}

        {/* View 3: Registration 6-Digit OTP Verification View */}
        {authModalView === "verify-register" && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-1.5">{t("verify_registration.title")}</h2>
            <p className="text-xs sm:text-sm text-text-secondary mb-1 leading-relaxed">{t("verify_registration.description")}</p>
            <p className="text-xs font-mono text-accent mb-6 truncate">{email}</p>

            {/* Error & Success Alerts */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-negative/10 border border-negative/30 text-negative text-xs leading-relaxed">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 rounded-lg bg-positive/10 border border-positive/30 text-positive text-xs leading-relaxed">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleVerifyRegisterOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                  {t("common.verification_code_label")}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-3.5 py-3 text-center tracking-[0.4em] font-mono text-lg bg-bg-secondary/70 border border-border-subtle focus:border-accent rounded-xl text-accent placeholder:text-text-muted outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpToken.length !== 6}
                className="w-full py-3 px-4 text-xs font-semibold uppercase tracking-wider bg-accent text-bg-primary rounded-xl border-none cursor-pointer hover:shadow-[0_0_20px_var(--accent-glow-strong)] transition-all duration-300 disabled:opacity-50 font-mono"
              >
                {loading ? t("common.processing") : t("common.verify_button")}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
              <button
                type="button"
                onClick={() => setAuthModalView("register")}
                className="hover:text-text-primary border-none bg-transparent cursor-pointer p-0"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || loading}
                className="text-accent hover:underline font-mono border-none bg-transparent cursor-pointer p-0 disabled:text-text-muted disabled:no-underline"
              >
                {resendCooldown > 0
                  ? t("common.resend_countdown", { seconds: resendCooldown })
                  : t("common.resend_code")}
              </button>
            </div>
          </div>
        )}

        {/* View 4: Forgot Password Request View */}
        {authModalView === "forgot" && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-1.5">{t("forgot_password.title")}</h2>
            <p className="text-xs sm:text-sm text-text-secondary mb-6 leading-relaxed">{t("forgot_password.description")}</p>

            {/* Error Alert */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-negative/10 border border-negative/30 text-negative text-xs leading-relaxed">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                  {t("common.email_label")}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("common.email_placeholder")}
                  className="w-full px-3.5 py-2.5 bg-bg-secondary/70 border border-border-subtle focus:border-accent rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 text-xs font-semibold uppercase tracking-wider bg-accent text-bg-primary rounded-xl border-none cursor-pointer hover:shadow-[0_0_20px_var(--accent-glow-strong)] transition-all duration-300 disabled:opacity-50 font-mono"
              >
                {loading ? t("common.processing") : t("forgot_password.button")}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-border-subtle text-center text-xs text-text-muted">
              <button
                type="button"
                onClick={() => setAuthModalView("login")}
                className="text-accent hover:underline font-semibold border-none bg-transparent cursor-pointer p-0"
              >
                ← {t("common.signin_link")}
              </button>
            </div>
          </div>
        )}

        {/* View 5: Verify Recovery OTP & Reset Password View */}
        {authModalView === "verify-forgot" && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-1.5">{t("reset_password.title")}</h2>
            <p className="text-xs sm:text-sm text-text-secondary mb-1 leading-relaxed">{t("reset_password.description")}</p>
            <p className="text-xs font-mono text-accent mb-6 truncate">{email}</p>

            {/* Error & Success Alerts */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-negative/10 border border-negative/30 text-negative text-xs leading-relaxed">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 rounded-lg bg-positive/10 border border-positive/30 text-positive text-xs leading-relaxed">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                  {t("common.verification_code_label")}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-3.5 py-2.5 text-center tracking-[0.4em] font-mono text-base bg-bg-secondary/70 border border-border-subtle focus:border-accent rounded-xl text-accent placeholder:text-text-muted outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                  {t("reset_password.new_password_label")}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("common.password_placeholder")}
                    className="w-full px-3.5 py-2.5 pr-10 bg-bg-secondary/70 border border-border-subtle focus:border-accent rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                  />
                  <PasswordEyeToggle
                    show={showNewPassword}
                    onToggle={() => setShowNewPassword(!showNewPassword)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                  {t("common.confirm_password_label")}
                </label>
                <div className="relative">
                  <input
                    type={showResetConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("common.password_placeholder")}
                    className="w-full px-3.5 py-2.5 pr-10 bg-bg-secondary/70 border border-border-subtle focus:border-accent rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                  />
                  <PasswordEyeToggle
                    show={showResetConfirmPassword}
                    onToggle={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpToken.length !== 6}
                className="w-full py-3 px-4 text-xs font-semibold uppercase tracking-wider bg-accent text-bg-primary rounded-xl border-none cursor-pointer hover:shadow-[0_0_20px_var(--accent-glow-strong)] transition-all duration-300 disabled:opacity-50 font-mono"
              >
                {loading ? t("common.processing") : t("reset_password.button")}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
              <button
                type="button"
                onClick={() => setAuthModalView("forgot")}
                className="hover:text-text-primary border-none bg-transparent cursor-pointer p-0"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || loading}
                className="text-accent hover:underline font-mono border-none bg-transparent cursor-pointer p-0 disabled:text-text-muted disabled:no-underline"
              >
                {resendCooldown > 0
                  ? t("common.resend_countdown", { seconds: resendCooldown })
                  : t("common.resend_code")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
