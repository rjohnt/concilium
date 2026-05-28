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
import { MessageSquare, CheckCircle, ThumbsUp, RefreshCw } from "lucide-react";

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
  const MOD_KEY = useModKey();

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

    setContent("");
    setApproved(false);
    setSubmitting(false);
    onFeedbackAdded();
  }, [activePersona, content, approved, ticket.id, onFeedbackAdded]);

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
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Stakeholder Feedback
        </h3>
        <span className="text-xs text-gray-500">
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
          return (
            <button
              key={pid}
              onClick={() => setActivePersona(pid)}
              className={`transition-all ${
                activePersona === pid
                  ? "ring-2 ring-brand-400 rounded-full scale-105"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <PersonaBadge
                personaId={pid}
                approved={ticket.approvals.includes(pid)}
                size="lg"
              />
              {hasFeedback && (
                <span className="inline-block ml-0.5 w-1.5 h-1.5 rounded-full bg-brand-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback input */}
      {persona && (
        <div className="space-y-3 border-t border-gray-800 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400 mb-0">
              <span className="font-medium text-gray-300">
                <PersonaIcon personaId={persona.id} size={14} className="inline-block align-text-bottom" /> {persona.label}
              </span>{" "}
              — {persona.expertise}
            </p>
            {onSwitchPersona && (
              <button
                onClick={onSwitchPersona}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-400 transition-colors"
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
            textareaClassName="bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            previewClassName="bg-gray-800 border border-gray-700 text-gray-200"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={approved}
                  onChange={(e) => setApproved(e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600 text-brand-500 focus:ring-brand-500"
                />
                <span>Approve ticket ({persona.label} sign-off)</span>
                {approved && (
                  <ThumbsUp size={16} className="text-emerald-400" />
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
        <div className="border-t border-gray-800 pt-4 space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            Feedback History
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setHistoryFilter("all")}
              aria-pressed={historyFilter === "all"}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                historyFilter === "all"
                  ? "text-gray-200 bg-gray-700"
                  : "text-gray-500 hover:text-gray-300"
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
                      ? "text-gray-200 bg-gray-700"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <PersonaIcon personaId={p.id} size={12} className="inline-block align-text-bottom" /> {p.label}
                  {count > 0 && (
                    <span className="ml-1 text-gray-600">({count})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Filtered feedback entries */}
          {filteredHistory.length > 0 ? (
            <div className="space-y-3">
              {filteredHistory.map((entry) => {
                const entryPersona = getPersona(entry.personaId);
                const personaLabel = entryPersona?.label ?? entry.personaId;
                return (
                  <div
                    key={entry.id}
                    className="bg-gray-800/50 rounded-lg p-3 border border-gray-800"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <PersonaIcon personaId={entry.personaId} size={14} />
                        <span className="text-xs font-medium text-gray-300">
                          {personaLabel}
                        </span>
                        <span className="text-xs text-gray-500" title={formatAbsoluteDate(entry.createdAt)}>
                          {formatRelativeTime(entry.createdAt)}
                        </span>
                      </div>
                      {entry.approved && (
                        <span className="badge bg-emerald-900/50 text-emerald-400">
                          <CheckCircle size={10} /> Approved
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap mt-1">
                      {entry.content}
                    </p>
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
