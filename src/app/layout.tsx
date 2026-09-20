import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { SampleBanner } from "@/components/SampleBanner";
import { AuthProvider } from "@/components/AuthProvider";
import { FreeWatermark } from "@/components/FreeWatermark";
import { ConditionalClerkProvider } from "@/components/ConditionalClerkProvider";
import { WatchlistProvider } from "@/components/WatchlistProvider";
import { getAuthMode, isClerkEnabled } from "@/lib/authMode";

export const metadata: Metadata = {
  title: "PurpleGap — Part D biosimilar conversion intelligence",
  description:
    "Medicare Part D biosimilar conversion intelligence for PBM formulary and plan teams. CMS Part D CY2024 (filtered) + FDA Purple Book.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkEnabled = isClerkEnabled();
  const mode = getAuthMode();
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <ConditionalClerkProvider enabled={clerkEnabled}>
          <AuthProvider mode={mode}>
            <WatchlistProvider>
              <SampleBanner />
              <Nav />
              <FreeWatermark />
              <main className="relative z-0 mx-auto max-w-7xl px-4 py-8 sm:py-10">{children}</main>
              <footer className="border-t border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between">
                  <span>PurpleGap · CMS Part D CY2024 (filtered) + FDA Purple Book</span>
                  <span>Not affiliated with CMS or FDA · Gross cost; not medical advice</span>
                </div>
              </footer>
            </WatchlistProvider>
          </AuthProvider>
        </ConditionalClerkProvider>
      </body>
    </html>
  );
}
