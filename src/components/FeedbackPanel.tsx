"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { PersonaId, Ticket } from "@/lib/types";
import { getPersona, getAllPersonas } from "@/lib/personas";
import { getFeedbackHistory } from "@/lib/store";
import { formatRelativeTime, formatAbsoluteDate } from "@/lib/timeAgo";
import { PersonaBadge } from "./PersonaBadge";
import { PersonaIcon } from "./PersonaIcon";
import { EmptyState } from "./EmptyState";
import { MarkdownPreview } from "./MarkdownPreview";
import { MessageSquare, CheckCircle, ThumbsUp, RefreshCw, GitBranch } from "lucide-react";
import { VersionHistory } from "./VersionHistory";
import { useToast } from "./Toast";

const personaColorMap: Record<PersonaId, string> = {
  engineer: "var(--persona-eng-500)",
  designer: "var(--persona-des-500)",
  "product-owner": "var(--persona-prod-500)",
  qa: "var(--persona-res-500)",
};

function useModKey(): string {
  const [modKey, setModKey] = useState("Ctrl");
  useEffect(() => {
    setModKey(
      typeof navigator !== "undefined" && navigator.platform.includes("Mac")
        ? "Cmd"
        : "Ctrl"
    );
  }, []);
  return modKey;
}

export function FeedbackPanel({
  ticket,
  onFeedbackAdded,
  initialPersona,
  onSwitchPersona,
}: {
  ticket: Ticket;
  onFeedbackAdded: () => void;
  initialPersona?: PersonaId | null;
  onSwitchPersona?: () => void;
}) {
  const [activePersona, setActivePersona] = useState<PersonaId | null>(
    initialPersona ??
      (ticket.feedback.length > 0
        ? ticket.feedback[ticket.feedback.length - 1].personaId
        : null)
  );

  // Sync with initialPersona if it changes externally
  useEffect(() => {
    if (initialPersona) {
      setActivePersona(initialPersona);
    }
  }, [initialPersona]);
  const [content, setContent] = useState("");
  const [approved, setApproved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<PersonaId | "all">("all");
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const MOD_KEY = useModKey();
  const { addToast } = useToast();

  const persona = activePersona ? getPersona(activePersona) : null;

  // Filtered feedback history based on selected persona filter
  const filteredHistory = useMemo(
    () =>
      historyFilter === "all"
        ? getFeedbackHistory(ticket.id)
        : getFeedbackHistory(ticket.id, historyFilter),
    [ticket, historyFilter]
  );

  const allPersonas = useMemo(() => getAllPersonas(), []);

  const handleSubmit = useCallback(async () => {
    if (!activePersona || !content.trim()) return;
    setSubmitting(true);

    // In a real app this would be an API call
    await new Promise((r) => setTimeout(r, 300));
    const { addFeedback } = await import("@/lib/store");
    addFeedback(ticket.id, activePersona, content.trim(), approved);

    if (persona) {
      addToast({
        variant: "success",
        title: approved ? "Feedback submitted & approved" : "Feedback submitted",
        description: `${persona.label} has ${approved ? "approved" : "provided feedback on"} "${ticket.title}".`,
      });
    }

    setContent("");
    setApproved(false);
    setSubmitting(false);
    onFeedbackAdded();
  }, [activePersona, content, approved, ticket.id, ticket.title, addToast, persona, onFeedbackAdded]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (content.trim() && activePersona && !submitting) {
          handleSubmit();
        }
      }
    },
    [content, activePersona, submitting, handleSubmit]
  );

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-700 uppercase tracking-wider">
          Stakeholder Feedback
        </h3>
        <span className="text-xs text-ink-500">
          {ticket.feedback.length} contribution
          {ticket.feedback.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Persona selector */}
      <div className="flex flex-wrap gap-2">
        {(
          ["engineer", "designer", "product-owner", "qa"] as PersonaId[]
        ).map((pid) => {
          const hasFeedback = ticket.feedback.some(
            (f) => f.personaId === pid
          );
          const personaColor = personaColorMap[pid];
          return (
            <button
              key={pid}
              onClick={() => setActivePersona(pid)}
              className={`relative rounded-full transition-all ${
                activePersona === pid
                  ? "scale-105"
                  : "opacity-70 hover:opacity-100"
              }`}
              style={
                activePersona === pid
                  ? {
                      boxShadow: `0 0 0 2px var(--surface-card), 0 0 0 4px color-mix(in oklab, ${personaColor} 45%, transparent)`,
                    }
                  : undefined
              }
            >
              <PersonaBadge
                personaId={pid}
                approved={ticket.approvals.includes(pid)}
                size="lg"
              />
              {hasFeedback && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-[6px] h-[6px] rounded-full"
                  style={{
                    backgroundColor: personaColor,
                    boxShadow: "0 0 0 2px var(--surface-card)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback input */}
      {persona && (
        <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500 mb-0">
              <span className="font-medium text-ink-700">
                <PersonaIcon personaId={persona.id} size={14} className="inline-block align-text-bottom" /> {persona.label}
              </span>{" "}
              — {persona.expertise}
            </p>
            {onSwitchPersona && (
              <button
                onClick={onSwitchPersona}
                className="flex items-center gap-1 text-xs text-ink-500 hover:text-coral-600 transition-colors"
                title="Switch persona"
              >
                <RefreshCw size={12} />
                Switch Persona
              </button>
            )}
          </div>

          <MarkdownPreview
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={persona.promptTemplate}
            rows={4}
            textareaClassName="bg-[var(--surface-card)] border border-[var(--border-subtle)] text-ink-900 placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--coral-400)] focus:border-transparent"
            previewClassName="bg-[var(--surface-card)] border border-[var(--border-subtle)] text-ink-900"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-ink-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={approved}
                  onChange={(e) => setApproved(e.target.checked)}
                  className="rounded border-[var(--border-strong)] text-coral-500 focus:ring-[var(--coral-400)]"
                />
                <span>Approve ticket ({persona.label} sign-off)</span>
                {approved && (
                  <ThumbsUp size={16} className="text-[var(--success-500)]" />
                )}
              </label>
              <span className="text-[11px] text-ink-muted/60 hidden sm:inline select-none">
                {MOD_KEY}+Enter to submit
              </span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </div>
      )}

      {/* Persona filter bar for feedback history */}
      {ticket.feedback.length > 0 && (
        <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
          <p className="text-xs text-ink-500 uppercase tracking-wider">
            Feedback History
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setHistoryFilter("all")}
              aria-pressed={historyFilter === "all"}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                historyFilter === "all"
                  ? "text-ink-900 bg-[var(--bg-subtle)]"
                  : "text-ink-500 hover:text-ink-700"
              }`}
            >
              All ({ticket.feedback.length})
            </button>
            {allPersonas.map((p) => {
              const count = ticket.feedback.filter(
                (f) => f.personaId === p.id
              ).length;
              return (
                <button
                  key={p.id}
                  onClick={() => setHistoryFilter(p.id)}
                  aria-pressed={historyFilter === p.id}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    historyFilter === p.id
                      ? "text-ink-900 bg-[var(--bg-subtle)]"
                      : "text-ink-500 hover:text-ink-700"
                  }`}
                >
                  <PersonaIcon personaId={p.id} size={12} className="inline-block align-text-bottom" /> {p.label}
                  {count > 0 && (
                    <span className="ml-1 text-ink-400">({count})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Version history toggle */}
          {historyFilter !== "all" && !showVersionHistory && (
            <button
              onClick={() => setShowVersionHistory(true)}
              className="flex items-center gap-1.5 text-xs transition-colors hover:opacity-80"
              style={{ color: "var(--coral-700)" }}
            >
              <GitBranch size={12} />
              Version History
              <span className="text-ink-muted">({ticket.feedback.filter(f => f.personaId === historyFilter).length})</span>
            </button>
          )}

          {/* Version history panel */}
          {showVersionHistory && (
            <div className="border border-border-subtle rounded-lg p-3 bg-elevated/50">
              <VersionHistory
                ticketId={ticket.id}
                personaId={historyFilter as PersonaId}
                feedback={ticket.feedback}
                onClose={() => setShowVersionHistory(false)}
              />
            </div>
          )}

          {/* Filtered feedback entries */}
          {filteredHistory.length > 0 ? (
            <div className="space-y-3">
              {filteredHistory.map((entry) => {
                const entryPersona = getPersona(entry.personaId);
                const personaLabel = entryPersona?.label ?? entry.personaId;
                return (
                  <div key={entry.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <PersonaIcon personaId={entry.personaId} size={14} />
                        <span className="text-sm font-bold" style={{ color: "var(--ink-900)" }}>
                          {personaLabel}
                        </span>
                        <span className="text-[11.5px]" style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }} title={formatAbsoluteDate(entry.createdAt)}>
                          {formatRelativeTime(entry.createdAt)}
                        </span>
                      </div>
                      {entry.approved && (
                        <span className="cc-badge cc-badge--success">
                          <CheckCircle size={10} /> Approved
                        </span>
                      )}
                    </div>
                    <div className="cc-bubble">
                      <p className="whitespace-pre-wrap" style={{ margin: 0 }}>
                        {entry.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="No feedback yet"
              description="No feedback from this persona yet."
              className="bg-transparent border-0 !p-0 !py-4"
            />
          )}
        </div>
      )}
    </div>
  );
}
