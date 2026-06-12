"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Ticket, PRIORITY_LABELS, TicketStatus } from "@/lib/types";
import { formatDueDate } from "@/lib/date-utils";
import { getAllPersonas } from "@/lib/personas";
import { PersonaBadge } from "./PersonaBadge";
import { PersonaIcon } from "./PersonaIcon";
import { TagChip } from "./TagChip";
import { CopyButton } from "@/components/CopyButton";
import { formatRelativeTime, formatAbsoluteDate } from "@/lib/timeAgo";
import { updateTicket } from "@/lib/store";
import { Clock, MessageSquare, Calendar } from "lucide-react";

// ── Concilium DS badge tones (components/core/Badge.jsx) ───────────
type MPStatus = "draft" | "in-review" | "consensus" | "building" | "done";

const STATUS_CONFIG: Record<MPStatus, { label: string; color: string; bg: string }> = {
  draft:       { label: "Draft",     color: "var(--ink-700)", bg: "var(--warm-150)" },
  "in-review": { label: "Review",    color: "#8A5A12", bg: "var(--warning-100)" },
  consensus:   { label: "Consensus", color: "#1B6B4A", bg: "var(--success-100)" },
  building:    { label: "Building",  color: "#185FA5", bg: "var(--info-100)" },
  done:        { label: "Done",      color: "#1B6B4A", bg: "var(--success-100)" },
};

const PRIORITY_CONFIG: Record<number, { color: string; bg: string }> = {
  0: { color: "color-mix(in oklab, var(--danger-500) 82%, black)", bg: "var(--danger-100)" },
  1: { color: "var(--coral-700)", bg: "var(--coral-100)" },
  2: { color: "#185FA5", bg: "var(--info-100)" },
  3: { color: "var(--ink-700)", bg: "var(--warm-150)" },
  4: { color: "var(--ink-400)", bg: "var(--warm-100)" },
};

// DS Avatar hash palette (components/core/Avatar.jsx)
const ASSIGNEE_COLORS = ["#E85D34", "#7A57D1", "#1E9C86", "#2F82C7", "#D9962A", "#C8557F"];

const SHOW_CONSENSUS_DOTS: MPStatus[] = ["in-review", "consensus"];

// ── Component ──────────────────────────────────────────────────────
export function TicketCard({
  ticket,
  selected = false,
}: {
  ticket: Ticket;
  selected?: boolean;
}) {
  const allPersonas = getAllPersonas();
  const progress = ticket.approvals.length / allPersonas.length;
  const sc = STATUS_CONFIG[ticket.status as MPStatus] ?? STATUS_CONFIG.draft;
  const pc = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG[3];
  const avatarColor = ASSIGNEE_COLORS[ticket.id.charCodeAt(0) % ASSIGNEE_COLORS.length];

  // Inline editing
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ticket.title);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setDraft(ticket.title); setEditing(true);
  }, [ticket.title]);

  const saveTitle = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) { setDraft(ticket.title); setEditing(false); return; }
    if (trimmed !== ticket.title) updateTicket(ticket.id, { title: trimmed });
    setEditing(false);
  }, [draft, ticket.title, ticket.id]);

  const cancelEditing = useCallback(() => { setDraft(ticket.title); setEditing(false); }, [ticket.title]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); saveTitle(); }
    else if (e.key === "Escape") { e.preventDefault(); cancelEditing(); }
  }, [saveTitle, cancelEditing]);

  return (
    <div className="relative" data-ticket-card>
      <Link
        href={`/ticket/${ticket.id}`}
        className={`block rounded-lg p-5 transition-all duration-200 border group cursor-pointer ${
          selected ? "ring-2 ring-brand-500/70 border-brand-300" : "border-border-subtle hover:border-[var(--warm-300)]"
        }`}
        style={{
          background: "var(--surface-card)",
          boxShadow: selected
            ? "var(--shadow-md)"
            : isHovered
              ? "var(--shadow-lg)"
              : "var(--shadow-sm)",
          transform: isHovered && !selected ? "translateY(-2px)" : "none",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Row 1: ID + Badges */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: "var(--ink-400)" }}>
            {ticket.id}
          </span>
          {/* Status badge — DS cc-badge pill */}
          <span className="cc-badge" style={{ background: sc.bg, color: sc.color, fontSize: 11.5 }}>
            <span className="cc-badge__dot" />
            {sc.label}
          </span>
          {/* Priority badge — DS cc-badge pill */}
          {ticket.priority !== 4 && (
            <span className="cc-badge" style={{ background: pc.bg, color: pc.color, fontSize: 11.5 }}>
              {PRIORITY_LABELS[ticket.priority]}
            </span>
          )}
          {ticket.tags.map((tag) => (
            <TagChip key={tag.id} tag={tag} mode="display" />
          ))}
        </div>

        {/* Title — inline editable */}
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveTitle}
            className="w-full bg-deep border border-brand-300/40 rounded-md px-2 py-1 text-sm font-semibold text-ink-primary focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30"
            aria-label="Edit ticket title"
          />
        ) : (
          <h3
            className="text-sm font-semibold tracking-[-0.01em] text-[var(--ink-900)] group-hover:text-brand-600 transition-colors truncate cursor-text focus:outline-none focus:ring-2 focus:ring-brand-500/50 rounded"
            onClick={startEditing}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setDraft(ticket.title); setEditing(true); }
            }}
          >
            {ticket.title}
          </h3>
        )}

        {/* Description */}
        {ticket.description && (
          <p className="text-xs mt-1.5 leading-relaxed line-clamp-2" style={{ color: "var(--ink-500)" }}>
            {ticket.description}
          </p>
        )}

        {/* Progress bar or consensus dots */}
        {!SHOW_CONSENSUS_DOTS.includes(ticket.status as MPStatus) && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium" style={{ color: "var(--ink-400)" }}>Consensus</span>
              <span className="text-[11px]" style={{ color: "var(--ink-400)" }}>{ticket.approvals.length}/{allPersonas.length}</span>
            </div>
            <div data-testid="consensus-progress" className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--warm-200)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress * 100}%`, background: "var(--coral-500)" }} />
            </div>
          </div>
        )}

        {SHOW_CONSENSUS_DOTS.includes(ticket.status as MPStatus) && (
          <div
            data-testid="consensus-dots"
            className="mt-2.5 flex items-center gap-2"
            title={`${ticket.approvals.length} of ${allPersonas.length} approved`}
            aria-label={`Consensus: ${ticket.approvals.length} of ${allPersonas.length} approved`}
          >
            <span className="text-[11px] font-medium" style={{ color: "var(--ink-400)" }}>Consensus</span>
            <div className="flex items-center gap-1.5">
              {allPersonas.map((p) => {
                const approved = ticket.approvals.includes(p.id);
                return (
                  <span
                    key={p.id}
                    title={`${p.label} — ${approved ? "approved" : "awaiting"}`}
                    className="inline-flex items-center justify-center rounded-full"
                    style={{
                      width: 22,
                      height: 22,
                      background: approved ? "var(--success-100)" : "var(--warm-100)",
                      border: `1px solid ${approved ? "var(--success-500)" : "var(--warm-200)"}`,
                    }}
                  >
                    <PersonaIcon
                      personaId={p.id}
                      size={14}
                      className={approved ? "text-olive" : "text-ink-muted"}
                    />
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Due date */}
        {ticket.dueDate && (() => {
          const dl = formatDueDate(ticket.dueDate);
          return (
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 text-[11px] ${dl.className} ${dl.isOverdue ? "bg-[var(--danger-100)] rounded-pill px-2 py-0.5" : ""}`}>
                <Calendar size={11} />
                {dl.label}
              </span>
            </div>
          );
        })()}

        {/* Bottom row: personas + metadata */}
        <div className="mt-3 flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderTop: "1px solid var(--warm-200)" }}>
          <div className="flex flex-wrap items-center gap-1.5" data-testid="ticket-persona-badges">
            {allPersonas.map((p) => (
              <div key={p.id} className="shrink-0">
                <PersonaBadge personaId={p.id} approved={ticket.approvals.includes(p.id)} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--ink-400)" }}>
            <span className="flex items-center gap-1">
              <MessageSquare size={11} />
              {ticket.feedback.length}
            </span>
            <span className="flex items-center gap-1" title={formatAbsoluteDate(ticket.updatedAt)}>
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
