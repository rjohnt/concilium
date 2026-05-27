"use client";

import { useEffect, useState } from "react";
import { Ticket } from "@/lib/types";
import { seedData, getTickets } from "@/lib/store";
import { TicketCard } from "@/components/TicketCard";
import { DashboardSkeleton } from "@/components/Skeleton";
import { PlusCircle, Users } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    seedData();
    setTickets(getTickets());
    setLoading(false);
  }, []);

  const draftCount = tickets.filter((t) => t.status === "draft").length;
  const inReviewCount = tickets.filter((t) => t.status === "in-review").length;

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Tickets</h2>
          <p className="text-sm text-gray-400 mt-1">
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
          <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
            <Users size={20} className="text-gray-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{tickets.length}</p>
            <p className="text-xs text-gray-500">Total Tickets</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-yellow-900/30 flex items-center justify-center">
            <span className="text-yellow-400 font-bold text-lg">
              {inReviewCount}
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{inReviewCount}</p>
            <p className="text-xs text-gray-500">In Review</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
            <span className="text-gray-400 font-bold text-lg">
              {draftCount}
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{draftCount}</p>
            <p className="text-xs text-gray-500">Drafts</p>
          </div>
        </div>
      </div>

      {/* Ticket list */}
      <div className="space-y-4">
        {tickets.length === 0 ? (
          <div className="card text-center py-16">
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              No tickets yet
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Create your first ticket to start the multiplayer collaboration
              flow.
            </p>
            <Link href="/new" className="btn-primary inline-flex">
              <PlusCircle size={18} />
              Create First Ticket
            </Link>
          </div>
        ) : (
          tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))
        )}
      </div>
    </div>
  );
}
