import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { AuthProvider } from "@/lib/auth-context";
import { AuthGuard } from "@/components/AuthGuard";
import { ToastProvider } from "@/lib/toast-context";
import { ToastContainer } from "@/components/ToastContainer";

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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#1a1714]">
        <AuthProvider>
          <ToastProvider>
            <AuthGuard>
              <div className="flex min-h-screen">
                <Sidebar />
                <main className="flex-1 ml-64 p-8">{children}</main>
              </div>
              <CommandPalette />
            </AuthGuard>
            <ToastContainer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
