"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, PlusCircle, GitBranch, LogOut, User, Car, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/new", label: "New Ticket", icon: PlusCircle },
    { href: "/vin", label: "VIN Decoder", icon: Car },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Hamburger button — only visible on mobile */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-base border border-border-subtle text-ink-primary hover:bg-raised transition-colors md:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Backdrop overlay — only visible on mobile when sidebar is open */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-base border-r border-border-subtle flex flex-col z-50 transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* Close button — only visible on mobile */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-raised transition-colors md:hidden"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>

        {/* Logo */}
        <div className="p-6 border-b border-border-subtle">
          <Link href="/" className="flex items-center gap-3" onClick={() => setIsMobileOpen(false)}>
            <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center">
              <GitBranch size={18} className="text-[#1a1714]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-ink-primary tracking-tight">
                Concilium
              </h1>
              <p className="text-[10px] text-ink-muted uppercase tracking-wider">
                Multiplayer Tickets
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gold/10 text-gold"
                    : "text-ink-secondary hover:text-ink-primary hover:bg-raised"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-border-subtle">
          {user ? (
            <div className="space-y-3">
              {/* User Info */}
              <div className="flex items-center gap-3 px-1">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full ring-2 ring-border-visible"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center">
                    <User size={16} className="text-[#1a1714]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-primary truncate">
                    {user.user_metadata?.full_name ||
                      user.user_metadata?.name ||
                      user.email?.split("@")[0]}
                  </p>
                  <p className="text-xs text-ink-muted truncate">{user.email}</p>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-ink-secondary hover:text-ink-primary hover:bg-raised transition-colors"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xs text-ink-muted mb-2">Not signed in</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
