import type { Metadata } from "next";
import { Suspense } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthModal from "@/components/auth/AuthModal";
import ProfileModal from "@/components/auth/ProfileModal";
import PlanModals from "@/components/analysis/options/PlanModals";
import ExpGainModal from "@/components/level/ExpGainModal";
import { AuthProvider } from "@/context/AuthContext";
import { PlanModalProvider } from "@/context/PlanModalContext";
import { UserLevelProvider } from "@/context/UserLevelContext";
import { routing } from "@/lib/i18n/routing";
import "../globals.css";

// Platform Metadata Configuration
// Define global SEO title and description tags for the application.
export const metadata: Metadata = {
  title: "SkillVerse AI | Future-Ready Workforce & SDG Navigation Platform",
  description:
    "AI-powered workforce intelligence platform. Navigate from who you are to where you will lead in the AI era. Powered by real-time labor market signals, cross-lingual skill matching, and UN SDG alignment.",
};

// Static Locale Route Generation
// Pre-render pages for all supported language locales at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Disable instant app shell prerendering to allow direct dynamic route parameter access.
export const instant = false;

// Localized Shell Layout
// Provide internationalization context, global header, footer, and font styles.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Await locale parameter from dynamic route.
  const { locale } = await params;

  // Trigger 404 if the requested locale is not supported.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering by binding locale to current server context.
  setRequestLocale(locale);

  // Load message catalog for client provider.
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark scheme-dark">
      <head>
        {/* Google Fonts Preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-bg-primary text-text-primary font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <Suspense fallback={<div className="min-h-screen bg-bg-primary" />}>
            <AuthProvider>
              <UserLevelProvider>
                <PlanModalProvider>
                  {/* Global Header Navigation */}
                  <Header />

                  {/* Main Content Area */}
                  <main className="flex-1 flex flex-col">{children}</main>

                  {/* Global Footer */}
                  <Footer />

                  {/* Global Auth Overlay Modal */}
                  <AuthModal />

                  {/* Global Profile Overlay Modal */}
                  <ProfileModal />

                  {/* Global Plan & Option Overlay Modals */}
                  <PlanModals />

                  {/* Global EXP & Level Up Celebration Modal */}
                  <ExpGainModal />
                </PlanModalProvider>
              </UserLevelProvider>
            </AuthProvider>
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

