import "./globals.css";

// --- Root Layout Component ---
// Serve as the top-level shell delegating visual layout to the localized layout.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // --- UI ---
  return children;
}
