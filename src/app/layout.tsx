import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { AuthProvider } from "@/lib/auth-context";
import { AuthGuard } from "@/components/AuthGuard";

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
      <body className="min-h-screen bg-gray-950">
        <AuthProvider>
          <AuthGuard>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 ml-64 p-8">{children}</main>
            </div>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
