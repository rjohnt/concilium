"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Ticket, PersonaId, FeedbackEntry } from "@/lib/types";
import { seedData, getTicket, addFeedback, getFeedbackHistory } from "@/lib/store";
import { getAllPersonas, getPersona } from "@/lib/personas";
import { checkConsensusThreshold } from "@/lib/consensus-threshold";
import { PersonaIcon } from "@/components/PersonaIcon";
import { EmptyState } from "@/components/EmptyState";
import { CheckCircle, XCircle, MessageSquare, Send, Users, Sparkles } from "lucide-react";

function ConsensusProgressBar({ approved, total }: { approved: number; total: number }) {
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
  const threshold = 75;
  const reached = pct >= threshold;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-secondary font-medium">
          <Users size={14} className="inline mr-1.5" />
          Consensus Progress
          {reached && <span className="ml-2 text-olive text-xs">✓ Threshold met</span>}
        </span>
        <span className="text-ink-muted text-xs">
          {approved}/{total} approved ({pct}%)
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-deep overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            reached ? "bg-olive" : "bg-gold"
          }`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-ink-ghost">
        <span>{0}%</span>
        <span className="font-semibold">Threshold: {threshold}%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function FeedbackCard({
  entry,
  personaLabel,
  personaEmoji,
}: {
  entry: FeedbackEntry;
  personaLabel: string;
  personaEmoji: string;
}) {
  return (
    <div className={`p-4 rounded-xl border transition-colors ${
      entry.approved
        ? "bg-raised/50 border-olive/20"
        : "bg-deep/50 border-cardinal/20"
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{personaEmoji}</span>
          <span className="text-sm font-medium text-ink-primary">{personaLabel}</span>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          entry.approved
            ? "bg-olive/10 text-olive"
            : "bg-cardinal/10 text-cardinal"
        }`}>
          {entry.approved ? (
            <><CheckCircle size={10} /> Approved</>
          ) : (
            <><XCircle size={10} /> Concerns</>
          )}
        </span>
      </div>
      <p className="text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">
        {entry.content}
      </p>
    </div>
  );
}

function QuickFeedbackForm({
  personaId,
  ticketId,
  onSubmitted,
}: {
  personaId: PersonaId;
  ticketId: string;
  onSubmitted: () => void;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const persona = getPersona(personaId);

  const handleSubmit = async (approved: boolean) => {
    if (!content.trim()) return;
    setSubmitting(true);
    addFeedback(ticketId, personaId, content.trim(), approved);
    setContent("");
    setSubmitting(false);
    onSubmitted();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <PersonaIcon personaId={personaId} size={16} />
        <span className="text-sm font-medium text-ink-primary">
          Quick feedback as {persona?.label || personaId}
        </span>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type your feedback from this persona's perspective..."
        className="w-full min-h-[80px] p-3 rounded-lg bg-elevated border border-border-visible text-sm text-ink-primary placeholder:text-ink-muted/50 outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 resize-none transition-all"
        disabled={submitting}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleSubmit(true)}
          disabled={!content.trim() || submitting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-olive/20 text-olive hover:bg-olive/30 border border-olive/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <CheckCircle size={14} />
          Approve & Submit
        </button>
        <button
          onClick={() => handleSubmit(false)}
          disabled={!content.trim() || submitting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-cardinal/20 text-cardinal hover:bg-cardinal/30 border border-cardinal/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <XCircle size={14} />
          Raise Concerns
        </button>
      </div>
    </div>
  );
}

export default function ConsensusRoom() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeQuickPersona, setActiveQuickPersona] = useState<PersonaId | null>(null);

  const loadTicket = useCallback(() => {
    seedData();
    const t = getTicket(params.id as string);
    setTicket(t || null);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Listen for store updates
  useEffect(() => {
    const handler = () => {
      const t = getTicket(params.id as string);
      if (t) setTicket(t);
    };
    window.addEventListener("tickets-changed", handler);
    return () => window.removeEventListener("tickets-changed", handler);
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-48 bg-elevated rounded-lg" />
          <div className="h-4 w-96 bg-elevated rounded-lg" />
          <div className="h-40 bg-elevated rounded-xl" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-5xl mx-auto py-16">
        <EmptyState
          icon={MessageSquare}
          title="Ticket not found"
          description="This ticket may have been deleted or the link is invalid."
          action={{ label: "Back to Dashboard", href: "/" }}
        />
      </div>
    );
  }

  const allPersonas = getAllPersonas();
  const feedbackHistory = getFeedbackHistory(ticket.id);
  const consensus = checkConsensusThreshold(ticket);

  // Group feedback by persona
  const feedbackByPersona = {} as Record<PersonaId, FeedbackEntry[]>;
  for (const p of allPersonas) {
    feedbackByPersona[p.id] = feedbackHistory.filter((f) => f.personaId === p.id);
  }

  const personasWithFeedback = allPersonas.filter(
    (p) => feedbackByPersona[p.id].length > 0
  );
  const personasWithoutFeedback = allPersonas.filter(
    (p) => feedbackByPersona[p.id].length === 0
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">{ticket.title}</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs font-mono text-ink-muted">{ticket.id}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              ticket.status === "draft" ? "bg-elevated text-ink-secondary" :
              ticket.status === "consensus" ? "bg-[var(--success-100)] text-[color-mix(in_oklab,var(--success-500)_80%,black)]" :
              ticket.status === "building" ? "bg-[var(--info-100)] text-[#185FA5]" :
              ticket.status === "done" ? "bg-olive/20 text-olive" :
              "bg-[var(--warning-100)] text-[color-mix(in_oklab,var(--warning-500)_72%,black)]"
            }`}>
              {ticket.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/prompt/${ticket.id}`}
            className="btn-primary"
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">Prompt Session</span>
          </Link>
        </div>
      </div>

      {/* Consensus progress */}
      <div className="card mb-6">
        <ConsensusProgressBar
          approved={ticket.approvals.length}
          total={allPersonas.length}
        />
      </div>

      {/* Feedback grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-ink-primary mb-4 flex items-center gap-2">
          <MessageSquare size={16} />
          Persona Feedback
        </h2>

        {personasWithFeedback.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-ink-muted">No feedback yet. Use the Quick Feedback form below to start the conversation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personasWithFeedback.map((persona) => (
              <div key={persona.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <PersonaIcon personaId={persona.id} size={18} />
                  <span className="text-sm font-medium text-ink-primary">
                    {persona.label}
                    {ticket.approvals.includes(persona.id) && (
                      <CheckCircle size={12} className="inline ml-1.5 text-olive" />
                    )}
                  </span>
                </div>
                {feedbackByPersona[persona.id].map((entry) => (
                  <FeedbackCard
                    key={entry.id}
                    entry={entry}
                    personaLabel={persona.label}
                    personaEmoji={persona.emoji}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Personas without feedback */}
      {personasWithoutFeedback.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-ink-secondary mb-3 flex items-center gap-2">
            <Users size={14} />
            Awaiting input from:
          </h3>
          <div className="flex flex-wrap gap-2">
            {personasWithoutFeedback.map((persona) => (
              <button
                key={persona.id}
                onClick={() => setActiveQuickPersona(persona.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                  activeQuickPersona === persona.id
                    ? "bg-raised border-gold/40 text-gold"
                    : "bg-elevated border-border-visible text-ink-muted hover:border-border-default hover:text-ink-primary"
                }`}
              >
                <PersonaIcon personaId={persona.id} size={14} />
                {persona.label}
                <MessageSquare size={12} className="opacity-60" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick feedback form */}
      {activeQuickPersona && (
        <div className="card mb-8">
          <QuickFeedbackForm
            personaId={activeQuickPersona}
            ticketId={ticket.id}
            onSubmitted={() => {
              loadTicket();
              setActiveQuickPersona(null);
            }}
          />
        </div>
      )}

      {/* All personas grid */}
      <div>
        <h3 className="text-sm font-medium text-ink-secondary mb-3">All Personas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {allPersonas.map((persona) => {
            const hasFeedback = feedbackByPersona[persona.id].length > 0;
            const approved = ticket.approvals.includes(persona.id);
            return (
              <button
                key={persona.id}
                onClick={() => setActiveQuickPersona(persona.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  approved
                    ? "bg-olive/5 border-olive/20"
                    : hasFeedback
                    ? "bg-raised border-border-visible"
                    : "bg-deep border-border-subtle"
                } hover:border-gold/30`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <PersonaIcon personaId={persona.id} size={20} />
                  <span className="text-sm font-medium text-ink-primary">{persona.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {approved ? (
                    <span className="text-xs text-olive flex items-center gap-1">
                      <CheckCircle size={10} /> Approved
                    </span>
                  ) : hasFeedback ? (
                    <span className="text-xs text-ink-muted">
                      {feedbackByPersona[persona.id].length} feedback entries
                    </span>
                  ) : (
                    <span className="text-xs text-ink-ghost">Not yet reviewed</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
