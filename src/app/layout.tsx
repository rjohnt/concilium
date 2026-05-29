import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcutsSheet } from "@/components/KeyboardShortcutsSheet";
import { AuthProvider } from "@/lib/auth-context";
import { AuthGuard } from "@/components/AuthGuard";
import { Breadcrumb } from "@/components/Breadcrumb";
import PageTransition from "@/components/PageTransition";
import { ThemeProvider } from "@/lib/theme";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ToastProvider } from "@/components/Toast";

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
              <div className="flex min-h-screen">
                <Sidebar />
                <main className="flex-1 p-8 md:pt-8 pt-14 min-w-0">
                  <Breadcrumb className="mb-4" />
                  <PageTransition>{children}</PageTransition>
                </main>
              </div>
              <CommandPalette />
              <KeyboardShortcutsSheet />
            </AuthGuard>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
      </body>
    </html>
  );
}
