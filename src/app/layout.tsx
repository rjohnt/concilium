import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { AuthGuard } from "@/components/AuthGuard";
import { ThemeProvider } from "@/lib/theme";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ToastProvider } from "@/components/Toast";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Concilium — Multiplayer AI-Assisted Tickets",
  description:
    "Replace JIRA's throw-it-over-the-wall workflow with AI-mediated stakeholder collaboration.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-deep">
        <ThemeProvider>
          <OfflineBanner />
          <ToastProvider>
            <AuthProvider>
              <AuthGuard>
                <AppShell>{children}</AppShell>
              </AuthGuard>
            </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
      </body>
    </html>
  );
}
