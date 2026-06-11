"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcutsSheet } from "@/components/KeyboardShortcutsSheet";
import PageTransition from "@/components/PageTransition";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  // Routes that render bare — no sidebar, breadcrumb, or app chrome
  const isBareRoute = useMemo(
    () => pathname === "/welcome" || pathname.startsWith("/welcome/"),
    [pathname]
  );

  if (isBareRoute) {
    return <PageTransition>{children}</PageTransition>;
  }

  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 md:pt-8 pt-14 min-w-0">
          <Breadcrumb className="mb-4" />
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <CommandPalette />
      <KeyboardShortcutsSheet />
    </>
  );
}
