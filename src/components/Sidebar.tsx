"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  GitBranch,
  LogOut,
  User,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle,
  Activity,
  Search,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { getTickets } from "@/lib/store";
import { TemplateEditor } from "./TemplateEditor";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const openSidebar = useCallback(() => setIsMobileOpen(true), []);
  const closeSidebar = useCallback(() => setIsMobileOpen(false), []);

  // Focus management
  useEffect(() => {
    if (isMobileOpen) {
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    } else {
      hamburgerRef.current?.focus();
    }
  }, [isMobileOpen]);

  // Escape key
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen, closeSidebar]);

  // Body scroll lock
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobileOpen]);

  const [ticketCounts, setTicketCounts] = useState({ total: 0, active: 0 });

  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

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

  const sidebarWidth = isCollapsed ? 60 : 256;
  const sidebarStyles = {
    width: isCollapsed ? 60 : 256,
    transition: "width 0.2s ease",
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/new", label: "New Ticket", icon: PlusCircle },
    { label: "Templates", icon: Settings, onClick: () => setIsTemplateEditorOpen(true) },
  ];

  const teamItems = [
    { label: "Engineering", color: "#6b8fa8" },
    { label: "Design", color: "#c9a84c" },
    { label: "Product", color: "#6b8f5e" },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Collapsed sidebar
  if (isCollapsed) {
    return (
      <>
        <aside
          className="fixed left-0 top-0 h-full z-40 bg-base border-r border-border-subtle flex flex-col items-center py-4 gap-1 overflow-hidden"
          style={{ width: 60 }}
        >
          <Link href="/" className="mb-4">
            <div className="w-9 h-9 rounded-lg bg-gold flex items-center justify-center text-sm font-bold text-deep">
              C
            </div>
          </Link>

          {[{ href: "/", icon: LayoutDashboard, isActive: pathname === "/" }].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                item.isActive ? "bg-raised" : "hover:bg-raised hover:text-ink-secondary"
              }`}
              style={{
                color: item.isActive ? "var(--color-gold)" : "var(--color-ink-muted)",
                border: item.isActive ? "1px solid var(--color-border-visible)" : "1px solid transparent",
              }}
            >
              <item.icon size={16} />
            </Link>
          ))}

          <div className="flex-1" />

          <button
            onClick={() => setIsCollapsed(false)}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-secondary transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </aside>
        {/* Spacer for layout */}
        <div className="w-[60px] shrink-0 hidden md:block" />
      </>
    );
  }

  return (
    <>
      {/* Hamburger — mobile only */}
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

      {/* Backdrop — mobile only */}
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
        className={`fixed left-0 top-0 h-full z-50 bg-base border-r border-border-subtle flex flex-col overscroll-contain
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:sticky md:top-0
        `}
        style={sidebarStyles}
      >
        {/* Close button — mobile only */}
        <button
          ref={closeButtonRef}
          onClick={closeSidebar}
          className="absolute top-4 right-4 p-1 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-raised transition-colors md:hidden"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="p-5 pb-4 border-b border-border-subtle flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" onClick={closeSidebar}>
            <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center shrink-0">
              <GitBranch size={16} className="text-deep" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-ink-primary tracking-tight leading-tight">
                concilium
              </h1>
              <p className="text-[10px] text-ink-muted uppercase tracking-wider leading-tight">
                firebird
              </p>
            </div>
          </Link>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-lg text-ink-muted hover:text-ink-secondary hover:bg-raised transition-colors hidden md:block"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-deep border border-border-subtle text-ink-muted text-xs">
            <Search size={13} />
            <span>Search...</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-1 space-y-0.5">
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            Navigation
          </p>
          {navItems.map((item) => {
            const isActive = "href" in item && item.href ? pathname === item.href : false;

            const linkClass = `flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs transition-all ${
              isActive
                ? "bg-raised text-ink-primary font-semibold border border-border-visible"
                : "text-ink-secondary font-medium hover:text-ink-primary hover:bg-raised border border-transparent"
            }`;

            if ("onClick" in item && item.onClick) {
              return (
                <button
                  key={item.label}
                  onClick={() => { item.onClick?.(); closeSidebar(); }}
                  className={linkClass + " text-left cursor-pointer"}
                >
                  <item.icon size={16} />
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href ?? "/"}
                onClick={closeSidebar}
                className={linkClass}
              >
                <item.icon size={16} />
                <span className="flex-1">{item.label}</span>
                {"href" in item && item.href === "/" && ticketCounts.total > 0 && (
                  <span className="flex items-center gap-1.5">
                    {ticketCounts.active > 0 && (
                      <motion.span
                        className="relative flex h-2 w-2"
                        animate={
                          prefersReducedMotion
                            ? { opacity: 1 }
                            : { opacity: [1, 0.3, 1] }
                        }
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                        <motion.span
                          className="absolute inline-flex h-full w-full rounded-full bg-gold"
                          animate={
                            prefersReducedMotion
                              ? { scale: 1 }
                              : { scale: [1, 1.8, 1] }
                          }
                          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                          style={{ transformOrigin: "50% 50%" }}
                        />
                      </motion.span>
                    )}
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-semibold leading-none rounded-full bg-gold/15 text-gold border border-gold/20">
                      {ticketCounts.total}
                    </span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Teams */}
        <div className="px-2 py-1 border-t border-border-subtle">
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            Teams
          </p>
          {teamItems.map((team) => (
            <div
              key={team.label}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-ink-secondary hover:bg-raised hover:text-ink-primary transition-colors cursor-pointer"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: team.color }}
              />
              {team.label}
            </div>
          ))}
        </div>

        {/* User */}
        <div className="p-4 border-t border-border-subtle">
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 px-1">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    className="w-7 h-7 rounded-full ring-2 ring-border-visible shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-overlay flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-semibold text-gold">
                      {getInitials(user.user_metadata?.full_name || user.user_metadata?.name || user.email)}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink-primary truncate">
                    {user.user_metadata?.full_name ||
                      user.user_metadata?.name ||
                      user.email?.split("@")[0]}
                  </p>
                  <p className="text-[10px] text-ink-muted">Free plan</p>
                </div>
              </div>

              <ThemeToggle />

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs text-ink-secondary hover:text-ink-primary hover:bg-raised transition-colors"
              >
                <LogOut size={14} />
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

      {/* Template Editor */}
      <TemplateEditor
        isOpen={isTemplateEditorOpen}
        onClose={() => setIsTemplateEditorOpen(false)}
      />
    </>
  );
}
