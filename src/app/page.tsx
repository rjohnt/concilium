"use client";

import { useEffect, useState, useMemo } from "react";
import { Ticket, TicketStatus } from "@/lib/types";
import { seedData, getTickets } from "@/lib/store";
import { TicketCard } from "@/components/TicketCard";
import { FilterBar } from "@/components/FilterBar";
import { DashboardSkeleton } from "@/components/Skeleton";
import { PlusCircle, Users } from "lucide-react";
import Link from "next/link";

type FilterKey = "all" | TicketStatus;

export default function DashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  useEffect(() => {
    seedData();
    setTickets(getTickets());
    setLoading(false);
  }, []);

  const filteredTickets = useMemo(() => {
    if (activeFilter === "all") return tickets;
    return tickets.filter((t) => t.status === activeFilter);
  }, [tickets, activeFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tickets) {
      counts[t.status] = (counts[t.status] ?? 0) + 1;
    }
    return counts;
  }, [tickets]);

  const draftCount = statusCounts["draft"] ?? 0;
  const inReviewCount = statusCounts["in-review"] ?? 0;

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

      {/* Filter bar */}
      <FilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={statusCounts}
      />

      {/* Ticket list */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="card text-center py-16">
            <h3 className="text-lg font-medium text-ink-muted mb-2">
              {activeFilter === "all"
                ? "No tickets yet"
                : `No ${activeFilter} tickets`}
            </h3>
            <p className="text-sm text-ink-secondary mb-4">
              {activeFilter === "all"
                ? "Create your first ticket to start the multiplayer collaboration flow."
                : "No tickets match this filter."}
            </p>
            {activeFilter === "all" && (
              <Link href="/new" className="btn-primary inline-flex">
                <PlusCircle size={18} />
                Create First Ticket
              </Link>
            )}
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))
        )}
      </div>
    </div>
  );
}
