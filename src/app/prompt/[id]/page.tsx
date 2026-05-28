"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Ticket, PersonaId } from "@/lib/types";
import { seedData, getTicket, getConsensusProgress } from "@/lib/store";
import { getAllPersonas, getPersona } from "@/lib/personas";
import { formatRelativeTime, formatAbsoluteDate } from "@/lib/timeAgo";
import { SessionPrompt } from "@/components/SessionPrompt";
import { ConsensusProgress } from "@/components/ConsensusProgress";
import { JoinSessionModal } from "@/components/JoinSessionModal";
import { PromptSessionSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { PromptErrorBoundary } from "@/components/PromptErrorBoundary";
import {
  ArrowLeft,
  Clock,
  GitBranch,
  RefreshCw,
  Sparkles,
  MessageSquare,
  FileQuestion,
} from "lucide-react";
import Link from "next/link";

export default function PromptSessionPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionPersona, setSessionPersona] = useState<PersonaId | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(true);

  const loadTicket = useCallback(() => {
    seedData();
    const t = getTicket(params.id as string);
    setTicket(t || null);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Auto-show join modal if no persona selected
  useEffect(() => {
    if (!loading && ticket && !sessionPersona) {
      setShowJoinModal(true);
    }
  }, [loading, ticket, sessionPersona]);

  const handleJoinSession = (personaId: PersonaId) => {
    setSessionPersona(personaId);
    setShowJoinModal(false);
  };

  const handleSwitchPersona = () => {
    setShowJoinModal(true);
  };

  const handleFeedbackUpdate = () => {
    loadTicket();
  };

  if (loading) {
    return <PromptSessionSkeleton />;
  }

  if (!ticket) {
    return (
      <div className="h-screen flex items-center justify-center">
        <EmptyState
          icon={FileQuestion}
          title="Ticket not found"
          description="This ticket may have been deleted or the link is invalid."
          action={{ label: "Back to Dashboard", href: "/" }}
        />
      </div>
    );
  }

  const activePersonaObj = sessionPersona ? getPersona(sessionPersona) : null;

  return (
    <div className="h-screen flex flex-col bg-deep">
      {/* Join Session Modal — single instance with mode prop */}
      <JoinSessionModal
        isOpen={showJoinModal}
        onJoin={handleJoinSession}
        mode={sessionPersona ? "switch" : "initial"}
      />

      {/* Top bar */}
      <header className="flex-shrink-0 border-b border-border-subtle bg-raised/80 backdrop-blur-sm">
        <div className="flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/ticket/${ticket.id}`}
              className="flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink-primary transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back to Ticket</span>
            </Link>
            <div className="h-5 w-px bg-border-subtle" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-ink-muted">
                {ticket.id}
              </span>
              <span className="text-sm font-medium text-ink-primary truncate max-w-[200px] sm:max-w-md">
                {ticket.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Active persona */}
            {activePersonaObj ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-elevated/60 border border-border-visible/50">
                <span>{activePersonaObj.emoji}</span>
                <span className="text-sm font-medium text-ink-primary">
                  {activePersonaObj.label}
                </span>
                <button
                  onClick={handleSwitchPersona}
                  className="ml-1 p-1 rounded hover:bg-overlay transition-colors"
                  title="Switch persona"
                >
                  <RefreshCw size={14} className="text-ink-secondary" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowJoinModal(true)}
                className="btn-primary text-sm"
              >
                <Sparkles size={14} />
                Join Session
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content: two-panel layout */}
      <PromptErrorBoundary>
        <div className="flex-1 flex overflow-hidden">
        {/* Left panel: ticket info + consensus */}
        <div className="w-80 lg:w-96 flex-shrink-0 border-r border-border-subtle bg-base/40 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Session title */}
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-medium mb-3">
                <Sparkles size={12} />
                Prompt Session
              </div>
              <h1 className="text-lg font-bold text-ink-primary mb-2">
                {ticket.title}
              </h1>
              <p className="text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
              <div className="flex items-center gap-3 mt-3 text-xs text-ink-muted">
                <span className="flex items-center gap-1" title={formatAbsoluteDate(ticket.createdAt)}>
                  <Clock size={11} />
                  {formatRelativeTime(ticket.createdAt)}
                </span>
                <span className="flex items-center gap-1" title={formatAbsoluteDate(ticket.updatedAt)}>
                  <GitBranch size={11} />
                  {formatRelativeTime(ticket.updatedAt)}
                </span>
                <span
                  className={`badge ${
                    ticket.status === "draft"
                      ? "bg-elevated text-ink-secondary"
                      : ticket.status === "in-review"
                      ? "bg-yellow-900/50 text-yellow-400"
                      : ticket.status === "consensus"
                      ? "bg-emerald-900/50 text-emerald-400"
                      : "bg-blue-900/50 text-blue-400"
                  }`}
                >
                  {ticket.status}
                </span>
              </div>
            </div>

            {/* Consensus Progress */}
            <ConsensusProgress
              ticketId={ticket.id}
              approvals={ticket.approvals}
              onConsensusReached={handleFeedbackUpdate}
            />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-elevated/40 border border-border-subtle">
                <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                  <MessageSquare size={12} />
                  Feedback
                </div>
                <p className="text-2xl font-bold text-ink-primary">
                  {ticket.feedback.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-elevated/40 border border-border-subtle">
                <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                  <Sparkles size={12} />
                  Consensus
                </div>
                <p className="text-2xl font-bold text-ink-primary">
                  {Math.round(
                    (ticket.approvals.length / getAllPersonas().length) * 100
                  )}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: prompt input + chat timeline */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {sessionPersona ? (
            <div className="flex-1 overflow-y-auto p-6">
              <SessionPrompt ticket={ticket} activePersona={sessionPersona} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={Sparkles}
                title="Ready to Start"
                description="Join this session as a persona to provide AI-mediated feedback. Your perspective will help shape this feature."
              >
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="btn-primary"
                >
                  <Sparkles size={16} />
                  Join Session
                </button>
              </EmptyState>
            </div>
          )}
        </div>
      </div>
      </PromptErrorBoundary>
    </div>
  );
}
