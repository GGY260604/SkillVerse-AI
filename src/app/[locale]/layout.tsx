import type { Metadata } from "next";
import { Suspense } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthModal from "@/components/auth/AuthModal";
import ProfileModal from "@/components/auth/ProfileModal";
import PlanModals from "@/components/page-analysis/options/PlanModals";
import SharedPlansModal from "@/components/page-analysis/SharedPlansModal";
import ExpGainModal from "@/components/auth/ExpGainModal";
import Chatbot from "@/components/chatbot/Chatbot";
import { AuthProvider } from "@/context/auth/AuthContext";
import { ProfileModalProvider } from "@/context/auth/ProfileModalContext";
import { ExpGainProvider } from "@/context/auth/ExpGainContext";
import { PlanModalProvider } from "@/context/page-analysis/PlanModalContext";
import { SharedModalProvider } from "@/context/page-analysis/SharedModalContext";
import { ChatbotProvider } from "@/context/chatbot/ChatbotContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { routing } from "@/lib/i18n/routing";
import "../globals.css";

// ==========================================
// Step 1: Define Platform Metadata Configuration
// ==========================================
// Configure global SEO titles and descriptive tags for search indexing.
export const metadata: Metadata = {
  title: "SkillVerse AI | Future-Ready Workforce & SDG Navigation Platform",
  description:
    "AI-powered workforce intelligence platform. Navigate from who you are to where you will lead in the AI era. Powered by real-time labor market signals, cross-lingual skill matching, and UN SDG alignment.",
};

// ==========================================
// Step 2: Configure Static Locale Route Generation
// ==========================================
// Pre-render localized route trees for all supported language configurations.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// ==========================================
// Step 3: Configure Route Shell Pre-Rendering
// ==========================================
// Disable instant app shell prerendering to allow direct dynamic route parameter access.
export const instant = false;

/**
 * Root localized platform layout shell.
 * Provide internationalization context, global state providers, header navigation, modals, and footer.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // ==========================================
  // Step 4: Resolve and Validate Dynamic Locale Parameter
  // ==========================================
  // Await locale parameter from dynamic route parameters promise.
  const { locale } = await params;

  // Branch A: Unsupported Locale Validation
  // Trigger 404 response if the requested locale is not registered.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // ==========================================
  // Step 5: Synchronize Server Locale Context
  // ==========================================
  // Enable static rendering by binding locale to current server request context.
  setRequestLocale(locale);

  // ==========================================
  // Step 6: Load Localized Message Catalog
  // ==========================================
  // Fetch translation dictionary messages for client hydration.
  const messages = await getMessages();

  // ==========================================
  // Step 7: Render Localized Application Shell and Context Hierarchy
  // ==========================================
  // Compose document tree with typography, internationalization, and shared context providers.
  return (
    <html lang={locale} className="dark" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* ========================================== */}
        {/* Google Fonts Preconnect */}
        {/* ========================================== */}
        {/* Preconnect to external Google Fonts CDN. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-bg-primary text-text-primary font-sans antialiased">
        {/* ========================================== */}
        {/* Client Provider and Context Hierarchy */}
        {/* ========================================== */}
        {/* Provide internationalization, theme, and authentication states. */}
        <NextIntlClientProvider messages={messages}>
          <Suspense fallback={<div className="min-h-screen bg-bg-primary" />}>
            <ThemeProvider>
              <AuthProvider>
                <ProfileModalProvider>
                  <ExpGainProvider>
                    <PlanModalProvider>
                      <SharedModalProvider>
                        <ChatbotProvider>
                        {/* ========================================== */}
                        {/* Header Navigation */}
                        {/* ========================================== */}
                        {/* Render platform global header with navigation links and controls. */}
                        <Header />

                        {/* ========================================== */}
                        {/* Main Page Content */}
                        {/* ========================================== */}
                        {/* Render active route page child content. */}
                        <main className="flex-1 flex flex-col w-full overflow-x-clip">{children}</main>

                        {/* ========================================== */}
                        {/* Footer */}
                        {/* ========================================== */}
                        {/* Render global footer with branding and SDG alignment links. */}
                        <Footer />

                        {/* ========================================== */}
                        {/* Global Modal Overlays */}
                        {/* ========================================== */}
                        {/* Mount authentication modal overlay. */}
                        <AuthModal />

                        {/* Mount user profile edit modal overlay. */}
                        <ProfileModal />

                        {/* Mount career plan creation and quiz modal overlays. */}
                        <PlanModals />

                        {/* Mount shared community plans modal overlay. */}
                        <SharedPlansModal />

                        {/* Mount experience point gain celebration overlay. */}
                        <ExpGainModal />

                        {/* Mount AI Copilot floating chatbot assistant. */}
                        <Chatbot />
                      </ChatbotProvider>
                    </SharedModalProvider>
                  </PlanModalProvider>
                  </ExpGainProvider>
                </ProfileModalProvider>
              </AuthProvider>
            </ThemeProvider>
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
