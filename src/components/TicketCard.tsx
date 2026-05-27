import { Ticket } from "@/lib/types";
import { getAllPersonas } from "@/lib/personas";
import { PersonaBadge } from "./PersonaBadge";
import { Clock, MessageSquare } from "lucide-react";
import Link from "next/link";

function timeAgo(isoString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(isoString).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function TicketCard({ ticket }: { ticket: Ticket }) {
  const allPersonas = getAllPersonas();
  const progress = ticket.approvals.length / allPersonas.length;

  return (
    <Link href={`/ticket/${ticket.id}`} className="card block group cursor-pointer">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-500">{ticket.id}</span>
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
          <h3 className="text-lg font-semibold text-gray-100 group-hover:text-brand-400 transition-colors truncate">
            {ticket.title}
          </h3>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
            {ticket.description}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500">Consensus</span>
          <span className="text-xs text-gray-400">
            {ticket.approvals.length}/{allPersonas.length}
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Personas row */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex -space-x-1">
          {allPersonas.map((p) => (
            <div key={p.id} className="ring-2 ring-gray-900 rounded-full">
              <PersonaBadge
                personaId={p.id}
                approved={ticket.approvals.includes(p.id)}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MessageSquare size={12} />
            {ticket.feedback.length}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {timeAgo(ticket.updatedAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
