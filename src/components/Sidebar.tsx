"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  LogOut,
  User,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { getTickets } from "@/lib/store";
import { TemplateEditor } from "./TemplateEditor";
import { ThemeToggle } from "./ThemeToggle";

// ── Concilium Design System palette ─────────────────────────────
const C = {
  bg: "var(--warm-100)",
  border: "var(--warm-200)",
  accent: "var(--coral-500)",
  accentLight: "var(--coral-100)",
  accentBorder: "var(--coral-200)",
  text: "var(--ink-700)",
  textPrimary: "var(--ink-900)",
  textMuted: "var(--ink-400)",
  hoverBg: "var(--warm-150)",
  searchBg: "var(--warm-50)",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, displayName } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [ticketCounts, setTicketCounts] = useState({ total: 0, active: 0 });

  const openSidebar = useCallback(() => setIsMobileOpen(true), []);
  const closeSidebar = useCallback(() => setIsMobileOpen(false), []);

  useEffect(() => {
    if (isMobileOpen) requestAnimationFrame(() => closeButtonRef.current?.focus());
    else hamburgerRef.current?.focus();
  }, [isMobileOpen]);

  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") closeSidebar(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen, closeSidebar]);

  useEffect(() => {
    if (isMobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileOpen]);

  const prefersReducedMotion = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  useEffect(() => {
    const refresh = () => {
      const allTickets = getTickets();
      setTicketCounts({
        total: allTickets.length,
        active: allTickets.filter(t => t.status === "draft" || t.status === "in-review" || t.status === "consensus").length,
      });
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("tickets-changed", refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("storage", refresh); window.removeEventListener("tickets-changed", refresh); };
  }, [pathname]);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/new", label: "New Ticket", icon: PlusCircle },
    { label: "Templates", icon: Settings, onClick: () => setIsTemplateEditorOpen(true) },
  ];

  const teamItems = [
    { label: "Engineering", color: "var(--persona-eng-500)" },
    { label: "Design", color: "var(--persona-des-500)" },
    { label: "Product", color: "var(--persona-prod-500)" },
    { label: "QA", color: "var(--persona-res-500)" },
  ];

  const handleSignOut = async () => { await signOut(); router.push("/login"); };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const n = (h: boolean) => ({
    display: "flex" as const, alignItems: "center" as const, gap: 10,
    width: "100%", padding: "8px 12px", borderRadius: 13, cursor: "pointer" as const,
    fontSize: 13, letterSpacing: "-0.1px", fontFamily: "var(--font-sans)" as const,
    background: h ? "var(--surface-card)" : "transparent",
    color: h ? C.textPrimary : C.text,
    fontWeight: h ? 600 : 500 as any,
    border: "1px solid transparent",
    boxShadow: h ? "var(--shadow-xs)" : "none",
    transition: "all 0.12s",
    textDecoration: "none",
    boxSizing: "border-box" as const,
  } as React.CSSProperties);

  // ── Collapsed mode ───────────────────────────────────────────
  if (isCollapsed) {
    return (
      <>
        <aside className="fixed left-0 top-0 h-full z-40 flex flex-col items-center py-4 gap-1 overflow-hidden"
          style={{ width: 60, background: C.bg, borderRight: `1px solid ${C.border}` }}
        >
          <Link href="/" className="mb-4">
            <img src="/brand/logo-mark.svg" width={32} height={32} alt="" />
          </Link>
          {[{ href: "/", icon: LayoutDashboard, active: pathname === "/" }].map(item => (
            <Link key={item.href} href={item.href}
              style={{
                width: 40, height: 40, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center",
                background: item.active ? "var(--surface-card)" : "transparent",
                color: item.active ? C.textPrimary : C.textMuted,
                border: "1px solid transparent",
                boxShadow: item.active ? "var(--shadow-xs)" : "none",
                transition: "all 0.12s",
                textDecoration: "none",
              }}
              onMouseOver={e => { if (!item.active) { e.currentTarget.style.background = C.hoverBg; e.currentTarget.style.color = C.textPrimary; } }}
              onMouseOut={e => { if (!item.active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textMuted; } }}
            >
              <item.icon size={16} />
            </Link>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={() => setIsCollapsed(false)}
            style={{ width: 40, height: 40, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: C.textMuted, border: "none", cursor: "pointer", transition: "color 0.12s" }}
            onMouseOver={e => e.currentTarget.style.color = C.textPrimary}
            onMouseOut={e => e.currentTarget.style.color = C.textMuted}
          >
            <ChevronRight size={16} />
          </button>
        </aside>
        <div className="w-[60px] shrink-0 hidden md:block" />
      </>
    );
  }

  // ── Expanded mode ────────────────────────────────────────────
  return (
    <>
      <button ref={hamburgerRef} onClick={openSidebar}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg md:hidden shadow-sm"
        style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
        aria-label="Open sidebar" aria-expanded={isMobileOpen} aria-controls="sidebar-navigation"
      >
        <Menu size={20} />
      </button>

      {isMobileOpen && <button className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={closeSidebar} aria-label="Close sidebar" />}

      <aside id="sidebar-navigation"
        className={`fixed left-0 top-0 h-full z-50 flex flex-col overscroll-contain
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:sticky md:top-0`}
        style={{ width: 256, background: C.bg, borderRight: `1px solid ${C.border}` }}
      >
        <button ref={closeButtonRef} onClick={closeSidebar}
          className="absolute top-4 right-4 p-1 rounded-lg md:hidden" style={{ color: C.textMuted }} aria-label="Close sidebar">
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" className="flex items-center gap-2.5" onClick={closeSidebar} style={{ textDecoration: "none" }}>
            <img src="/brand/logo-mark.svg" width={28} height={28} alt="" />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--ink-900)", letterSpacing: "-0.01em" }}>Concilium</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 1, letterSpacing: "0.02em" }}>give every project a council</div>
            </div>
          </Link>
          <button onClick={() => setIsCollapsed(true)} className="hidden md:block"
            style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", transition: "color 0.12s" }}
            onMouseOver={e => e.currentTarget.style.color = C.textPrimary}
            onMouseOut={e => e.currentTarget.style.color = C.textMuted}
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: C.searchBg, border: `1px solid ${C.border}` }}>
            <Search size={13} style={{ color: C.textMuted }} />
            <span style={{ fontSize: 12, color: C.textMuted }}>Search...</span>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "4px 8px" }}>
          <div style={{ padding: "8px 12px 6px", fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>Navigation</div>
          {navItems.map((item) => {
            const isActive = "href" in item && item.href ? pathname === item.href : false;
            const navStyle = n(isActive);

            if ("onClick" in item && item.onClick) {
              return (
                <button key={item.label} onClick={() => { item.onClick?.(); closeSidebar(); }} style={navStyle}>
                  <item.icon size={16} />
                  <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                </button>
              );
            }

            return (
              <Link key={item.href} href={item.href ?? "/"} onClick={closeSidebar} style={navStyle}>
                <item.icon size={16} />
                <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                {"href" in item && item.href === "/" && ticketCounts.total > 0 && (
                  <span className="flex items-center gap-1.5">
                    {ticketCounts.active > 0 && (
                      <motion.span className="relative flex h-2 w-2"
                        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <span className="absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: C.accent }} />
                        <motion.span className="absolute inline-flex h-full w-full rounded-full"
                          style={{ background: C.accent, transformOrigin: "50% 50%" }}
                          animate={prefersReducedMotion ? { scale: 1 } : { scale: [1, 1.8, 1] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </motion.span>
                    )}
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: "0.01em", background: isActive ? "var(--coral-100)" : C.hoverBg, color: isActive ? "var(--coral-700)" : C.textMuted }}>
                      {ticketCounts.total}
                    </span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Teams */}
        <div style={{ padding: "4px 8px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ padding: "8px 12px 6px", fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>Teams</div>
          {teamItems.map(team => (
            <div key={team.label}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, letterSpacing: "-0.1px", color: C.text, cursor: "pointer", transition: "background 0.12s" }}
              onMouseOver={e => e.currentTarget.style.background = C.hoverBg}
              onMouseOut={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: team.color, flexShrink: 0 }} />
              <span>{team.label}</span>
            </div>
          ))}
        </div>

        {/* User */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 px-1">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-7 h-7 rounded-full shrink-0" style={{ border: `1.5px solid ${C.accentBorder}` }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.accentLight, border: `1.5px solid ${C.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
                    {getInitials(displayName || user.email)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: C.textPrimary }}>{displayName || user.email?.split("@")[0]}</p>
                  <p className="text-[10px]" style={{ color: C.textMuted }}>Free plan</p>
                </div>
              </div>
              <ThemeToggle />
              <button onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs" style={{ color: C.textMuted }}
                onMouseOver={e => { e.currentTarget.style.background = C.hoverBg; e.currentTarget.style.color = C.textPrimary; }}
                onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textMuted; }}
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xs mb-2" style={{ color: C.textMuted }}>Not signed in</p>
              <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500, background: "var(--coral-100)", color: "var(--coral-700)", textDecoration: "none" }}>Sign in</Link>
            </div>
          )}
        </div>
      </aside>

      <TemplateEditor isOpen={isTemplateEditorOpen} onClose={() => setIsTemplateEditorOpen(false)} />
    </>
  );
}
