"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback", "/welcome", "/share", "/compare", "/evals"];

// In development without Supabase credentials, bypass auth entirely.
// NEXT_PUBLIC_* is inlined on both server and client, so this resolves to
// the same value on the server render and the first client render — gating
// it behind `typeof window` instead made the two diverge and produced a
// hydration mismatch on every authed page.
const isDevBypass =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Dev bypass: no Supabase configured, let everything through
  if (isDevBypass) {
    return <>{children}</>;
  }

  // Allow public paths without auth
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic) {
    // If already logged in and on auth page, redirect to home
    if (!loading && user && (pathname === "/login" || pathname === "/signup")) {
      router.replace("/");
      return null;
    }
    return <>{children}</>;
  }

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-coral-500" />
          <p className="text-sm text-ink-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated. Visitors landing on the root go
  // to the marketing page instead of a bare login wall.
  if (!user) {
    router.replace(pathname === "/" ? "/welcome" : "/login");
    return null;
  }

  return <>{children}</>;
}
