"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Ticket, PersonaId } from "@/lib/types";
import { seedData, getTicket, deleteTicket } from "@/lib/store";
import { getPersona } from "@/lib/personas";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { BuildTrigger } from "@/components/BuildTrigger";
import { PersonaBadge } from "@/components/PersonaBadge";
import { JoinSessionModal } from "@/components/JoinSessionModal";
import { ConsensusProgress } from "@/components/ConsensusProgress";
import { DeleteTicketDialog } from "@/components/DeleteTicketDialog";
import { ArrowLeft, Clock, GitBranch, RefreshCw, Sparkles, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  // Session state
  const [sessionPersona, setSessionPersona] = useState<PersonaId | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const loadTicket = useCallback(() => {
    seedData();
    const t = getTicket(params.id as string);
    setTicket(t || null);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // After ticket loads, show the join modal if no session is active
  useEffect(() => {
    if (!loading && ticket && !sessionPersona && !showJoinModal) {
      // Small delay for cinematic entrance after page load
      const timer = setTimeout(() => setShowJoinModal(true), 400);
      return () => clearTimeout(timer);
    }
  }, [loading, ticket, sessionPersona, showJoinModal]);

  const handleJoinSession = (personaId: PersonaId) => {
    setSessionPersona(personaId);
    setShowJoinModal(false);
  };

  const handleSwitchPersona = () => {
    setShowJoinModal(true);
  };

  const handleDeleteConfirm = () => {
    if (!ticket) return;
    const success = deleteTicket(ticket.id);
    if (success) {
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-elevated rounded w-1/3" />
        <div className="h-4 bg-elevated rounded w-2/3" />
        <div className="h-64 bg-elevated rounded" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <h3 className="text-lg font-medium text-ink-secondary mb-2">
          Ticket not found
        </h3>
        <Link href="/" className="btn-secondary inline-flex mt-4">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const activePersonaObj = sessionPersona ? getPersona(sessionPersona) : null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Join Session Modal */}
      <JoinSessionModal
        isOpen={showJoinModal && !sessionPersona}
        onJoin={handleJoinSession}
      />

      {/* Switch Persona Modal (re-join) */}
      <JoinSessionModal
        isOpen={showJoinModal && !!sessionPersona}
        onJoin={handleJoinSession}
      />

      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-primary mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </Link>

      {/* Active persona indicator */}
      {activePersonaObj && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-raised/60 border border-border-subtle">
          <span className="text-lg">{activePersonaObj.emoji}</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-ink-primary">
              Viewing as{" "}
              <span className="text-ink-primary">{activePersonaObj.label}</span>
            </p>
            <p className="text-xs text-ink-muted">{activePersonaObj.expertise}</p>
          </div>
          <button
            onClick={handleSwitchPersona}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-ink-secondary hover:text-gold-light hover:bg-elevated transition-colors"
          >
            <RefreshCw size={12} />
            Switch
          </button>
        </div>
      )}

      {/* Ticket header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono text-ink-muted">
                {ticket.id}
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
            <h1 className="text-2xl font-bold text-ink-primary mb-3">
              {ticket.title}
            </h1>
            <p className="text-ink-secondary leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </p>
            <div className="flex items-center gap-4 mt-4 text-xs text-ink-muted">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                Created {new Date(ticket.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <GitBranch size={12} />
                Updated {new Date(ticket.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Start Prompt Session button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="p-2 rounded-lg text-ink-muted hover:text-cardinal hover:bg-cardinal/10 transition-colors"
              title="Delete ticket"
            >
              <Trash2 size={16} />
            </button>
            <Link
              href={`/prompt/${ticket.id}`}
              className="btn-primary whitespace-nowrap"
              title="Open full-screen prompt session"
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">Prompt Session</span>
              <ExternalLink size={12} className="hidden sm:inline" />
            </Link>
          </div>
        </div>
      </div>

      {/* Consensus progress */}
      <div className="card mb-6">
        <ConsensusProgress
          ticketId={ticket.id}
          approvals={ticket.approvals}
        />
      </div>

      {/* Feedback panel — show after joining, or show hint before joining */}
      {sessionPersona ? (
        <FeedbackPanel
          ticket={ticket}
          onFeedbackAdded={() => loadTicket()}
          initialPersona={sessionPersona}
          onSwitchPersona={handleSwitchPersona}
        />
      ) : (
        <div className="card text-center py-12 opacity-60">
          <p className="text-ink-muted text-sm">
            Choose a persona to join the session and provide feedback.
          </p>
        </div>
      )}

      {/* Build Trigger — show when there's feedback or consensus status */}
      {(ticket.status === "in-review" || ticket.status === "consensus" || ticket.status === "building" || ticket.status === "done") && (
        <div className="mt-6">
          <BuildTrigger ticket={ticket} onBuildTriggered={() => loadTicket()} />
        </div>
      )}

      {/* Delete Ticket Dialog */}
      <DeleteTicketDialog
        isOpen={showDeleteDialog}
        ticketTitle={ticket.title}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
