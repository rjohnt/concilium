"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, PlusCircle, GitBranch, LogOut, User, Car, Menu, X, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { getTickets } from "@/lib/store";
import { ThemeToggle } from "./ThemeToggle";
import { TemplateEditor } from "./TemplateEditor";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);

  const openSidebar = useCallback(() => {
    setIsMobileOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  // Focus management: focus close button when sidebar opens, hamburger when it closes
  useEffect(() => {
    if (isMobileOpen) {
      // Small delay to allow the close button to render
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
    } else {
      hamburgerRef.current?.focus();
    }
  }, [isMobileOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSidebar();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen, closeSidebar]);

  // Body scroll lock when sidebar is open on mobile
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  const [ticketCounts, setTicketCounts] = useState({ total: 0, active: 0 });

  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  // Refresh ticket counts on mount, navigation, window focus, storage changes,
  // and when tickets change in the same tab via the tickets-changed event.
  useEffect(() => {
    const refresh = () => {
      const allTickets = getTickets();
      setTicketCounts({
        total: allTickets.length,
        active: allTickets.filter(
          (t) =>
            t.status === "draft" ||
            t.status === "in-review" ||
            t.status === "consensus"
        ).length,
      });
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("tickets-changed", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("tickets-changed", refresh);
    };
  }, [pathname]);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/new", label: "New Ticket", icon: PlusCircle },
    { href: "/vin", label: "VIN Decoder", icon: Car },
    { label: "Templates", icon: Settings, onClick: () => setIsTemplateEditorOpen(true) },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Hamburger button — only visible on mobile */}
      <button
        ref={hamburgerRef}
        onClick={openSidebar}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-base border border-border-subtle text-ink-primary hover:bg-raised transition-colors md:hidden shadow-sm"
        aria-label="Open sidebar"
        aria-expanded={isMobileOpen}
        aria-controls="sidebar-navigation"
      >
        <Menu size={20} />
      </button>

      {/* Backdrop overlay — only visible on mobile when sidebar is open */}
      {isMobileOpen && (
        <button
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={closeSidebar}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar-navigation"
        className={`fixed left-0 top-0 h-full w-64 bg-base border-r border-border-subtle flex flex-col z-50 transition-transform duration-300 ease-in-out overscroll-contain
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* Close button — only visible on mobile */}
        <button
          ref={closeButtonRef}
          onClick={closeSidebar}
          className="absolute top-4 right-4 p-1 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-raised transition-colors md:hidden"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>

        {/* Logo */}
        <div className="p-6 border-b border-border-subtle">
          <Link href="/" className="flex items-center gap-3" onClick={closeSidebar}>
            <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center">
            <GitBranch size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-ink-primary tracking-tight font-sans">
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
            const isActive = "href" in item && item.href ? pathname === item.href : false;
            const isDashboard = "href" in item && item.href === "/";
            const className = `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-gold/10 text-gold"
                : "text-ink-secondary hover:text-ink-primary hover:bg-raised"
            }`;

            // Button-style nav item (no href, e.g. Templates)
            if ("onClick" in item && item.onClick) {
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    item.onClick?.();
                    closeSidebar();
                  }}
                  className={className + " w-full text-left cursor-pointer"}
                >
                  <item.icon size={18} />
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href ?? "/"}
                onClick={closeSidebar}
                className={className}
              >
                <item.icon size={18} />
                <span className="flex-1">{item.label}</span>
                {isDashboard && ticketCounts.total > 0 && (
                  <span className="flex items-center gap-1.5 ml-auto">
                    {ticketCounts.active > 0 && (
                      <motion.span
                        className="relative flex h-2.5 w-2.5"
                        animate={
                          prefersReducedMotion
                            ? { opacity: 1 }
                            : { opacity: [1, 0.3, 1] }
                        }
                        transition={{
                          duration: 1.8,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                        <motion.span
                          className="absolute inline-flex h-full w-full rounded-full bg-gold"
                          animate={
                            prefersReducedMotion
                              ? { scale: 1 }
                              : { scale: [1, 1.8, 1] }
                          }
                          transition={{
                            duration: 1.8,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          style={{ transformOrigin: "50% 50%" }}
                        />
                      </motion.span>
                    )}
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold leading-none rounded-full bg-gold/20 text-gold">
                      {ticketCounts.total}
                    </span>
                  </span>
                )}
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
                    <User size={16} className="text-white" />
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

              <ThemeToggle />

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

      {/* Template Editor Modal */}
      <TemplateEditor
        isOpen={isTemplateEditorOpen}
        onClose={() => setIsTemplateEditorOpen(false)}
      />
    </>
  );
}
