"use client";

import { useState, useRef, useEffect } from "react";
import { PersonaId, Ticket, FeedbackEntry } from "@/lib/types";
import { getPersona, getAllPersonas } from "@/lib/personas";
import { addFeedback } from "@/lib/store";
import { calculateConsensus } from "@/lib/consensus-engine";
import { PersonaBadge } from "./PersonaBadge";
import { EmptyState } from "./EmptyState";
import {
  Send,
  CheckCircle,
  ThumbsUp,
  MessageSquare,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface SessionPromptProps {
  ticket: Ticket;
  activePersona: PersonaId;
}

export function SessionPrompt({ ticket, activePersona }: SessionPromptProps) {
  const [content, setContent] = useState("");
  const [approved, setApproved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>(
    ticket.feedback
  );
  const [consensusReached, setConsensusReached] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const persona = getPersona(activePersona);
  const allPersonas = getAllPersonas();

  // Sync feedbackEntries when ticket.feedback changes externally
  useEffect(() => {
    setFeedbackEntries(ticket.feedback);
  }, [ticket.feedback]);

  // Scroll to bottom when new feedback arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feedbackEntries]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [content]);

  // Check if this persona has already submitted feedback
  const hasSubmitted = ticket.feedback.some(
    (f) => f.personaId === activePersona
  );
  const hasApproved = ticket.approvals.includes(activePersona);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);

    // Simulate AI-mediated processing
    await new Promise((r) => setTimeout(r, 600));

    const entry = addFeedback(ticket.id, activePersona, content.trim(), approved);
    if (entry) {
      setFeedbackEntries((prev) => [...prev, entry]);
    }
    setContent("");
    setApproved(false);

    // Check consensus after submission
    const consensus = await calculateConsensus(ticket.id);
    if (consensus.reached) {
      setConsensusReached(true);
    }

    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Determine platform for keyboard shortcut hint
  const isMac = typeof navigator !== "undefined" &&
    ((navigator as any).userAgentData?.platform === "macOS" ||
    /Mac/.test(navigator.userAgent));

  // Sort feedback chronologically
  const sortedFeedback = [...feedbackEntries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      {/* Prompt template header */}
      <div className="p-4 rounded-xl bg-raised/80 border border-border-subtle">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{persona?.emoji}</span>
          <div>
            <h3 className="text-sm font-semibold text-ink-primary">
              {persona?.label} Assessment
            </h3>
            <p className="text-xs text-ink-muted">{persona?.expertise}</p>
          </div>
          {hasApproved && (
            <span className="ml-auto badge bg-emerald-900/50 text-emerald-400">
              <CheckCircle size={12} />
              Approved
            </span>
          )}
        </div>

        {/* Prompt template */}
        <div className="p-3 rounded-lg bg-deep/80 border border-border-subtle/60 mb-3">
          <p className="text-xs text-ink-secondary font-mono leading-relaxed whitespace-pre-wrap">
            {persona?.promptTemplate}
          </p>
        </div>

        {/* Ticket description context */}
        <div className="p-3 rounded-lg bg-elevated/40 border border-border-subtle/60">
          <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">
            Ticket
          </p>
          <p className="text-sm font-medium text-ink-primary">{ticket.title}</p>
          <p className="text-sm text-ink-secondary mt-1 leading-relaxed">
            {ticket.description}
          </p>
        </div>
      </div>

      {/* Chat-like feedback timeline */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {sortedFeedback.length === 0 && (
          <EmptyState
            icon={MessageSquare}
            title="No Feedback"
            description="No feedback yet. Be the first to weigh in!"
            className="bg-transparent border-0 py-8"
          />
        )}

        {sortedFeedback.map((entry) => {
          const entryPersona = getPersona(entry.personaId);
          const isCurrentPersona = entry.personaId === activePersona;
          return (
            <div
              key={entry.id}
              className={`flex gap-3 ${isCurrentPersona ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  entryPersona?.color || "bg-overlay"
                } ${isCurrentPersona ? "ring-2 ring-gold" : ""}`}
              >
                {entryPersona?.emoji}
              </div>

              {/* Message bubble */}
              <div
                className={`flex-1 max-w-[80%] ${
                  isCurrentPersona ? "text-right" : ""
                }`}
              >
                <div
                  className={`inline-block p-3 rounded-xl text-left ${
                    isCurrentPersona
                      ? "bg-gold/20 border border-gold/30 rounded-tr-sm"
                      : "bg-elevated border border-border-visible rounded-tl-sm"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-ink-primary">
                      {entryPersona?.label}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {new Date(entry.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {entry.approved && (
                      <ThumbsUp size={12} className="text-emerald-400" />
                    )}
                  </div>
                  <p className="text-sm text-ink-primary whitespace-pre-wrap">
                    {entry.content}
                  </p>
                </div>
                <div className="mt-1">
                  {entry.approved ? (
                    <span className="text-xs text-emerald-500 flex items-center gap-1 justify-end">
                      <CheckCircle size={10} /> Approved
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted flex items-center gap-1 justify-end">
                      <Clock size={10} /> Feedback
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Consensus reached banner */}
      {consensusReached && (
        <div className="p-3 rounded-lg bg-emerald-900/30 border border-emerald-500/30 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="text-sm font-semibold text-emerald-300">
            🎉 Consensus reached! All required personas have approved.
          </p>
          <p className="text-xs text-emerald-400/70 mt-1">
            This ticket is ready to move to building.
          </p>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border-subtle pt-4 space-y-3">
        {/* Tabs: who has/hasn't submitted */}
        <div className="flex flex-wrap gap-2">
          {allPersonas.map((p) => {
            const submitted = ticket.feedback.some(
              (f) => f.personaId === p.id
            );
            const approvedP = ticket.approvals.includes(p.id);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                  p.id === activePersona
                    ? "bg-gold/20 border border-gold/30 text-gold-light"
                    : approvedP
                    ? "bg-emerald-900/20 border border-emerald-500/20 text-emerald-400"
                    : submitted
                    ? "bg-yellow-900/20 border border-yellow-500/20 text-yellow-400"
                    : "bg-elevated/50 border border-border-visible/30 text-ink-muted"
                }`}
              >
                <span>{p.emoji}</span>
                <span>
                  {p.id === activePersona
                    ? "You"
                    : approvedP
                    ? "✓"
                    : submitted
                    ? "✎"
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasSubmitted
              ? `${persona?.label} has already submitted feedback. Add more thoughts or switch personas.`
              : `Write your assessment as ${persona?.label}...`
          }
          rows={4}
          className="w-full bg-elevated border border-border-visible rounded-lg px-4 py-3 text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent resize-none"
        />

        {/* Actions row */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={approved}
              onChange={(e) => setApproved(e.target.checked)}
              className="rounded bg-overlay border-border-visible text-gold focus:ring-gold"
            />
            <span>Approve as {persona?.label}</span>
            {approved && (
              <ThumbsUp size={16} className="text-emerald-400" />
            )}
          </label>

          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-muted hidden sm:inline">
              {isMac ? "⌘" : "Ctrl"}+Enter
            </span>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {hasSubmitted ? "Add More" : "Submit & Advance"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
