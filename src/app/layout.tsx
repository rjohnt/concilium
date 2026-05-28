import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcutsSheet } from "@/components/KeyboardShortcutsSheet";
import { AuthProvider } from "@/lib/auth-context";
import { AuthGuard } from "@/components/AuthGuard";
import PageTransition from "@/components/PageTransition";
import { ThemeProvider } from "@/lib/theme";

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-[#1a1714]">
        <ThemeProvider>
          <AuthProvider>
            <AuthGuard>
              <div className="flex min-h-screen">
                <Sidebar />
                <main className="flex-1 md:ml-64 pt-14 p-8 md:pt-8">
                  <PageTransition>{children}</PageTransition>
                </main>
              </div>
              <CommandPalette />
              <KeyboardShortcutsSheet />
            </AuthGuard>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
