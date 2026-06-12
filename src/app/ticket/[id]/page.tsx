"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Ticket, PersonaId, Seat, PRIORITY_LABELS, PRIORITY_COLORS, PriorityLevel, PREDEFINED_TAGS, TicketStatus } from "@/lib/types";
import { seedData, getTicket, deleteTicket, updateTicket, updateTicketPriority, updateTicketTags, updateTicketStatus, retryBuild, createTicket, getSeats, claimSeat, releaseSeat } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { getClientId } from "@/lib/session-presence";
import { validateTransition } from "@/lib/status-machine";
import { formatDueDate } from "@/lib/date-utils";
import { getPersona } from "@/lib/personas";
import { formatRelativeTime, formatAbsoluteDate } from "@/lib/timeAgo";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { BuildTrigger } from "@/components/BuildTrigger";
import { BuildReportInline } from "@/components/BuildReportInline";
import { BuildIterationPanel } from "@/components/BuildIterationPanel";
import { PersonaBadge } from "@/components/PersonaBadge";
import { JoinSessionModal } from "@/components/JoinSessionModal";
import { CopyButton } from "@/components/CopyButton";
import { CouncilTable } from "@/components/CouncilTable";
import { DetailSkeleton } from "@/components/Skeleton";
import { DeleteTicketDialog } from "@/components/DeleteTicketDialog";
import { ActivityFeed } from "@/components/ActivityFeed";
import { EditableField } from "@/components/EditableField";
import { TagChip } from "@/components/TagChip";
import { EmptyState } from "@/components/EmptyState";
import { Clock, GitBranch, RefreshCw, Sparkles, Trash2, FileQuestion, Calendar, Users, ChevronDown, Check, Share2, MoreHorizontal, Link2 } from "lucide-react";
import { PersonaIcon } from "@/components/PersonaIcon";
import Link from "next/link";
import { useToast } from "@/components/Toast";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const { user, loading: authLoading, displayName, preferredRole, saveRole } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  // Session state
  const [sessionPersona, setSessionPersona] = useState<PersonaId | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [seats, setSeats] = useState<Record<PersonaId, Seat> | undefined>(undefined);

  // Seats are claimed under the account id when signed in, falling back to
  // the anonymous per-browser id.
  const seatId = user?.id ?? getClientId();
  const humanLabel = displayName ?? "Human";

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Status dropdown state
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Actions overflow menu state
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Click outside to close status dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setShowStatusDropdown(false);
      }
    };
    if (showStatusDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showStatusDropdown]);

  // Click outside to close the actions overflow menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setShowActionsMenu(false);
      }
    };
    if (showActionsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActionsMenu]);

  const copyToClipboard = useCallback(
    (text: string, title: string, description?: string) => {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
      navigator.clipboard.writeText(text).then(
        () => addToast({ variant: "success", title, description }),
        () => addToast({ variant: "error", title: "Couldn't copy link" })
      );
    },
    [addToast]
  );

  const handleStatusChange = (newStatus: TicketStatus) => {
    if (!ticket) return;
    const updated = updateTicketStatus(ticket.id, newStatus);
    if (updated) {
      setTicket({ ...updated });
      setShowStatusDropdown(false);
    } else {
      addToast({
        variant: "error",
        title: "Invalid transition",
        description: `Cannot move from "${ticket.status}" to "${newStatus}".`,
      });
    }
  };

  const loadTicket = useCallback(() => {
    seedData();
    const t = getTicket(params.id as string);
    setTicket(t || null);
    setSeats(getSeats(params.id as string));
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Listen for cross-tab/same-tab ticket updates and refresh
  useEffect(() => {
    const handler = () => {
      const t = getTicket(params.id as string);
      if (t) {
        setTicket(t);
        setSeats(getSeats(params.id as string));
      } else {
        // Ticket was deleted — redirect to dashboard
        router.push("/");
      }
    };
    window.addEventListener("tickets-changed", handler);
    return () => window.removeEventListener("tickets-changed", handler);
  }, [params.id, router]);

  // Resume a seat you already hold on this ticket — your role follows you in
  // without re-picking. Waits for auth so account-claimed seats are recognized.
  useEffect(() => {
    if (loading || authLoading || sessionPersona || !ticket || !seats) return;
    const mine = Object.values(seats).find(
      (s) => s.occupant === "human" && s.claimedBy === seatId
    );
    if (mine) {
      setSessionPersona(mine.personaId);
      setShowJoinModal(false);
    }
  }, [loading, authLoading, sessionPersona, ticket, seats, seatId]);

  // After ticket loads, show the join modal if no session is active
  useEffect(() => {
    if (!loading && !authLoading && ticket && !sessionPersona && !showJoinModal) {
      // Small delay for cinematic entrance after page load
      const timer = setTimeout(() => setShowJoinModal(true), 400);
      return () => clearTimeout(timer);
    }
  }, [loading, authLoading, ticket, sessionPersona, showJoinModal]);

  const handleJoinSession = (personaId: PersonaId) => {
    const ticketId = params.id as string;
    // Hand any previously held seat back to its AI stand-in, then claim the new one
    if (sessionPersona && sessionPersona !== personaId) {
      releaseSeat(ticketId, sessionPersona, seatId);
    }
    claimSeat(ticketId, personaId, seatId, humanLabel);
    saveRole(personaId);
    setSeats(getSeats(ticketId));
    setSessionPersona(personaId);
    setShowJoinModal(false);
  };

  const handleSwitchPersona = () => {
    setShowJoinModal(true);
  };

  const handleDeleteConfirm = () => {
    if (!ticket) return;
    // Save snapshot for undo
    const snapshot = { ...ticket };
    const success = deleteTicket(ticket.id);
    if (success) {
      addToast({
        variant: "error",
        title: "Ticket deleted",
        description: `"${snapshot.title}" has been deleted.`,
        action: {
          label: "Undo",
          onClick: () => {
            createTicket(
              snapshot.title,
              snapshot.description,
              snapshot.priority as PriorityLevel,
              snapshot.dueDate || undefined,
              snapshot.tags
            );
            addToast({
              variant: "success",
              title: "Ticket restored",
              description: `"${snapshot.title}" has been restored.`,
            });
          },
        },
      });
      router.push("/");
    }
  };

  const handleRetryBuild = async () => {
    if (!ticket) return;
    await retryBuild(ticket.id);
    loadTicket();
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

  const handleUpdateBranchOverride = (newBranch: string | null) => {
    if (!ticket) return;
    const trimmed = newBranch?.trim() || null;
    if ((ticket.branchOverride ?? null) === trimmed) return;
    const updated = updateTicket(ticket.id, { branchOverride: trimmed });
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
      {/* Join Session Modal — single instance with mode prop */}
      <JoinSessionModal
        isOpen={showJoinModal}
        onJoin={handleJoinSession}
        mode={sessionPersona ? "switch" : "initial"}
        seats={seats}
        clientId={seatId}
        preferredRole={preferredRole}
      />

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
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="text-sm font-mono text-ink-muted">
                {ticket.id}
              </span>
              <CopyButton text={ticket.id} label={ticket.id} />
              {/* Status dropdown — DS cc-badge tones */}
              <div className="relative" ref={statusDropdownRef}>
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="cc-badge cursor-pointer"
                  style={
                    ticket.status === "draft" ? { background: "var(--warm-150)", color: "var(--ink-700)" } :
                    ticket.status === "in-review" ? { background: "var(--warning-100)", color: "#8A5A12" } :
                    ticket.status === "consensus" ? { background: "var(--success-100)", color: "#1B6B4A" } :
                    ticket.status === "building" ? { background: "var(--info-100)", color: "#185FA5" } :
                    { background: "var(--success-100)", color: "#1B6B4A" }
                  }
                >
                  <span className="cc-badge__dot" />
                  {ticket.status === "draft" ? "Draft" :
                   ticket.status === "in-review" ? "In review" :
                   ticket.status === "consensus" ? "Consensus" :
                   ticket.status === "building" ? "Building" :
                   "Done"}
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>

                {showStatusDropdown && (
                  <div className="absolute top-full mt-1 left-0 z-50 py-1 min-w-[160px]"
                    style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)" }}
                  >
                    {(["draft", "in-review", "consensus", "building", "done"] as TicketStatus[]).map((s) => {
                      const isValid = validateTransition(ticket.status, s);
                      const isCurrent = ticket.status === s;
                      return (
                        <button
                          key={s}
                          disabled={!isValid && !isCurrent}
                          onClick={() => isValid && handleStatusChange(s)}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                            isCurrent ? "bg-[var(--coral-50)] text-[var(--coral-700)] font-semibold" :
                            isValid ? "text-[var(--ink-900)] hover:bg-[var(--bg-hover)] cursor-pointer" :
                            "text-[var(--text-faint)] opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <span>
                            {s === "draft" ? "Draft" :
                             s === "in-review" ? "In review" :
                             s === "consensus" ? "Consensus" :
                             s === "building" ? "Building" :
                             "Done"}
                          </span>
                          {isCurrent && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
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
              displayClassName="text-2xl font-bold text-ink-primary font-display tracking-[-0.02em]"
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
                        ? `${PRIORITY_COLORS[p]} ring-1 ring-offset-1 ring-offset-[var(--bg-app)]`
                        : "border-[var(--border-subtle)] text-ink-500 hover:text-ink-900 hover:border-[var(--border-strong)]"
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
                  className="bg-elevated border border-border-visible rounded-lg px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent [color-scheme:light]"
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

            {/* Build branch override */}
            <div className="mt-4 pt-4 border-t border-border-subtle">
              <p className="text-xs font-medium text-ink-muted mb-2">Build Branch</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  key={ticket.branchOverride ?? ""}
                  defaultValue={ticket.branchOverride ?? ""}
                  placeholder="Project default"
                  aria-label="Build branch override"
                  onBlur={(e) => handleUpdateBranchOverride(e.target.value || null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="bg-elevated border border-border-visible rounded-lg px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono"
                />
                {ticket.branchOverride && (
                  <button
                    type="button"
                    onClick={() => handleUpdateBranchOverride(null)}
                    className="px-3 py-2 text-sm text-ink-muted hover:text-ink-primary transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">
                {ticket.branchOverride
                  ? "Builds for this ticket target this branch."
                  : "Leave empty to build on the project's default branch."}
              </p>
            </div>
          </div>

          {/* Actions — primary action up front, the rest in an overflow menu */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Primary: start a prompt session */}
            <Link
              href={`/prompt/${ticket.id}`}
              className="btn-primary whitespace-nowrap"
              title="Open full-screen prompt session"
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">Prompt Session</span>
            </Link>

            {/* Overflow menu: copy links, consensus room, delete */}
            <div className="relative" ref={actionsMenuRef}>
              <button
                onClick={() => setShowActionsMenu((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={showActionsMenu}
                className="p-2 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-elevated transition-colors"
                title="More actions"
              >
                <MoreHorizontal size={18} />
              </button>
              {showActionsMenu && (
                <div
                  role="menu"
                  className="absolute right-0 mt-1 w-60 py-1 z-30"
                  style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)" }}
                >
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowActionsMenu(false);
                      if (typeof window !== "undefined") {
                        copyToClipboard(window.location.href, "Link copied");
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-ink-secondary hover:bg-elevated hover:text-ink-primary transition-colors"
                  >
                    <Link2 size={15} className="text-ink-muted" />
                    Copy link to ticket
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowActionsMenu(false);
                      const origin = typeof window !== "undefined" ? window.location.origin : "";
                      copyToClipboard(
                        `${origin}/share/${ticket.id}`,
                        "Public link copied",
                        "Anyone can view this council — no sign-in needed."
                      );
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-ink-secondary hover:bg-elevated hover:text-ink-primary transition-colors"
                  >
                    <Share2 size={15} className="text-ink-muted" />
                    Copy public share link
                  </button>
                  <Link
                    role="menuitem"
                    href={`/consensus/${ticket.id}`}
                    onClick={() => setShowActionsMenu(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-ink-secondary hover:bg-elevated hover:text-ink-primary transition-colors"
                  >
                    <Users size={15} className="text-ink-muted" />
                    Open consensus room
                  </Link>
                  <div className="my-1 border-t border-border-subtle" />
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowActionsMenu(false);
                      setShowDeleteDialog(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-[var(--danger-500)] hover:bg-[var(--danger-100)] transition-colors"
                  >
                    <Trash2 size={15} />
                    Delete ticket
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Council table — who holds each seat and where they stand */}
      <div className="card mb-6">
        <CouncilTable ticket={ticket} />
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

      {/* Build Report Inline — show when building or a build report exists */}
      {(ticket.status === "building" || ticket.buildReport) && (
        <div className="mt-6">
          <BuildReportInline
            ticket={ticket}
            onBuildUpdated={() => loadTicket()}
            onRetry={handleRetryBuild}
          />
        </div>
      )}

      {/* Build review loop — artifacts, change requests, rebuild */}
      {ticket.buildReport && ticket.buildReport.status !== "building" && (
        <div className="mt-6">
          <BuildIterationPanel
            ticket={ticket}
            activePersona={sessionPersona}
            onUpdated={() => loadTicket()}
          />
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
