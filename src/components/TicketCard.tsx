import { Ticket, PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/types";
import { formatDueDate } from "@/lib/date-utils";
import { getAllPersonas } from "@/lib/personas";
import { PersonaBadge } from "./PersonaBadge";
import { TagChip } from "./TagChip";
import { CopyButton } from "@/components/CopyButton";
import { formatRelativeTime, formatAbsoluteDate } from "@/lib/timeAgo";
import { updateTicket } from "@/lib/store";
import { Clock, MessageSquare, Calendar } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";

export function TicketCard({ ticket }: { ticket: Ticket }) {
  const allPersonas = getAllPersonas();
  const progress = ticket.approvals.length / allPersonas.length;

  // --- Inline title editing state ---
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ticket.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus and select input when editing starts
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEditing = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setDraft(ticket.title);
      setEditing(true);
    },
    [ticket.title],
  );

  const saveTitle = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) {
      // Empty or whitespace-only: revert to original, no save
      setDraft(ticket.title);
      setEditing(false);
      return;
    }
    if (trimmed !== ticket.title) {
      updateTicket(ticket.id, { title: trimmed });
    }
    setEditing(false);
  }, [draft, ticket.title, ticket.id]);

  const cancelEditing = useCallback(() => {
    setDraft(ticket.title);
    setEditing(false);
  }, [ticket.title]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveTitle();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEditing();
      }
    },
    [saveTitle, cancelEditing],
  );

  return (
    <div className="relative" data-ticket-card>
      <Link
        href={`/ticket/${ticket.id}`}
        className="card block group cursor-pointer"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-500">
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
              {ticket.priority !== 4 && (
                <span
                  className={`badge border ${PRIORITY_COLORS[ticket.priority]}`}
                >
                  {PRIORITY_LABELS[ticket.priority]}
                </span>
              )}
              {ticket.tags.map((tag) => (
                <TagChip key={tag.id} tag={tag} mode="display" />
              ))}
            </div>

            {/* Inline-editable title */}
            {editing ? (
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={saveTitle}
                className="bg-deep border border-gold/40 rounded px-2 py-0.5 text-lg font-bold text-ink-primary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 w-full"
                aria-label="Edit ticket title"
              />
            ) : (
              <h3
                className="text-lg font-semibold text-ink-primary group-hover:text-brand-400 transition-colors truncate cursor-text focus:outline-none focus:ring-2 focus:ring-gold/50"
                onClick={startEditing}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    setDraft(ticket.title);
                    setEditing(true);
                  }
                }}
              >
                {ticket.title}
              </h3>
            )}

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

        {/* Due date */}
        {ticket.dueDate && (
          <div className="mt-3">
            {(() => {
              const dl = formatDueDate(ticket.dueDate);
              return (
                <span
                  className={`inline-flex items-center gap-1.5 text-xs ${
                    dl.className
                  } ${dl.isOverdue ? "bg-cardinal/10 border border-cardinal/30 rounded px-2 py-0.5" : ""}`}
                >
                  <Calendar size={12} />
                  {dl.label}
                </span>
              );
            })()}
          </div>
        )}

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
            <span
              className="flex items-center gap-1"
              title={formatAbsoluteDate(ticket.updatedAt)}
            >
              <Clock size={12} />
              {formatRelativeTime(ticket.updatedAt)}
            </span>
          </div>
        </div>
      </Link>

      {/* CopyButton positioned absolutely outside the <a> tag to avoid invalid HTML nesting */}
      <div className="absolute top-3 right-3">
        <CopyButton text={ticket.id} label={ticket.id} />
      </div>
    </div>
  );
}
