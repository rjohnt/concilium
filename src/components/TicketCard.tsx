import { Ticket, PRIORITY_LABELS, PRIORITY_COLORS, TicketStatus } from "@/lib/types";
import { formatDueDate } from "@/lib/date-utils";
import { getAllPersonas } from "@/lib/personas";
import { PersonaBadge } from "./PersonaBadge";
import { PersonaIcon } from "./PersonaIcon";
import { TagChip } from "./TagChip";
import { CopyButton } from "@/components/CopyButton";
import { formatRelativeTime, formatAbsoluteDate } from "@/lib/timeAgo";
import { updateTicket } from "@/lib/store";
import { Clock, MessageSquare, Calendar } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";

const SHOW_CONSENSUS_DOTS: TicketStatus[] = ["in-review", "consensus"];

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; dot: string; bg: string; border: string }> = {
  draft:        { label: "Draft",     color: "#7a7468", dot: "#7a7468", bg: "rgba(122,116,104,0.08)", border: "rgba(122,116,104,0.2)" },
  "in-review":  { label: "Review",    color: "#c9a84c", dot: "#c9a84c", bg: "rgba(201,168,76,0.08)",  border: "rgba(201,168,76,0.2)" },
  consensus:    { label: "Consensus", color: "#6b8f5e", dot: "#6b8f5e", bg: "rgba(107,143,94,0.08)", border: "rgba(107,143,94,0.2)" },
  building:     { label: "Building",  color: "#6b8fa8", dot: "#6b8fa8", bg: "rgba(107,143,168,0.08)", border: "rgba(107,143,168,0.2)" },
  done:         { label: "Done",      color: "#6b8f5e", dot: "#6b8f5e", bg: "rgba(107,143,94,0.08)", border: "rgba(107,143,94,0.2)" },
};

export function TicketCard({
  ticket,
  selected = false,
}: {
  ticket: Ticket;
  selected?: boolean;
}) {
  const allPersonas = getAllPersonas();
  const progress = ticket.approvals.length / allPersonas.length;

  // --- Inline title editing state ---
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ticket.title);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const sc = STATUS_CONFIG[ticket.status];

  return (
    <div className="relative" data-ticket-card>
      <Link
        href={`/ticket/${ticket.id}`}
        className={`block rounded-xl p-5 transition-all duration-200 border group cursor-pointer ${
          selected
            ? "ring-2 ring-gold/70 border-gold/40"
            : "border-transparent hover:border-border-visible"
        }`}
        style={{
          background: selected ? "var(--color-raised)" : "var(--color-raised)",
          boxShadow: selected ? "0 4px 12px rgba(201,168,76,0.1)" : "none",
        }}
        onMouseEnter={(e) => {
          if (!selected) {
            e.currentTarget.style.background = "var(--color-elevated)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
          }
        }}
        onMouseLeave={(e) => {
          if (!selected) {
            e.currentTarget.style.background = "var(--color-raised)";
            e.currentTarget.style.boxShadow = "none";
          }
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-medium text-ink-muted tracking-tight">
                {ticket.id}
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium leading-relaxed"
                style={{
                  background: `${sc.bg}`,
                  color: sc.color,
                  border: `1px solid ${sc.border}`,
                }}
              >
                <span
                  className="w-[5px] h-[5px] rounded-full shrink-0"
                  style={{ background: sc.dot }}
                />
                {sc.label}
              </span>
              {ticket.priority !== 4 && (
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium"
                  style={{
                    background: `${(() => {
                      const bgColors = ["rgba(184,69,69,0.08)", "rgba(201,168,76,0.08)", "rgba(107,143,168,0.08)", "rgba(122,116,104,0.08)"];
                      return bgColors[ticket.priority] || bgColors[3];
                    })()}`,
                    color: PRIORITY_COLORS[ticket.priority],
                    border: `1px solid ${(() => {
                      const borderColors = ["rgba(184,69,69,0.2)", "rgba(201,168,76,0.2)", "rgba(107,143,168,0.2)", "rgba(122,116,104,0.2)"];
                      return borderColors[ticket.priority] || borderColors[3];
                    })()}`,
                  }}
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
                className="bg-deep border border-gold/40 rounded-md px-2 py-1 text-sm font-semibold text-ink-primary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 w-full"
                aria-label="Edit ticket title"
              />
            ) : (
              <h3
                className="text-sm font-semibold text-ink-primary group-hover:text-brand-400 transition-colors truncate cursor-text focus:outline-none focus:ring-2 focus:ring-gold/50 rounded"
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

            <p className="text-xs text-ink-muted mt-1.5 line-clamp-2 leading-relaxed">
              {ticket.description}
            </p>
          </div>
        </div>

        {/* Progress bar — hidden for in-review and consensus */}
        {!SHOW_CONSENSUS_DOTS.includes(ticket.status) && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-ink-muted font-medium">Consensus</span>
              <span className="text-[11px] text-ink-muted">
                {ticket.approvals.length}/{allPersonas.length}
              </span>
            </div>
            <div className="h-1.5 bg-deep rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress * 100}%`,
                  background: "var(--color-gold)",
                }}
              />
            </div>
          </div>
        )}

        {/* Consensus dots */}
        {SHOW_CONSENSUS_DOTS.includes(ticket.status) && (
          <div
            className="mt-3 flex items-center gap-2"
            title={`${ticket.approvals.length} of ${allPersonas.length} approved`}
            aria-label={`Consensus: ${ticket.approvals.length} of ${allPersonas.length} approved`}
            data-testid="consensus-dots"
          >
            <span className="text-[11px] text-ink-muted font-medium">Consensus</span>
            <div className="flex items-center gap-1">
              {allPersonas.map((p) => {
                const isApproved = ticket.approvals.includes(p.id);
                return (
                  <PersonaIcon
                    key={p.id}
                    personaId={p.id}
                    size={13}
                    className={isApproved ? "text-olive" : "text-ink-muted"}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Due date */}
        {ticket.dueDate && (
          <div className="mt-3">
            {(() => {
              const dl = formatDueDate(ticket.dueDate);
              return (
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] ${
                    dl.className
                  } ${dl.isOverdue ? "bg-cardinal/10 border border-cardinal/30 rounded-md px-2 py-0.5" : ""}`}
                >
                  <Calendar size={11} />
                  {dl.label}
                </span>
              );
            })()}
          </div>
        )}

        {/* Personas row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
          <div className="flex -space-x-1">
            {allPersonas.map((p) => (
              <div key={p.id} className="ring-2 ring-deep rounded-full">
                <PersonaBadge
                  personaId={p.id}
                  approved={ticket.approvals.includes(p.id)}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-ink-muted">
            <span className="flex items-center gap-1">
              <MessageSquare size={11} />
              {ticket.feedback.length}
            </span>
            <span
              className="flex items-center gap-1"
              title={formatAbsoluteDate(ticket.updatedAt)}
            >
              <Clock size={11} />
              {formatRelativeTime(ticket.updatedAt)}
            </span>
          </div>
        </div>
      </Link>

      <div className="absolute top-3 right-3">
        <CopyButton text={ticket.id} label={ticket.id} />
      </div>
    </div>
  );
}
