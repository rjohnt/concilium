"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Ticket, TicketStatus, PersonaId, PRIORITY_LABELS, PRIORITY_COLORS, PriorityLevel, PREDEFINED_TAGS } from "@/lib/types";
import { seedData, getTickets } from "@/lib/store";
import { getAllPersonas } from "@/lib/personas";
import { TicketCard } from "@/components/TicketCard";
import { SeatOccupancyBanner } from "@/components/SeatOccupancyBanner";
import { TagChip } from "@/components/TagChip";
import { FilterBar } from "@/components/FilterBar";
import { DashboardSkeleton, SkeletonCard } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { PersonaIcon } from "@/components/PersonaIcon";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { PlusCircle, Users, Filter, HelpCircle, SearchX, Search, X, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type FilterKey = "all" | TicketStatus;
const BATCH_SIZE = 20;

// ── Concilium Design System palette ─────────────────────────────────
const MP = {
  statCard: { bg: "#ffffff", border: "var(--warm-200)", hoverBorder: "var(--warm-300)", shadow: "var(--shadow-xs)", hoverShadow: "var(--shadow-md)" },
  tabActive: { bg: "var(--coral-500)", text: "#ffffff" },
  tabInactive: { text: "var(--ink-500)", hoverText: "var(--ink-900)", countBg: "var(--coral-100)", countText: "var(--coral-700)" },
  searchBorder: "var(--warm-200)", searchBg: "#ffffff",
  ticket: { border: "var(--warm-200)", hoverBorder: "var(--warm-300)", shadow: "none", hoverShadow: "var(--shadow-md)" },
  columnHeader: "var(--ink-400)",
};

export default function DashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [personaFilter, setPersonaFilter] = useState<PersonaId[]>([]);
  const [personaFilterMode, setPersonaFilterMode] = useState<"reviewed-by" | "awaitring-review">("reviewed-by");
  const [showFilters, setShowFilters] = useState(false);
  const [displayCount, setDisplayCount] = useState(BATCH_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const ticketListRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => { seedData(); setTickets(getTickets()); setLoading(false); }, []);
  useEffect(() => {
    const handler = () => { setTickets(getTickets()); setDisplayCount(BATCH_SIZE); };
    window.addEventListener("tickets-changed", handler);
    return () => window.removeEventListener?.("tickets-changed", handler);
  }, []);

  useEffect(() => { const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300); return () => clearTimeout(t); }, [searchQuery]);
  useEffect(() => setDisplayCount(BATCH_SIZE), [activeFilter, priorityFilter, tagFilter, personaFilter, personaFilterMode, debouncedSearchQuery]);

  const filteredTickets = useMemo(() => {
    let r = tickets;
    if (activeFilter !== "all") r = r.filter(t => t.status === activeFilter);
    if (priorityFilter !== null) r = r.filter(t => t.priority === priorityFilter);
    if (tagFilter.length > 0) r = r.filter(t => t.tags.some(tag => tagFilter.includes(tag.id)));
    if (debouncedSearchQuery.trim()) { const q = debouncedSearchQuery.toLowerCase().trim(); r = r.filter(t => t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)); }
    if (personaFilter.length > 0) r = r.filter(t => { const h = personaFilter.some(pid => t.feedback.some(f => f.personaId === pid)); return personaFilterMode === "reviewed-by" ? h : !h; });
    return r;
  }, [tickets, activeFilter, priorityFilter, tagFilter, debouncedSearchQuery, personaFilter, personaFilterMode]);

  const statusCounts = useMemo(() => { const c: Record<string, number> = {}; for (const t of tickets) c[t.status] = (c[t.status] ?? 0) + 1; return c; }, [tickets]);

  const personaCounts = useMemo(() => {
    let s = tickets;
    if (activeFilter !== "all") s = s.filter(t => t.status === activeFilter);
    if (priorityFilter !== null) s = s.filter(t => t.priority === priorityFilter);
    if (debouncedSearchQuery.trim()) { const q = debouncedSearchQuery.toLowerCase().trim(); s = s.filter(t => t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)); }
    const c: Record<string, number> = {};
    for (const t of s) for (const f of t.feedback) c[f.personaId] = (c[f.personaId] ?? 0) + 1;
    return c;
  }, [tickets, activeFilter, priorityFilter, debouncedSearchQuery]);

  const clearAllFilters = () => { setActiveFilter("all"); setSearchQuery(""); setPriorityFilter(null); setTagFilter([]); setPersonaFilter([]); };

  const displayedTickets = useMemo(() => filteredTickets.slice(0, displayCount), [filteredTickets, displayCount]);
  const hasMore = displayCount < filteredTickets.length;
  const remaining = filteredTickets.length - displayCount;

  const { selectedIndex } = useKeyboardShortcuts({
    ticketCount: displayedTickets.length,
    ticketIds: displayedTickets.map(t => t.id),
    onOpenTicket: (id: string) => router.push(`/ticket/${id}`),
    onNewTicket: () => router.push("/new"),
    searchInputRef,
  });

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setTimeout(() => { setDisplayCount(prev => prev + BATCH_SIZE); setLoadingMore(false); }, 100);
  }, [loadingMore, hasMore]);

  useEffect(() => {
    if (displayCount <= BATCH_SIZE || !ticketListRef.current) return;
    const cards = ticketListRef.current.querySelectorAll("[data-ticket-card]");
    const prev = displayCount - BATCH_SIZE;
    if (cards.length > prev) cards[prev]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [displayCount]);

  const draftCount = statusCounts["draft"] ?? 0;
  const inReviewCount = statusCounts["in-review"] ?? 0;
  const hasActiveFilters = activeFilter !== "all" || searchQuery !== "" || priorityFilter !== null || tagFilter.length > 0 || personaFilter.length > 0;
  // Count of active *advanced* filters (priority/tags/persona) — the ones tucked
  // behind the Filters toggle.
  const advancedFilterCount =
    (priorityFilter !== null ? 1 : 0) + tagFilter.length + personaFilter.length;

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="max-w-5xl mx-auto" style={{ fontFamily: "var(--font-sans)" }}>
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--ink-900)", fontFamily: "var(--font-display)" }}>Tickets</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-500)" }}>Multiplayer stakeholder collaboration</p>
        </div>
        <Link href="/new" className="btn-primary text-xs">
          <PlusCircle size={16} /> New Ticket
        </Link>
      </div>

      {/* ── Seat occupancy: humans vs AI stand-ins ───────────── */}
      <SeatOccupancyBanner tickets={tickets} />

      {/* ── Stats row — MagicPath v2 styling ─────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Tickets", value: tickets.length, icon: Users },
          { label: "In Review", value: inReviewCount, accent: true },
          { label: "Drafts", value: draftCount, muted: true },
        ].map((stat) => (
          <div key={stat.label}
            className="rounded-xl p-5 transition-all duration-150 cursor-default"
            style={{ background: MP.statCard.bg, border: `1px solid ${MP.statCard.border}`, boxShadow: MP.statCard.shadow }}
            onMouseOver={e => { e.currentTarget.style.borderColor = MP.statCard.hoverBorder; e.currentTarget.style.boxShadow = MP.statCard.hoverShadow; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = MP.statCard.border; e.currentTarget.style.boxShadow = MP.statCard.shadow; }}
          >
            <div className="flex items-center gap-4">
              {"icon" in stat && stat.icon ? (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: MP.statCard.bg, border: `1px solid ${MP.statCard.border}` }}>
                  <stat.icon size={18} style={{ color: "var(--ink-400)" }} />
                </div>
              ) : stat.accent ? (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--coral-100)" }}>
                  <span className="text-sm font-bold" style={{ color: "var(--coral-700)" }}>{stat.value}</span>
                </div>
              ) : (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--warm-150)" }}>
                  <span className="text-sm font-bold" style={{ color: "var(--ink-500)" }}>{stat.value}</span>
                </div>
              )}
              <div>
                <div className="text-xs font-medium" style={{ color: MP.tabInactive.text }}>{stat.label}</div>
                <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--ink-900)" }}>{stat.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Clear filters ────────────────────────────────────── */}
      {hasActiveFilters && (
        <div className="mb-4 flex justify-end">
          <button onClick={clearAllFilters} className="inline-flex items-center gap-1.5 text-xs" style={{ color: MP.tabInactive.text }}>
            <X size={14} /> Clear all filters
          </button>
        </div>
      )}

      {/* ── Search bar — MagicPath v2 ─────────────────────────── */}
      <div className="mb-6">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: MP.tabInactive.text }} />
          <input ref={searchInputRef} type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tickets by title or description..."
            aria-label="Search tickets"
            className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm outline-none transition-all duration-150"
            style={{ background: MP.searchBg, border: `1px solid ${MP.searchBorder}`, color: "var(--ink-900)" }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--coral-500)"}
            onBlur={e => e.currentTarget.style.borderColor = MP.searchBorder}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors" style={{ color: MP.tabInactive.text }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Filter bar (status tabs) ─────────────────────────── */}
      <div className="flex items-center gap-1 mb-6">
        {(["all", "draft", "in-review", "consensus", "building", "done"] as const).map(tab => {
          const label = tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1).replace("-", " ");
          const active = activeFilter === tab;
          return (
            <button key={tab} onClick={() => setActiveFilter(tab)}
              className="px-3 py-1.5 text-xs font-medium cursor-pointer transition-all duration-100"
              style={{
                background: active ? MP.tabActive.bg : "transparent",
                color: active ? MP.tabActive.text : MP.tabInactive.text,
                border: active ? "none" : "1px solid transparent",
                borderRadius: 999,
                fontFamily: "var(--font-sans)",
              }}
              onMouseOver={e => { if (!active) e.currentTarget.style.color = MP.tabInactive.hoverText; }}
              onMouseOut={e => { if (!active) e.currentTarget.style.color = MP.tabInactive.text; }}
            >
              {label}
              <span className="ml-1.5 px-1 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: active ? "rgba(255,255,255,0.18)" : MP.tabInactive.countBg,
                  color: active ? "#ffffff" : MP.tabInactive.countText,
                }}
              >
                {statusCounts[tab] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Filters toggle (progressive disclosure) ──────────── */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors"
          style={{
            borderColor: advancedFilterCount > 0 ? "var(--coral-200)" : MP.searchBorder,
            background: advancedFilterCount > 0 ? "var(--coral-100)" : "transparent",
            color: advancedFilterCount > 0 ? "var(--coral-700)" : MP.tabInactive.text,
          }}
        >
          <Filter size={13} />
          Filters
          {advancedFilterCount > 0 && (
            <span
              className="px-1 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: "var(--coral-500)", color: "#fff" }}
            >
              {advancedFilterCount}
            </span>
          )}
          <ChevronDown
            size={13}
            style={{ transform: showFilters ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
          />
        </button>
        {advancedFilterCount > 0 && (
          <button
            onClick={() => {
              setPriorityFilter(null);
              setTagFilter([]);
              setPersonaFilter([]);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors"
            style={{ borderColor: MP.searchBorder, color: MP.tabInactive.text }}
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {showFilters && (
      <>
      {/* ── Priority filter ──────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5">
        <Filter size={13} style={{ color: MP.tabInactive.text }} />
        <span className="text-[11px] font-medium mr-1" style={{ color: MP.tabInactive.text }}>Priority:</span>
        <button onClick={() => setPriorityFilter(null)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${priorityFilter === null ? "bg-brand-100/50 text-brand-600 border-brand-200" : ""}`}
          style={priorityFilter !== null ? { borderColor: MP.searchBorder, color: MP.tabInactive.text } : {}}
        >All</button>
        {([0, 1, 2, 3, 4] as PriorityLevel[]).map(p => (
          <button key={p} onClick={() => setPriorityFilter(p)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors"
            style={{
              background: priorityFilter === p ? PRIORITY_COLORS[p].replace("text-", "").replace(/-/g, "") : "transparent",
              borderColor: priorityFilter === p ? "transparent" : MP.searchBorder,
              color: priorityFilter === p ? "#fff" : MP.tabInactive.text,
              fontFamily: "var(--font-sans)",
            }}
            onMouseOver={e => { if (priorityFilter !== p) e.currentTarget.style.color = MP.tabInactive.hoverText; }}
            onMouseOut={e => { if (priorityFilter !== p) e.currentTarget.style.color = MP.tabInactive.text; }}
          >{PRIORITY_LABELS[p]}</button>
        ))}
      </div>

      {/* ── Tag filter ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5">
        <Filter size={13} style={{ color: MP.tabInactive.text }} />
        <span className="text-[11px] font-medium mr-1" style={{ color: MP.tabInactive.text }}>Tags:</span>
        <button onClick={() => setTagFilter([])}
          className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors"
          style={{ borderColor: tagFilter.length === 0 ? "var(--coral-200)" : MP.searchBorder, background: tagFilter.length === 0 ? "var(--coral-100)" : "transparent", color: tagFilter.length === 0 ? "var(--coral-700)" : MP.tabInactive.text }}
        >All</button>
        {PREDEFINED_TAGS.map(tag => (
          <TagChip key={tag.id} tag={tag} mode="toggle" selected={tagFilter.includes(tag.id)}
            onToggle={id => setTagFilter(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])}
          />
        ))}
      </div>

      {/* ── Persona filter ───────────────────────────────────── */}
      {getAllPersonas().length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter size={13} style={{ color: MP.tabInactive.text }} />
          <span className="text-[11px] font-medium mr-1" style={{ color: MP.tabInactive.text }}>Persona:</span>
          <button onClick={() => setPersonaFilterMode("reviewed-by")}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors"
            style={{ borderColor: personaFilterMode === "reviewed-by" ? "var(--coral-200)" : MP.searchBorder, background: personaFilterMode === "reviewed-by" ? "var(--coral-100)" : "transparent", color: personaFilterMode === "reviewed-by" ? "var(--coral-700)" : MP.tabInactive.text }}
          >Reviewed by</button>
          <button onClick={() => setPersonaFilterMode("awaitring-review")}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors"
            style={{ borderColor: personaFilterMode === "awaitring-review" ? "var(--coral-200)" : MP.searchBorder, background: personaFilterMode === "awaitring-review" ? "var(--coral-100)" : "transparent", color: personaFilterMode === "awaitring-review" ? "var(--coral-700)" : MP.tabInactive.text }}
          >Awaiting review</button>
          <span className="w-px h-4 mx-1" style={{ background: MP.searchBorder }} />
          {getAllPersonas().map(persona => {
            const active = personaFilter.includes(persona.id);
            const count = personaCounts[persona.id] ?? 0;
            return (
              <button key={persona.id} onClick={() => setPersonaFilter(prev => prev.includes(persona.id) ? prev.filter(id => id !== persona.id) : [...prev, persona.id])}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors"
                style={{
                  background: active ? persona.color.replace("text-", "bg-").replace("bg-bg-", "bg-") || "var(--coral-100)" : "var(--warm-50)",
                  borderColor: active ? "transparent" : MP.searchBorder,
                  color: active ? "#fff" : MP.tabInactive.text,
                }}
              >
                <PersonaIcon personaId={persona.id} size={13} className="mr-1 inline-block align-text-bottom" /> {persona.label}
                {count > 0 && <span className={`ml-1 px-1 py-0.5 rounded-full text-[10px] font-bold ${active ? "bg-white/20 text-white" : ""}`} style={!active ? { background: "var(--warm-150)", color: "var(--ink-500)" } : {}}>{count}</span>}
              </button>
            );
          })}
        </div>
      )}
      </>
      )}

      {/* ── Ticket list — MagicPath v2 visual ──────────────────── */}
      <div className="space-y-3" ref={ticketListRef}>
        {filteredTickets.length === 0 ? (
          <EmptyState icon={activeFilter === "all" && !priorityFilter && !tagFilter.length && !personaFilter.length && !debouncedSearchQuery.trim() ? HelpCircle : SearchX}
            title={debouncedSearchQuery.trim() ? "No tickets match your search" : tagFilter.length > 0 ? "No tickets match these tag filters" : personaFilter.length > 0 ? personaFilterMode === "reviewed-by" ? "No tickets reviewed by selected personas" : "No tickets awaiting review by selected personas" : priorityFilter !== null ? "No tickets match this priority filter" : activeFilter === "all" ? "No tickets yet" : `No ${activeFilter} tickets`}
            description={debouncedSearchQuery.trim() ? "Try a different search term or adjust your filters." : tagFilter.length > 0 ? "Try removing some tag filters or create a new ticket with these tags." : personaFilter.length > 0 ? "Try selecting different personas or switching modes." : priorityFilter !== null ? "Try changing the filter or create a new ticket." : activeFilter === "all" ? "Create your first ticket to start the multiplayer collaboration flow." : "No tickets match this filter."}
          >
            {activeFilter === "all" && !priorityFilter && !tagFilter.length && !personaFilter.length && !debouncedSearchQuery.trim() && (
              <Link href="/new" className="btn-primary inline-flex"><PlusCircle size={18} /> Create First Ticket</Link>
            )}
          </EmptyState>
        ) : (
          <>
            {displayedTickets.map((ticket, idx) => (
              <TicketCard key={ticket.id} ticket={ticket} selected={selectedIndex === idx} />
            ))}
            {loadingMore && Array.from({ length: Math.min(BATCH_SIZE, remaining) }).map((_, i) => <SkeletonCard key={`s-${i}`} />)}
            {hasMore && !loadingMore && (
              <div className="flex justify-center pt-4 pb-2">
                <button onClick={handleLoadMore} className="btn-secondary inline-flex items-center gap-2">
                  <ChevronDown size={16} /> Load More ({remaining} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
