"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Ticket } from "@/lib/types";
import { seedData, getTicket, getConsensusProgress } from "@/lib/store";
import { getAllPersonas } from "@/lib/personas";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { PersonaBadge } from "@/components/PersonaBadge";
import { ArrowLeft, Clock, GitBranch } from "lucide-react";
import Link from "next/link";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTicket = () => {
    seedData();
    const t = getTicket(params.id as string);
    setTicket(t || null);
    setLoading(false);
  };

  useEffect(() => {
    loadTicket();
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-800 rounded w-1/3" />
        <div className="h-4 bg-gray-800 rounded w-2/3" />
        <div className="h-64 bg-gray-800 rounded" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <h3 className="text-lg font-medium text-gray-400 mb-2">
          Ticket not found
        </h3>
        <Link href="/" className="btn-secondary inline-flex mt-4">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const consensus = getConsensusProgress(ticket.id);
  const allPersonas = getAllPersonas();
  const progress = consensus.approved / consensus.total;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </Link>

      {/* Ticket header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono text-gray-500">
                {ticket.id}
              </span>
              <span
                className={`badge ${
                  ticket.status === "draft"
                    ? "bg-gray-800 text-gray-400"
                    : ticket.status === "in-review"
                    ? "bg-yellow-900/50 text-yellow-400"
                    : ticket.status === "consensus"
                    ? "bg-emerald-900/50 text-emerald-400"
                    : "bg-blue-900/50 text-blue-400"
                }`}
              >
                {ticket.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">
              {ticket.title}
            </h1>
            <p className="text-gray-400 leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </p>
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                Created {new Date(ticket.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <GitBranch size={12} />
                Updated {new Date(ticket.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Consensus bar */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-300">
            Consensus Progress
          </h3>
          <span className="text-sm text-gray-400">
            {consensus.approved}/{consensus.total} approved
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-700"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-3 mt-3">
          {allPersonas.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1.5"
            >
              <PersonaBadge
                personaId={p.id}
                approved={ticket.approvals.includes(p.id)}
              />
            </div>
          ))}
          {consensus.remaining.length === 0 && (
            <span className="badge bg-emerald-900/50 text-emerald-400 ml-auto">
              🎉 Consensus Reached
            </span>
          )}
        </div>
      </div>

      {/* Feedback panel */}
      <FeedbackPanel
        ticket={ticket}
        onFeedbackAdded={() => loadTicket()}
      />
    </div>
  );
}
