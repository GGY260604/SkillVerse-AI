import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import { IS_LOGGED_IN } from "@/constants/auth";

// Component Props Definition
interface AuthGateProps {
  children: React.ReactNode;
}

// Authentication Access Gate
// Render protected children if user is authenticated; otherwise prompt user to log in.
export default function AuthGate({ children }: AuthGateProps) {
  const t = useTranslations("other.auth");

  // Bypass gate and render protected content when user is logged in.
  if (IS_LOGGED_IN) {
    return <>{children}</>;
  }

  return (
    <div className="flex-1 flex items-center justify-center py-20 px-6">
      {/* Auth Restriction Modal Card */}
      <div className="glass-card animate-fade-in-up rounded-2xl p-8 sm:p-12 text-center max-w-md w-full">
        {/* Security Lock Icon */}
        <div className="w-16 h-16 rounded-full bg-accent-glow flex items-center justify-center mx-auto mb-6 text-3xl">
          🔒
        </div>

        {/* Modal Heading */}
        <h2 className="text-2xl font-bold text-text-primary mb-3">{t("login_required")}</h2>

        {/* Modal Description */}
        <p className="text-sm text-text-secondary leading-relaxed mb-8">{t("login_required_desc")}</p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button className="btn-glow px-6 py-3 text-sm font-semibold bg-accent text-bg-primary border-none rounded-xl cursor-pointer w-full tracking-wide">
            {t("login_to_continue")}
          </button>

          <Link
            href="/"
            className="px-6 py-3 text-sm font-medium text-text-secondary no-underline border border-border-subtle rounded-xl transition-all duration-200 block hover:text-text-primary hover:border-border-hover"
          >
            {t("go_home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

