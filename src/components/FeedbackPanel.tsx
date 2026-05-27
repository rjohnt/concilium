"use client";

import { useState, useEffect, useMemo } from "react";
import { PersonaId, Ticket, FeedbackEntry } from "@/lib/types";
import { getPersona, getAllPersonas } from "@/lib/personas";
import { getFeedbackHistory } from "@/lib/store";
import { PersonaBadge } from "./PersonaBadge";
import { MessageSquare, CheckCircle, ThumbsUp, RefreshCw } from "lucide-react";

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

  const persona = activePersona ? getPersona(activePersona) : null;

  // Get all feedback entries, grouped by persona for the history view
  const personaFeedback = activePersona
    ? ticket.feedback.filter((f) => f.personaId === activePersona)
    : [];

  // Filtered feedback history based on selected persona filter
  const filteredHistory = useMemo(
    () =>
      historyFilter === "all"
        ? getFeedbackHistory(ticket.id)
        : getFeedbackHistory(ticket.id, historyFilter),
    [ticket.id, historyFilter]
  );

  const allPersonas = useMemo(() => getAllPersonas(), []);

  const handleSubmit = async () => {
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
  };

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
                {persona.emoji} {persona.label}
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

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={persona.promptTemplate}
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
          />

          <div className="flex items-center justify-between">
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
        <div className="border-t border-border-subtle pt-4 space-y-3">
          <p className="text-xs text-ink-muted uppercase tracking-wider">
            Feedback History
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setHistoryFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                historyFilter === "all"
                  ? "text-gold border-b-2 border-gold bg-gold/10"
                  : "text-ink-muted hover:text-ink-primary"
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
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    historyFilter === p.id
                      ? "text-gold border-b-2 border-gold bg-gold/10"
                      : "text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  {p.emoji} {p.label}
                  {count > 0 && (
                    <span className="ml-1 text-ink-ghost">({count})</span>
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
                return (
                  <div
                    key={entry.id}
                    className="bg-elevated/50 rounded-lg p-3 border border-border-subtle"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">
                          {entryPersona.emoji}
                        </span>
                        <span className="text-xs font-medium text-ink-primary">
                          {entryPersona.label}
                        </span>
                        <span className="text-xs text-ink-muted">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {entry.approved && (
                        <span className="badge bg-emerald-900/50 text-emerald-400">
                          <CheckCircle size={10} /> Approved
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-secondary whitespace-pre-wrap mt-1">
                      {entry.content}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-ink-ghost py-4 text-center">
              No feedback from this persona yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
