"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PersonaId, Ticket, FeedbackEntry } from "@/lib/types";
import { getPersona, getAllPersonas } from "@/lib/personas";
import { addFeedback } from "@/lib/store";
import { calculateConsensus } from "@/lib/consensus-engine";
import { formatRelativeTime, formatAbsoluteDate } from "@/lib/timeAgo";
import { EmptyState } from "./EmptyState";
import { MarkdownPreview } from "./MarkdownPreview";
import {
  Send,
  CheckCircle,
  Check,
  ThumbsUp,
  MessageSquare,
  Clock,
  ArrowRight,
  Loader2,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  ArrowRightCircle,
  Edit3,
  X,
  RefreshCw,
  MessageCircle,
  PartyPopper,
  Minus,
  Pencil,
} from "lucide-react";
import { PersonaIcon } from "./PersonaIcon";

// === Feedback stream for real-time multiplayer ===
import { onFeedbackStream } from "@/lib/feedback-stream";

// === Types for mediator responses ===

interface MediatorResponse {
  refinedFeedback: string;
  concerns: string[];
  recommendations: string[];
  followUpQuestions: string[];
  suggestApproval: boolean;
  approvalReasoning: string;
  suggestedNextPersona: PersonaId | null;
  meta: {
    mediationType: string;
    processedAt: string;
    inputLength: number;
  };
  context?: {
    consensusReached: boolean;
    approvedCount: number;
    totalPersonas: number;
  };
}

// === Session message types ===

type SessionMessage =
  | { type: "user"; content: string; timestamp: string }
  | { type: "mediator"; response: MediatorResponse; timestamp: string }
  | { type: "submitted"; entry: FeedbackEntry; timestamp: string }
  | { type: "system"; content: string; timestamp: string };

// === Props ===

interface SessionPromptProps {
  ticket: Ticket;
  activePersona: PersonaId;
}

export function SessionPrompt({ ticket, activePersona }: SessionPromptProps) {
  const [content, setContent] = useState("");
  const [approved, setApproved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mediating, setMediating] = useState(false);
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>(
    ticket.feedback
  );
  const [consensusReached, setConsensusReached] = useState(false);

  // Multi-turn conversation state
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [currentMediatorResponse, setCurrentMediatorResponse] =
    useState<MediatorResponse | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedFeedback, setEditedFeedback] = useState("");
  const [previousResponse, setPreviousResponse] =
    useState<MediatorResponse | null>(null);
  const [activeFollowUp, setActiveFollowUp] = useState<string | null>(null);

  // ── Real-time feedback stream state ──
  const [liveStreamActive, setLiveStreamActive] = useState(false);
  const [streamEventLog, setStreamEventLog] = useState<Array<{personaId: string; label: string; timestamp: number}>>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  const persona = getPersona(activePersona);
  const allPersonas = getAllPersonas();

  // Sync feedbackEntries when ticket.feedback changes externally
  useEffect(() => {
    setFeedbackEntries(ticket.feedback);
  }, [ticket.feedback]);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentMediatorResponse]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [content, editedFeedback]);

  // Check if this persona has already submitted feedback
  const hasSubmitted = ticket.feedback.some(
    (f: FeedbackEntry) => f.personaId === activePersona
  );
  const hasApproved = ticket.approvals.includes(activePersona);

  // === Core: Call the mediator API ===

  const callMediator = useCallback(
    async (message: string, prevResp?: MediatorResponse) => {
      setMediating(true);

      try {
        const body: any = {
          ticketId: ticket.id,
          personaId: activePersona,
          message,
        };

        if (prevResp) {
          body.previousResponse = {
            refinedFeedback: prevResp.refinedFeedback,
            concerns: prevResp.concerns,
            recommendations: prevResp.recommendations,
            followUpQuestions: prevResp.followUpQuestions,
            suggestApproval: prevResp.suggestApproval,
            approvalReasoning: prevResp.approvalReasoning,
            suggestedNextPersona: prevResp.suggestedNextPersona,
          };
        }

        const res = await fetch("/api/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Mediation failed");
        }

        const data: MediatorResponse = await res.json();

        // Add user message to conversation
        setMessages((prev) => [
          ...prev,
          { type: "user", content: message, timestamp: new Date().toISOString() },
        ]);

        // Show mediator response
        setCurrentMediatorResponse(data);
        setPreviousResponse(data);
        setEditMode(false);
        setEditedFeedback(data.refinedFeedback);

        // Auto-set approval if mediator suggests it
        if (data.suggestApproval) {
          setApproved(true);
        }

        // Handle follow-up click
        if (data.followUpQuestions.length > 0) {
          setActiveFollowUp(data.followUpQuestions[0]);
        }
      } catch (error) {
        console.error("Mediator error:", error);
        setMessages((prev) => [
          ...prev,
          {
            type: "system",
            content: `Mediation unavailable — submitting raw feedback. (${error instanceof Error ? error.message : "Unknown error"})`,
            timestamp: new Date().toISOString(),
          },
        ]);
        // Fallback: submit directly
        submitFeedbackDirectly(message);
      } finally {
        setMediating(false);
      }
    },
    [ticket.id, activePersona]
  );

  // === Fallback: submit directly without mediation ===

  const submitFeedbackDirectly = (feedbackContent: string) => {
    const entry = addFeedback(
      ticket.id,
      activePersona,
      feedbackContent.trim(),
      approved
    );
    if (entry) {
      setFeedbackEntries((prev) => [...prev, entry]);
      setMessages((prev) => [
        ...prev,
        {
          type: "submitted",
          entry,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
    setContent("");
    setApproved(false);
    setCurrentMediatorResponse(null);
    setPreviousResponse(null);
  };

  // === Handle initial submit (routes to mediator) ===

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);

    await callMediator(content.trim());

    setContent("");
    setSubmitting(false);
  };

  // === Handle submitting the mediator-refined feedback ===

  const handleApproveMediated = () => {
    const finalContent = editMode ? editedFeedback : currentMediatorResponse?.refinedFeedback;
    if (!finalContent) return;

    const entry = addFeedback(
      ticket.id,
      activePersona,
      finalContent.trim(),
      approved
    );

    if (entry) {
      setFeedbackEntries((prev) => [...prev, entry]);
      setMessages((prev) => [
        ...prev,
        {
          type: "submitted",
          entry,
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    setCurrentMediatorResponse(null);
    setPreviousResponse(null);
    setEditMode(false);
    setActiveFollowUp(null);
  };

  // === Handle follow-up conversation ===

  const handleFollowUpResponse = async (question: string) => {
    if (!currentMediatorResponse) return;

    setActiveFollowUp(question);
    setMediating(true);

    await callMediator(question, currentMediatorResponse);

    setMediating(false);
  };

  // === Handle editing ===

  const handleStartEdit = () => {
    setEditMode(true);
    setEditedFeedback(currentMediatorResponse?.refinedFeedback || "");
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedFeedback(currentMediatorResponse?.refinedFeedback || "");
  };

  // === Handle dismissing mediator response (submit raw) ===

  const handleDismissMediator = () => {
    // Get the last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.type === "user");
    if (lastUserMsg && lastUserMsg.type === "user") {
      submitFeedbackDirectly(lastUserMsg.content);
    }
  };

  // === Handle keyboard shortcut ===

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (currentMediatorResponse && !editMode) {
        handleApproveMediated();
      } else {
        handleSubmit();
      }
    }
  };

  // Determine platform for keyboard shortcut hint
  const isMac =
    typeof navigator !== "undefined" &&
    ((navigator as any).userAgentData?.platform === "macOS" ||
      /Mac/.test(navigator.userAgent));

  // Sort feedback chronologically
  const sortedFeedback = [...feedbackEntries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Check consensus after submissions
  useEffect(() => {
    const checkConsensus = async () => {
      const consensus = await calculateConsensus(ticket.id);
      if (consensus.reached) {
        setConsensusReached(true);
      }
    };
    // Only check if feedback count changed and we have entries
    if (feedbackEntries.length > 0) {
      checkConsensus();
    }
  }, [feedbackEntries.length, ticket.id]);

  // ── Subscribe to real-time feedback stream ──
  // When other participants submit feedback, it auto-appears in the chat.
  useEffect(() => {
    const unsub = onFeedbackStream((event) => {
      // Only process events for this ticket
      if (event.feedbackEntry.ticketId !== ticket.id) return;
      // Don't re-add our own submissions (already in feedbackEntries)
      if (event.feedbackEntry.personaId === activePersona) return;

      // Check if this entry is already in feedbackEntries (dedup)
      const alreadyExists = feedbackEntries.some(
        (f) => f.id === event.feedbackEntry.id
      );
      if (alreadyExists) return;

      // Add the incoming feedback to our local state
      const newEntry: FeedbackEntry = {
        id: event.feedbackEntry.id,
        ticketId: event.feedbackEntry.ticketId,
        personaId: event.feedbackEntry.personaId as PersonaId,
        content: event.feedbackEntry.content,
        createdAt: event.feedbackEntry.createdAt,
        approved: event.feedbackEntry.approved,
      };
      setFeedbackEntries((prev) => [...prev, newEntry]);

      // Log the stream event for the live indicator
      const persona = allPersonas.find((p) => p.id === event.feedbackEntry.personaId);
      setStreamEventLog((prev) => [
        ...prev.slice(-4), // Keep last 5 events
        {
          personaId: event.feedbackEntry.personaId,
          label: persona?.label || event.feedbackEntry.personaId,
          timestamp: Date.now(),
        },
      ]);
      setLiveStreamActive(true);
    });

    return () => {
      unsub();
    };
  }, [ticket.id, activePersona]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      {/* Prompt template header */}
      <div className="p-4 rounded-xl bg-raised/80 border border-border-subtle">
        <div className="flex items-center gap-2 mb-3">
          <PersonaIcon personaId={activePersona} size={24} />
          <div>
            <h3 className="text-sm font-semibold text-ink-primary">
              {persona?.label} Assessment
            </h3>
            <p className="text-xs text-ink-muted">{persona?.expertise}</p>
          </div>
          {hasApproved && (
            <span className="ml-auto cc-badge cc-badge--success">
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

      {/* Conversation area */}
      <div
        ref={conversationRef}
        className="space-y-3 max-h-[420px] overflow-y-auto pr-2 relative"
      >
        {/* Real-time streaming indicator */}
        {liveStreamActive && (
          <div className="sticky top-0 z-10 mb-2 flex items-center justify-center">
            <div className="cc-live inline-flex px-3 py-1 rounded-full animate-in fade-in slide-in-from-top-2 duration-300"
              style={{ background: "var(--persona-eng-50)", border: "1px solid var(--persona-eng-100)" }}>
              <span className="cc-live__dot" />
              <span>
                Live
                {streamEventLog.length > 0 && (
                  <span className="ml-1 opacity-70">
                    · {streamEventLog[streamEventLog.length - 1].label} just submitted
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
        {/* Existing feedback entries as chat bubbles */}
        {sortedFeedback.length === 0 &&
          messages.length === 0 &&
          !currentMediatorResponse && (
            <EmptyState
              icon={MessageSquare}
              title="No Feedback Yet"
              description="Be the first to weigh in! Write your assessment below and the mediator will help refine it through the persona lens."
              className="bg-transparent border-0 py-8"
            />
          )}

        {/* Submitted feedback bubbles */}
        {sortedFeedback.map((entry) => {
          const entryPersona = getPersona(entry.personaId);
          const isCurrentPersona = entry.personaId === activePersona;
          return (
            <div
              key={entry.id}
              className={`flex gap-3 ${isCurrentPersona ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm text-white ${
                  entryPersona?.color || "bg-overlay"
                }`}
                style={isCurrentPersona ? { boxShadow: "0 0 0 2px var(--surface-card), 0 0 0 4px var(--coral-200)" } : undefined}
              >
                <PersonaIcon personaId={entry.personaId} size={16} className="!text-white" />
              </div>

              <div
                className={`flex-1 max-w-[80%] ${isCurrentPersona ? "text-right" : ""}`}
              >
                <div className={`flex items-center gap-2 mb-1 ${isCurrentPersona ? "justify-end" : ""}`}>
                  <span className="text-sm font-bold" style={{ color: "var(--ink-900)" }}>
                    {entryPersona?.label}
                  </span>
                  <span
                    className="text-[11.5px]"
                    style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
                    title={formatAbsoluteDate(entry.createdAt)}
                  >
                    {formatRelativeTime(entry.createdAt)}
                  </span>
                  {entry.approved && (
                    <ThumbsUp size={12} style={{ color: "var(--success-500)" }} />
                  )}
                </div>
                <div className={`inline-block text-left cc-bubble ${isCurrentPersona ? "cc-bubble--you" : ""}`}>
                  <p className="whitespace-pre-wrap" style={{ margin: 0 }}>
                    {entry.content}
                  </p>
                </div>
                <div className="mt-1">
                  {entry.approved ? (
                    <span className="text-xs flex items-center gap-1 justify-end" style={{ color: "var(--success-500)" }}>
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

        {/* Mediator response card (before submission) */}
        {currentMediatorResponse && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Mediator header */}
            <div className="flex items-center gap-2 px-1">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "var(--coral-50)", border: "1px solid var(--coral-200)" }}>
                <Sparkles size={12} style={{ color: "var(--coral-600)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--coral-700)" }}>
                  AI-Mediated {persona?.label} Response
                </span>
              </div>
              <span className="text-xs text-ink-muted">
                {currentMediatorResponse.meta.mediationType === "rules-based"
                  ? "(rules-based)"
                  : ""}
              </span>
            </div>

            {/* Refined feedback */}
            <div className="p-4 rounded-lg" style={{ background: "var(--surface-card)", border: "1px solid var(--coral-200)", boxShadow: "var(--shadow-xs)" }}>
              {editMode ? (
                <div className="space-y-2">
                  <textarea
                    value={editedFeedback}
                    onChange={(e) => setEditedFeedback(e.target.value)}
                    className="w-full rounded-md p-3 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-[var(--coral-500)] focus:shadow-focus"
                    style={{ background: "var(--surface-card)", border: "1px solid var(--border-strong)" }}
                    rows={6}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleApproveMediated();
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleApproveMediated}
                      className="btn-primary text-xs"
                    >
                      <CheckCircle size={14} />
                      Save &amp; Submit
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="btn-ghost text-xs"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-ink-primary whitespace-pre-wrap leading-relaxed">
                    {currentMediatorResponse.refinedFeedback}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleStartEdit}
                      className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink-primary transition-colors"
                    >
                      <Edit3 size={12} />
                      Edit
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Concerns */}
            {currentMediatorResponse.concerns.length > 0 && (
              <div className="p-3 rounded-md" style={{ background: "var(--danger-100)", border: "1px solid color-mix(in oklab, var(--danger-500) 24%, transparent)" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={14} style={{ color: "var(--danger-500)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--danger-500)" }}>
                    Concerns
                  </span>
                </div>
                <ul className="space-y-1">
                  {currentMediatorResponse.concerns.map((c, i) => (
                    <li
                      key={i}
                      className="text-xs flex items-start gap-1.5"
                      style={{ color: "color-mix(in oklab, var(--danger-500) 82%, black)" }}
                    >
                      <span className="mt-0.5">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {currentMediatorResponse.recommendations.length > 0 && (
              <div className="p-3 rounded-md" style={{ background: "var(--success-100)", border: "1px solid color-mix(in oklab, var(--success-500) 22%, transparent)" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb size={14} style={{ color: "var(--success-500)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--success-500)" }}>
                    Recommendations
                  </span>
                </div>
                <ul className="space-y-1">
                  {currentMediatorResponse.recommendations.map((r, i) => (
                    <li
                      key={i}
                      className="text-xs flex items-start gap-1.5"
                      style={{ color: "color-mix(in oklab, var(--success-500) 80%, black)" }}
                    >
                      <span className="mt-0.5">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Approval suggestion */}
            <div
              className="p-3 rounded-md"
              style={
                currentMediatorResponse.suggestApproval
                  ? { background: "var(--success-100)", border: "1px solid color-mix(in oklab, var(--success-500) 22%, transparent)" }
                  : { background: "var(--warning-100)", border: "1px solid color-mix(in oklab, var(--warning-500) 28%, transparent)" }
              }
            >
              <div className="flex items-center gap-2">
                {currentMediatorResponse.suggestApproval ? (
                  <ThumbsUp size={14} style={{ color: "var(--success-500)" }} />
                ) : (
                  <Clock size={14} style={{ color: "color-mix(in oklab, var(--warning-500) 78%, black)" }} />
                )}
                <p className="text-xs text-ink-secondary">
                  {currentMediatorResponse.approvalReasoning}
                </p>
              </div>
            </div>

            {/* Follow-up questions */}
            {currentMediatorResponse.followUpQuestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <MessageCircle size={12} />
                  <span>Continue the conversation:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentMediatorResponse.followUpQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleFollowUpResponse(q)}
                      disabled={mediating}
                      className="cc-chip disabled:opacity-50"
                      style={
                        activeFollowUp === q
                          ? { borderColor: "var(--coral-500)", color: "var(--coral-700)", background: "var(--coral-50)" }
                          : undefined
                      }
                    >
                      <ArrowRightCircle size={12} />
                      {q.length > 60 ? q.slice(0, 60) + "..." : q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Next persona suggestion */}
            {currentMediatorResponse.suggestedNextPersona && (
              <div className="flex items-center gap-2 text-xs text-ink-muted">
                <ArrowRight size={12} />
                <span>
                  Suggested next:{" "}
                  <span className="font-medium" style={{ color: "var(--coral-700)" }}>
                    <PersonaIcon
                      personaId={
                        currentMediatorResponse.suggestedNextPersona
                      }
                      size={14}
                      className="inline-block align-text-bottom"
                    />{" "}
                    {
                      allPersonas.find(
                        (p) =>
                          p.id ===
                          currentMediatorResponse.suggestedNextPersona
                      )?.label
                    }
                  </span>
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={approved}
                  onChange={(e) => setApproved(e.target.checked)}
                  className="rounded border-border-visible accent-[var(--coral-500)]"
                />
                <span>Approve as {persona?.label}</span>
                {approved && <ThumbsUp size={16} className="text-emerald-400" />}
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDismissMediator}
                  className="btn-ghost text-xs text-ink-muted"
                >
                  Dismiss
                </button>
                {!editMode && (
                  <button
                    onClick={handleApproveMediated}
                    className="btn-primary"
                  >
                    <CheckCircle size={16} />
                    Submit as {persona?.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* System messages */}
        {messages
          .filter((m) => m.type === "system")
          .map((m, i) => (
            <div
              key={i}
              className="flex justify-center animate-in fade-in duration-300"
            >
              <span className="text-xs text-ink-muted bg-elevated/50 px-3 py-1 rounded-full">
                {m.type === "system" ? m.content : null}
              </span>
            </div>
          ))}

        <div ref={chatEndRef} />
      </div>

      {/* Consensus reached banner */}
      {consensusReached && (
        <div className="p-3 rounded-md text-center animate-in fade-in slide-in-from-bottom-2 duration-500"
          style={{ background: "var(--success-100)", border: "1px solid color-mix(in oklab, var(--success-500) 22%, transparent)" }}>
          <p className="text-sm font-semibold flex items-center justify-center gap-2" style={{ color: "color-mix(in oklab, var(--success-500) 80%, black)" }}>
            <PartyPopper size={16} />
            Consensus reached — all required personas have approved.
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--success-500)" }}>
            This ticket is ready to move to building.
          </p>
        </div>
      )}

      {/* Input area — only show when not viewing a mediator response */}
      {!currentMediatorResponse && (
        <div className="border-t border-border-subtle pt-4 space-y-3">
          {/* Persona status tabs */}
          <div className="flex flex-wrap gap-2">
            {allPersonas.map((p) => {
              const submitted = ticket.feedback.some(
                (f) => f.personaId === p.id
              );
              const approvedP = ticket.approvals.includes(p.id);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border"
                  style={
                    p.id === activePersona
                      ? { background: "var(--coral-50)", borderColor: "var(--coral-200)", color: "var(--coral-700)" }
                      : approvedP
                        ? { background: "var(--success-100)", borderColor: "color-mix(in oklab, var(--success-500) 22%, transparent)", color: "color-mix(in oklab, var(--success-500) 80%, black)" }
                        : submitted
                          ? { background: "var(--warning-100)", borderColor: "color-mix(in oklab, var(--warning-500) 28%, transparent)", color: "color-mix(in oklab, var(--warning-500) 72%, black)" }
                          : { background: "var(--surface-card)", borderColor: "var(--border-subtle)", color: "var(--text-muted)" }
                  }
                >
                  <PersonaIcon personaId={p.id} size={14} />
                  <span>
                    {p.id === activePersona
                      ? "You"
                      : approvedP
                        ? <Check size={12} />
                        : submitted
                          ? <Pencil size={12} />
                          : <Minus size={12} />}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Textarea with markdown preview */}
          <MarkdownPreview
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            textareaRef={textareaRef}
            placeholder={
              hasSubmitted
                ? `${persona?.label} has already submitted feedback. Add more thoughts or switch personas.`
                : `Write your raw thoughts as ${persona?.label}... The mediator will refine them.`
            }
            rows={4}
            textareaClassName="bg-[var(--surface-card)] border border-[var(--border-strong)] text-ink-primary placeholder-ink-muted rounded-md focus:outline-none focus:border-[var(--coral-500)] focus:shadow-focus"
            previewClassName="bg-[var(--surface-card)] border border-[var(--border-strong)] text-ink-primary rounded-md"
          />

          {/* Actions row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <Sparkles size={14} style={{ color: "var(--coral-500)" }} />
              <span>Your input will be refined by the {persona?.label} mediator</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-muted hidden sm:inline">
                {isMac ? "⌘" : "Ctrl"}+Enter
              </span>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting || mediating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Mediating...
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
      )}
    </div>
  );
}
