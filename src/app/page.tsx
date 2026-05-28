"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Ticket, TicketStatus, PersonaId, PRIORITY_LABELS, PRIORITY_COLORS, PriorityLevel, PREDEFINED_TAGS } from "@/lib/types";
import { seedData, getTickets } from "@/lib/store";
import { getAllPersonas } from "@/lib/personas";
import { TicketCard } from "@/components/TicketCard";
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

export default function DashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [personaFilter, setPersonaFilter] = useState<PersonaId[]>([]);
  const [personaFilterMode, setPersonaFilterMode] = useState<"reviewed-by" | "awaiting-review">("reviewed-by");
  const [displayCount, setDisplayCount] = useState(BATCH_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const ticketListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    seedData();
    setTickets(getTickets());
    setLoading(false);
  }, []);

  // Listen for store-driven ticket changes (e.g. inline title edit dispatches "tickets-changed")
  useEffect(() => {
    const handler = () => {
      setTickets(getTickets());
      setDisplayCount(BATCH_SIZE);
    };
    window.addEventListener("tickets-changed", handler);
    return () => window.removeEventListener?.("tickets-changed", handler);
  }, []);

  // Reset display count when filters change (AC7)
  useEffect(() => {
    setDisplayCount(BATCH_SIZE);
  }, [activeFilter, priorityFilter, tagFilter, personaFilter, personaFilterMode, debouncedSearchQuery]);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (activeFilter !== "all") {
      result = result.filter((t) => t.status === activeFilter);
    }
    if (priorityFilter !== null) {
      result = result.filter((t) => t.priority === priorityFilter);
    }
    if (tagFilter.length > 0) {
      result = result.filter((t) =>
        t.tags.some((tag) => tagFilter.includes(tag.id))
      );
    }
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q)
      );
    }
    if (personaFilter.length > 0) {
      result = result.filter((t) => {
        const hasFeedback = personaFilter.some((pid) =>
          t.feedback.some((f) => f.personaId === pid)
        );
        return personaFilterMode === "reviewed-by" ? hasFeedback : !hasFeedback;
      });
    }
    return result;
  }, [tickets, activeFilter, priorityFilter, tagFilter, debouncedSearchQuery, personaFilter, personaFilterMode]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tickets) {
      counts[t.status] = (counts[t.status] ?? 0) + 1;
    }
    return counts;
  }, [tickets]);

  const draftCount = statusCounts["draft"] ?? 0;
  const inReviewCount = statusCounts["in-review"] ?? 0;

  const personaCounts = useMemo(() => {
    // Count feedback from each persona, scoped to the tickets that pass
    // all other active filters (status, priority, search).
    let scoped = tickets;
    if (activeFilter !== "all") {
      scoped = scoped.filter((t) => t.status === activeFilter);
    }
    if (priorityFilter !== null) {
      scoped = scoped.filter((t) => t.priority === priorityFilter);
    }
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase().trim();
      scoped = scoped.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q)
      );
    }
    const counts: Record<string, number> = {};
    for (const t of scoped) {
      for (const f of t.feedback) {
        counts[f.personaId] = (counts[f.personaId] ?? 0) + 1;
      }
    }
    return counts;
  }, [tickets, activeFilter, priorityFilter, debouncedSearchQuery]);

  const hasActiveFilters = useMemo(() => {
    return (
      activeFilter !== "all" ||
      searchQuery !== "" ||
      priorityFilter !== null ||
      tagFilter.length > 0 ||
      personaFilter.length > 0
    );
  }, [activeFilter, searchQuery, priorityFilter, tagFilter, personaFilter]);

  const clearAllFilters = () => {
    setActiveFilter("all");
    setSearchQuery("");
    setPriorityFilter(null);
    setTagFilter([]);
    setPersonaFilter([]);
    // TODO: Reset sort when sort controls are added
  };

  // --- Pagination (DEV-58) ---
  const displayedTickets = useMemo(
    () => filteredTickets.slice(0, displayCount),
    [filteredTickets, displayCount]
  );
  const hasMore = displayCount < filteredTickets.length;
  const remaining = filteredTickets.length - displayCount;

  // ── Keyboard shortcut refs ────────────────────────────────────────────
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Keyboard shortcuts for power-user navigation (DEV-78) ─────────────
  const { selectedIndex } = useKeyboardShortcuts({
    ticketCount: displayedTickets.length,
    ticketIds: displayedTickets.map((t) => t.id),
    onOpenTicket: (id: string) => router.push(`/ticket/${id}`),
    onNewTicket: () => router.push("/new"),
    searchInputRef,
  });

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    // Brief delay to show skeleton cards (AC5)
    setTimeout(() => {
      setDisplayCount((prev) => prev + BATCH_SIZE);
      setLoadingMore(false);
    }, 100);
  }, [loadingMore, hasMore]);

  // Smooth scroll to top of newly loaded batch after cards render (AC6)
  useEffect(() => {
    if (displayCount <= BATCH_SIZE || !ticketListRef.current) return;
    const cards = ticketListRef.current.querySelectorAll("[data-ticket-card]");
    const prevCount = displayCount - BATCH_SIZE;
    if (cards.length > prevCount) {
      cards[prevCount]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [displayCount]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-ink-primary">Tickets</h2>
          <p className="text-sm text-ink-muted mt-1">
            Multiplayer stakeholder collaboration
          </p>
        </div>
        <Link href="/new" className="btn-primary">
          <PlusCircle size={18} />
          New Ticket
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center">
            <Users size={20} className="text-ink-muted" />
          </div>
          <div>
            <p className="text-2xl font-bold text-ink-primary">{tickets.length}</p>
            <p className="text-xs text-ink-secondary">Total Tickets</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-yellow-900/30 flex items-center justify-center">
            <span className="text-yellow-400 font-bold text-lg">
              {inReviewCount}
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-ink-primary">{inReviewCount}</p>
            <p className="text-xs text-ink-secondary">In Review</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center">
            <span className="text-ink-muted font-bold text-lg">
              {draftCount}
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-ink-primary">{draftCount}</p>
            <p className="text-xs text-ink-secondary">Drafts</p>
          </div>
        </div>
      </div>

      {/* Clear all filters */}
      {hasActiveFilters && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={clearAllFilters}
            aria-label="Clear all filters"
            className="btn-ghost inline-flex items-center gap-1.5 text-xs"
          >
            <X size={14} />
            Clear all filters
          </button>
        </div>
      )}

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by title or description..."
            aria-label="Search tickets"
            className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm bg-elevated border border-border-visible/30 text-ink-primary placeholder:text-ink-muted/60 outline-none transition-all duration-150 focus:border-gold/50 focus:ring-1 focus:ring-gold/30 focus:bg-elevated/80"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary transition-colors p-0.5 rounded"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={statusCounts}
      />

      {/* Priority filter */}
      <div className="flex items-center gap-2 mb-6">
        <Filter size={14} className="text-ink-muted" />
        <span className="text-xs text-ink-muted mr-1">Priority:</span>
        <button
          onClick={() => setPriorityFilter(null)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
            priorityFilter === null
              ? "bg-brand-900/50 text-brand-400 border-brand-800"
              : "border-border-subtle text-ink-muted hover:text-ink-primary hover:border-border-default"
          }`}
        >
          All
        </button>
        {([0, 1, 2, 3, 4] as PriorityLevel[]).map((p) => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              priorityFilter === p
                ? PRIORITY_COLORS[p]
                : "border-border-subtle text-ink-muted hover:text-ink-primary hover:border-border-default"
            }`}
          >
            {PRIORITY_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Tag filter */}
      <div className="flex items-center gap-2 mb-6">
        <Filter size={14} className="text-ink-muted" />
        <span className="text-xs text-ink-muted mr-1">Tags:</span>
        <button
          onClick={() => setTagFilter([])}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
            tagFilter.length === 0
              ? "bg-brand-900/50 text-brand-400 border-brand-800"
              : "border-border-subtle text-ink-muted hover:text-ink-primary hover:border-border-default"
          }`}
        >
          All
        </button>
        {PREDEFINED_TAGS.map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            mode="toggle"
            selected={tagFilter.includes(tag.id)}
            onToggle={(id) =>
              setTagFilter((prev) =>
                prev.includes(id)
                  ? prev.filter((t) => t !== id)
                  : [...prev, id]
              )
            }
          />
        ))}
      </div>

      {/* Persona filter */}
      {getAllPersonas().length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter size={14} className="text-ink-muted" />
          <span className="text-xs text-ink-muted mr-1">Persona:</span>
          {/* Mode toggles */}
          <button
            onClick={() => setPersonaFilterMode("reviewed-by")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              personaFilterMode === "reviewed-by"
                ? "bg-brand-900/50 text-brand-400 border-brand-800"
                : "border-border-subtle text-ink-muted hover:text-ink-primary"
            }`}
          >
            Reviewed by
          </button>
          <button
            onClick={() => setPersonaFilterMode("awaiting-review")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              personaFilterMode === "awaiting-review"
                ? "bg-brand-900/50 text-brand-400 border-brand-800"
                : "border-border-subtle text-ink-muted hover:text-ink-primary"
            }`}
          >
            Awaiting review
          </button>
          <span className="w-px h-5 bg-border-visible/30 mx-0.5" />
          {/* Persona buttons */}
          {getAllPersonas().map((persona) => {
            const isActive = personaFilter.includes(persona.id);
            const count = personaCounts[persona.id] ?? 0;
            return (
              <button
                key={persona.id}
                onClick={() =>
                  setPersonaFilter((prev) =>
                    prev.includes(persona.id)
                      ? prev.filter((id) => id !== persona.id)
                      : [...prev, persona.id]
                  )
                }
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  isActive
                    ? `${persona.color} text-white border-transparent`
                    : "bg-elevated border border-border-visible/30 text-ink-muted"
                }`}
              >
                <PersonaIcon personaId={persona.id} size={14} className="mr-1 inline-block align-text-bottom" /> {persona.label}
                {count > 0 && (
                  <span
                    className={`ml-1 px-1 py-0.5 rounded text-[10px] font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-elevated/60 text-ink-muted"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Ticket list */}
      <div className="space-y-4" ref={ticketListRef}>
        {filteredTickets.length === 0 ? (
          <EmptyState
            icon={
              activeFilter === "all" && priorityFilter === null && tagFilter.length === 0 && personaFilter.length === 0 && !debouncedSearchQuery.trim()
                ? HelpCircle
                : SearchX
            }
            title={
              debouncedSearchQuery.trim()
                ? "No tickets match your search"
                : tagFilter.length > 0
                ? "No tickets match these tag filters"
                : personaFilter.length > 0
                ? personaFilterMode === "reviewed-by"
                  ? "No tickets reviewed by selected personas"
                  : "No tickets awaiting review by selected personas"
                : priorityFilter !== null
                ? "No tickets match this priority filter"
                : activeFilter === "all"
                ? "No tickets yet"
                : `No ${activeFilter} tickets`
            }
            description={
              debouncedSearchQuery.trim()
                ? "Try a different search term or adjust your filters."
                : tagFilter.length > 0
                ? "Try removing some tag filters or create a new ticket with these tags."
                : personaFilter.length > 0
                ? "Try selecting different personas or switching modes."
                : priorityFilter !== null
                ? "Try changing the filter or create a new ticket."
                : activeFilter === "all"
                ? "Create your first ticket to start the multiplayer collaboration flow."
                : "No tickets match this filter."
            }
          >
            {activeFilter === "all" && priorityFilter === null && tagFilter.length === 0 && personaFilter.length === 0 && !debouncedSearchQuery.trim() && (
              <Link href="/new" className="btn-primary inline-flex">
                <PlusCircle size={18} />
                Create First Ticket
              </Link>
            )}
          </EmptyState>
        ) : (
          <>
            {displayedTickets.map((ticket, idx) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                selected={selectedIndex === idx}
              />
            ))}

            {/* Skeleton cards while loading more (AC5) */}
            {loadingMore &&
              Array.from({ length: Math.min(BATCH_SIZE, remaining) }).map((_, i) => (
                <SkeletonCard key={`skeleton-${i}`} />
              ))}

            {/* Load More button (AC2, AC4) */}
            {hasMore && !loadingMore && (
              <div className="flex justify-center pt-4 pb-2">
                <button
                  onClick={handleLoadMore}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <ChevronDown size={16} />
                  Load More ({remaining} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
