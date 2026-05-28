"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Ticket, PersonaId, PRIORITY_LABELS, PRIORITY_COLORS, PriorityLevel, PREDEFINED_TAGS } from "@/lib/types";
import { seedData, getTicket, deleteTicket, updateTicket, updateTicketPriority, updateTicketTags } from "@/lib/store";
import { formatDueDate } from "@/lib/date-utils";
import { getPersona } from "@/lib/personas";
import { formatRelativeTime, formatAbsoluteDate } from "@/lib/timeAgo";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { BuildTrigger } from "@/components/BuildTrigger";
import { BuildReportInline } from "@/components/BuildReportInline";
import { PersonaBadge } from "@/components/PersonaBadge";
import { JoinSessionModal } from "@/components/JoinSessionModal";
import { CopyButton } from "@/components/CopyButton";
import { ConsensusProgress } from "@/components/ConsensusProgress";
import { DetailSkeleton } from "@/components/Skeleton";
import { DeleteTicketDialog } from "@/components/DeleteTicketDialog";
import { ActivityFeed } from "@/components/ActivityFeed";
import { EditableField } from "@/components/EditableField";
import { TagChip } from "@/components/TagChip";
import { EmptyState } from "@/components/EmptyState";
import { ArrowLeft, Clock, GitBranch, RefreshCw, Sparkles, ExternalLink, Trash2, FileQuestion, Calendar } from "lucide-react";
import { PersonaIcon } from "@/components/PersonaIcon";
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

  const handleUpdateTitle = (newTitle: string) => {
    if (!ticket) return;
    const updated = updateTicket(ticket.id, { title: newTitle });
    if (updated) setTicket({ ...updated });
  };

  const handleUpdateDescription = (newDescription: string) => {
    if (!ticket) return;
    const updated = updateTicket(ticket.id, { description: newDescription });
    if (updated) setTicket({ ...updated });
  };

  const handleUpdateDueDate = (newDueDate: string | null) => {
    if (!ticket) return;
    const updated = updateTicket(ticket.id, { dueDate: newDueDate });
    if (updated) setTicket({ ...updated });
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!ticket) {
    return (
      <div className="max-w-4xl mx-auto py-16">
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
          <PersonaIcon personaId={activePersonaObj.id} size={24} />
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
              <CopyButton text={ticket.id} label={ticket.id} />
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
              {/* Priority badge */}
              {ticket.priority !== 4 && (
                <span className={`badge border ${PRIORITY_COLORS[ticket.priority]}`}>
                  {PRIORITY_LABELS[ticket.priority]}
                </span>
              )}
              {/* Tags — display pills with toggle editing */}
              {ticket.tags.map((tag) => (
                <TagChip key={tag.id} tag={tag} mode="display" />
              ))}
            </div>
            <EditableField
              value={ticket.title}
              onSave={handleUpdateTitle}
              label="Ticket title"
              type="input"
              placeholder="Enter ticket title"
              className="mb-3"
              displayClassName="text-2xl font-bold text-ink-primary"
            />
            <EditableField
              value={ticket.description}
              onSave={handleUpdateDescription}
              label="Ticket description"
              type="textarea"
              placeholder="Enter ticket description"
              className="text-ink-secondary leading-relaxed whitespace-pre-wrap"
            />
            <div className="flex items-center gap-4 mt-4 text-xs text-ink-muted">
              <span className="flex items-center gap-1" title={formatAbsoluteDate(ticket.createdAt)}>
                <Clock size={12} />
                Created {formatRelativeTime(ticket.createdAt)}
              </span>
              <span className="flex items-center gap-1" title={formatAbsoluteDate(ticket.updatedAt)}>
                <GitBranch size={12} />
                Updated {formatRelativeTime(ticket.updatedAt)}
              </span>
            </div>
            {/* Priority editor */}
            <div className="mt-4 pt-4 border-t border-border-subtle">
              <p className="text-xs font-medium text-ink-muted mb-2">Priority</p>
              <div className="flex gap-1.5">
                {([0, 1, 2, 3, 4] as PriorityLevel[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      const updated = updateTicketPriority(ticket.id, p);
                      if (updated) setTicket(updated);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      ticket.priority === p
                        ? `${PRIORITY_COLORS[p]} ring-1 ring-offset-1 ring-offset-gray-950`
                        : "border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600"
                    } ${p === 4 && ticket.priority !== 4 ? "opacity-50" : ""}`}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags editor */}
            <div className="mt-4 pt-4 border-t border-border-subtle">
              <p className="text-xs font-medium text-ink-muted mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_TAGS.map((tag) => (
                  <TagChip
                    key={tag.id}
                    tag={tag}
                    mode="toggle"
                    selected={ticket.tags.some((t) => t.id === tag.id)}
                    onToggle={(id) => {
                      const currentIds = ticket.tags.map((t) => t.id);
                      const newIds = currentIds.includes(id)
                        ? currentIds.filter((tid) => tid !== id)
                        : [...currentIds, id];
                      const newTags = PREDEFINED_TAGS.filter((t) => newIds.includes(t.id));
                      const updated = updateTicketTags(ticket.id, newTags);
                      if (updated) setTicket(updated);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Due date editor */}
            <div className="mt-4 pt-4 border-t border-border-subtle">
              <p className="text-xs font-medium text-ink-muted mb-2">Due Date</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={ticket.dueDate || ""}
                  onChange={(e) => handleUpdateDueDate(e.target.value || null)}
                  className="bg-elevated border border-border-visible rounded-lg px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent [color-scheme:dark]"
                />
                {ticket.dueDate && (
                  <button
                    type="button"
                    onClick={() => handleUpdateDueDate(null)}
                    className="px-3 py-2 text-sm text-ink-muted hover:text-ink-primary transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              {ticket.dueDate && (() => {
                const dl = formatDueDate(ticket.dueDate);
                return (
                  <span className={`inline-flex items-center gap-1.5 mt-1.5 text-xs ${dl.className}`}>
                    <Calendar size={12} />
                    {dl.label}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-start gap-2 flex-shrink-0">
            <div className="flex flex-col items-end gap-2">
              {/* Copy Link button */}
              <CopyButton
                label="Copy link to this ticket"
                icon="link"
              />

              {/* Start Prompt Session button */}
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

            {/* Delete button */}
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="p-2 rounded-lg text-ink-muted hover:text-cardinal hover:bg-cardinal/10 transition-colors"
              title="Delete ticket"
            >
              <Trash2 size={16} />
            </button>
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

      {/* Activity feed */}
      <div className="mb-6">
        <ActivityFeed ticket={ticket} />
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
        <EmptyState
          icon={FileQuestion}
          title="No Persona Selected"
          description="Choose a persona to join the session and provide feedback."
          className="opacity-60"
        />
      )}

      {/* Build Trigger — show when there's feedback or consensus status */}
      {(ticket.status === "in-review" || ticket.status === "consensus" || ticket.status === "building" || ticket.status === "done") && (
        <div className="mt-6">
          <BuildTrigger ticket={ticket} onBuildTriggered={() => loadTicket()} />
        </div>
      )}

      {/* Build Report Inline — show when a build report exists */}
      {ticket.buildReport && (
        <div className="mt-6">
          <BuildReportInline ticket={ticket} onBuildUpdated={() => loadTicket()} />
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
