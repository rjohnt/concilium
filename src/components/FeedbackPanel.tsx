"use client";

import { useState, useEffect } from "react";
import { PersonaId, Ticket, FeedbackEntry, AIPromptResponse } from "@/lib/types";
import { getPersona } from "@/lib/personas";
import { PersonaBadge } from "./PersonaBadge";
import {
  MessageSquare,
  CheckCircle,
  ThumbsUp,
  RefreshCw,
  Sparkles,
  Loader,
  Bot,
} from "lucide-react";

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
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIPromptResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const persona = activePersona ? getPersona(activePersona) : null;

  // Get all feedback entries, grouped by persona for the history view
  const personaFeedback = activePersona
    ? ticket.feedback.filter((f) => f.personaId === activePersona)
    : [];

  const handleSubmit = async (source: "human" | "ai" = "human") => {
    if (!activePersona || !content.trim()) return;
    setSubmitting(true);

    const { addFeedback } = await import("@/lib/store");
    addFeedback(ticket.id, activePersona, content.trim(), approved, source);

    setContent("");
    setApproved(false);
    setAiResponse(null);
    setAiError(null);
    setSubmitting(false);
    onFeedbackAdded();
  };

  const handleGenerateAI = async () => {
    if (!activePersona) return;
    setAiGenerating(true);
    setAiError(null);
    setAiResponse(null);

    try {
      const res = await fetch(`/api/sessions/${ticket.id}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: activePersona }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate AI feedback");
      }

      const data: AIPromptResponse = await res.json();
      setAiResponse(data);
      setContent(data.feedback);
      setApproved(data.recommendedApproval);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setAiError(message);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleClearAI = () => {
    setAiResponse(null);
    setAiError(null);
    setContent("");
    setApproved(false);
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
              onClick={() => {
                setActivePersona(pid);
                setAiResponse(null);
                setAiError(null);
              }}
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
            <div className="flex items-center gap-2">
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
          </div>

          {/* AI Generation Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAI}
              disabled={aiGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-purple-900/20 text-purple-400 border border-purple-500/20
                hover:bg-purple-900/40 hover:border-purple-500/40
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all"
            >
              {aiGenerating ? (
                <>
                  <Loader size={12} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Bot size={12} />
                  Generate AI Feedback
                </>
              )}
            </button>
            {aiResponse && (
              <button
                onClick={handleClearAI}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* AI response info */}
          {aiResponse && (
            <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-purple-400" />
                <span className="text-xs font-medium text-purple-300">
                  AI-generated feedback
                </span>
                <span className="text-[10px] text-purple-500">
                  {(aiResponse.confidence * 100).toFixed(0)}% confidence
                </span>
                {aiResponse.recommendedApproval ? (
                  <span className="badge bg-emerald-900/30 text-emerald-400 text-[10px]">
                    Suggests Approve
                  </span>
                ) : (
                  <span className="badge bg-amber-900/30 text-amber-400 text-[10px]">
                    Suggests Changes
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-400/70 italic">
                {aiResponse.reasoning}
              </p>
            </div>
          )}

          {/* AI error */}
          {aiError && (
            <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-xs text-red-400">{aiError}</p>
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              // If user edits AI-generated content, clear AI attribution
              if (aiResponse) setAiResponse(null);
            }}
            placeholder={persona.promptTemplate}
            rows={6}
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
              onClick={() => handleSubmit(aiResponse ? "ai" : "human")}
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                  {entry.source === "ai" && (
                    <span className="badge bg-purple-900/30 text-purple-400 text-[10px]">
                      <Bot size={10} /> AI
                    </span>
                  )}
                </div>
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
