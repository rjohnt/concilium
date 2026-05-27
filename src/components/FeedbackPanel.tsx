"use client";

import { useState } from "react";
import { PersonaId, Ticket, FeedbackEntry } from "@/lib/types";
import { getPersona } from "@/lib/personas";
import { PersonaBadge } from "./PersonaBadge";
import { MessageSquare, CheckCircle, ThumbsUp } from "lucide-react";

export function FeedbackPanel({
  ticket,
  onFeedbackAdded,
}: {
  ticket: Ticket;
  onFeedbackAdded: () => void;
}) {
  const [activePersona, setActivePersona] = useState<PersonaId | null>(
    ticket.feedback.length > 0
      ? ticket.feedback[ticket.feedback.length - 1].personaId
      : null
  );
  const [content, setContent] = useState("");
  const [approved, setApproved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const persona = activePersona ? getPersona(activePersona) : null;

  // Get all feedback entries, grouped by persona for the history view
  const personaFeedback = activePersona
    ? ticket.feedback.filter((f) => f.personaId === activePersona)
    : [];

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
          <div>
            <p className="text-sm text-gray-400 mb-2">
              <span className="font-medium text-gray-300">
                {persona.emoji} {persona.label}
              </span>{" "}
              — {persona.expertise}
            </p>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Weigh in as ${persona.label}...`}
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
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

      {/* Feedback history for active persona */}
      {personaFeedback.length > 0 && (
        <div className="border-t border-gray-800 pt-4 space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            History — {persona?.label}
          </p>
          {personaFeedback.map((entry) => (
            <div
              key={entry.id}
              className="bg-gray-800/50 rounded-lg p-3 border border-gray-800"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
                {entry.approved && (
                  <span className="badge bg-emerald-900/50 text-emerald-400">
                    <CheckCircle size={10} /> Approved
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {entry.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
