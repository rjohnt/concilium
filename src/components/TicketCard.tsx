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

// ── MagicPath v2 authoritative config ──────────────────────────────
type MPStatus = "draft" | "in-review" | "consensus" | "building" | "done";

const STATUS_CONFIG: Record<MPStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:       { label: "Draft",     color: "var(--ink-500)", bg: "var(--warm-150)", border: "var(--warm-300)" },
  "in-review": { label: "Review",    color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" },
  consensus:   { label: "Consensus", color: "#059669", bg: "#ECFDF5", border: "#6EE7B7" },
  building:    { label: "Building",  color: "#2563EB", bg: "#EFF6FF", border: "#93C5FD" },
  done:        { label: "Done",      color: "#059669", bg: "#ECFDF5", border: "#6EE7B7" },
};

const PRIORITY_CONFIG: Record<number, { color: string; bg: string; border: string }> = {
  0: { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  1: { color: "#EA580C", bg: "#FFF7ED", border: "#FDBA74" },
  2: { color: "#2563EB", bg: "#EFF6FF", border: "#93C5FD" },
  3: { color: "var(--ink-500)", bg: "var(--warm-150)", border: "var(--warm-300)" },
  4: { color: "var(--ink-400)", bg: "var(--warm-50)", border: "var(--warm-200)" },
};

const ASSIGNEE_COLORS = ["#2563EB", "#7C3AED", "#0891B2", "#059669", "#DC2626"];

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
        className={`block rounded-xl p-5 transition-all duration-200 border group cursor-pointer ${
          selected ? "ring-2 ring-brand-500/70 border-brand-300" : "border-border-subtle hover:border-[var(--warm-300)]"
        }`}
        style={{
          background: isHovered && !selected ? "var(--color-elevated)" : "var(--color-raised)",
          boxShadow: selected
            ? "var(--shadow-md)"
            : isHovered
              ? "var(--shadow-md)"
              : "var(--shadow-xs)",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Row 1: ID + Badges */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: "var(--ink-400)" }}>
            {ticket.id}
          </span>
          {/* Status badge — exact MagicPath v2 styling */}
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold leading-relaxed"
            style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, letterSpacing: "-0.01em" }}
          >
            <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: sc.color }} />
            {sc.label}
          </span>
          {/* Priority badge — exact MagicPath v2 styling */}
          {ticket.priority !== 4 && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold"
              style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, letterSpacing: "-0.01em" }}
            >
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
              <span className={`inline-flex items-center gap-1 text-[11px] ${dl.className} ${dl.isOverdue ? "bg-[#FEF2F2] border border-[#FECACA] rounded-md px-2 py-0.5" : ""}`}>
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
