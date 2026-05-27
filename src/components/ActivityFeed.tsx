"use client";

import { useMemo } from "react";
import { Ticket, FeedbackEntry, PersonaId } from "@/lib/types";
import { getPersona } from "@/lib/personas";
import {
  PlusCircle,
  MessageSquare,
  CheckCircle,
  XCircle,
  ArrowRight,
  Hammer,
  CheckCheck,
  AlertTriangle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Activity item type – derived from ticket data, no backend needed
// ---------------------------------------------------------------------------

export interface ActivityItem {
  id: string;
  timestamp: string; // ISO string
  type:
    | "created"
    | "feedback"
    | "approval"
    | "approval-withdrawn"
    | "status-change"
    | "build-triggered"
    | "build-completed"
    | "build-failed";
  actor?: PersonaId;
  description: string;
  /** The raw feedback entry for feedback/approval items */
  feedbackEntry?: FeedbackEntry;
  /** The status we transitioned TO for status-change items */
  newStatus?: string;
}

// ---------------------------------------------------------------------------
// Helper: relative time
// ---------------------------------------------------------------------------

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 604800;
const MONTH = 2592000;

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 0) return "just now";
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return `${m}m ago`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `${h}h ago`;
  }
  if (diff < WEEK) {
    const d = Math.floor(diff / DAY);
    return `${d}d ago`;
  }
  if (diff < MONTH) {
    const w = Math.floor(diff / WEEK);
    return `${w}w ago`;
  }
  return new Date(iso).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Derive activity items from a ticket object
// ---------------------------------------------------------------------------

function deriveActivity(ticket: Ticket): ActivityItem[] {
  const items: ActivityItem[] = [];

  // 1) Ticket created
  items.push({
    id: `created-${ticket.id}`,
    timestamp: ticket.createdAt,
    type: "created",
    description: "Ticket created",
  });

  // 2) Feedback entries → feedback submitted + approval events
  // Keep track of when each persona first approved to detect approval events
  const approvalSeen = new Set<string>();

  for (const fb of ticket.feedback) {
    const persona = getPersona(fb.personaId);

    // Feedback submitted
    items.push({
      id: `feedback-${fb.id}`,
      timestamp: fb.createdAt,
      type: "feedback",
      actor: fb.personaId,
      description: `${persona.emoji} ${persona.label} submitted feedback`,
      feedbackEntry: fb,
    });

    // Approval event
    if (fb.approved) {
      const key = fb.personaId;
      if (!approvalSeen.has(key)) {
        approvalSeen.add(key);
        items.push({
          id: `approval-${fb.id}`,
          timestamp: fb.createdAt,
          type: "approval",
          actor: fb.personaId,
          description: `${persona.emoji} ${persona.label} approved the ticket`,
          feedbackEntry: fb,
        });
      }
    } else {
      // If they previously approved, withdrawing approval
      const key = `unapprove-${fb.personaId}`;
      if (approvalSeen.has(fb.personaId)) {
        items.push({
          id: `approval-withdrawn-${fb.id}`,
          timestamp: fb.createdAt,
          type: "approval-withdrawn",
          actor: fb.personaId,
          description: `${persona.emoji} ${persona.label} withdrew approval`,
          feedbackEntry: fb,
        });
      }
    }
  }

  // 3) Status transition events (inferred)
  // Status transitions: draft → in-review, in-review → consensus, consensus → building, building → done
  const transitions: { from: string; to: string }[] = [];

  if (ticket.feedback.length > 0 && ticket.status !== "draft") {
    // in-review was reached (happened at first feedback)
    transitions.push({ from: "draft", to: "in-review" });
  }

  if (
    (ticket.status === "consensus" ||
      ticket.status === "building" ||
      ticket.status === "done") &&
    ticket.approvals.length >= 3
  ) {
    transitions.push({ from: "in-review", to: "consensus" });
  }

  if (
    (ticket.status === "building" || ticket.status === "done") &&
    ticket.buildReport
  ) {
    transitions.push({ from: "consensus", to: "building" });
  }

  if (ticket.status === "done") {
    transitions.push({ from: "building", to: "done" });
  }

  for (let i = 0; i < transitions.length; i++) {
    const t = transitions[i];
    // Use the last feedback timestamp or ticket update time as a proxy
    const ts =
      i === 0 && ticket.feedback.length > 0
        ? ticket.feedback[0].createdAt
        : ticket.buildReport?.createdAt || ticket.updatedAt;

    items.push({
      id: `status-${t.from}-${t.to}-${ticket.id}`,
      timestamp: i < transitions.length - 1 ? ts : ticket.updatedAt,
      type: "status-change",
      description: `Status changed: ${t.from} → ${t.to}`,
      newStatus: t.to,
    });
  }

  // 4) Build events
  if (ticket.buildReport) {
    const br = ticket.buildReport;
    items.push({
      id: `build-triggered-${br.id}`,
      timestamp: br.createdAt,
      type: "build-triggered",
      description: "Build triggered",
    });

    if (br.status === "completed") {
      items.push({
        id: `build-completed-${br.id}`,
        timestamp: br.completedAt || br.createdAt,
        type: "build-completed",
        description: "Build completed successfully",
      });
    } else if (br.status === "failed") {
      items.push({
        id: `build-failed-${br.id}`,
        timestamp: br.completedAt || br.createdAt,
        type: "build-failed",
        description: "Build failed",
      });
    }
  }

  // Sort by timestamp
  items.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return items;
}

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const iconMap: Record<
  ActivityItem["type"],
  { Icon: typeof PlusCircle; color: string; bg: string }
> = {
  created: {
    Icon: PlusCircle,
    color: "text-blue-400",
    bg: "bg-blue-900/40",
  },
  feedback: {
    Icon: MessageSquare,
    color: "text-purple-400",
    bg: "bg-purple-900/40",
  },
  approval: {
    Icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-900/40",
  },
  "approval-withdrawn": {
    Icon: XCircle,
    color: "text-amber-400",
    bg: "bg-amber-900/40",
  },
  "status-change": {
    Icon: ArrowRight,
    color: "text-gold-light",
    bg: "bg-gold-dim/30",
  },
  "build-triggered": {
    Icon: Hammer,
    color: "text-blue-steel",
    bg: "bg-blue-steel/20",
  },
  "build-completed": {
    Icon: CheckCheck,
    color: "text-emerald-400",
    bg: "bg-emerald-900/40",
  },
  "build-failed": {
    Icon: AlertTriangle,
    color: "text-cardinal",
    bg: "bg-cardinal/20",
  },
};

// ---------------------------------------------------------------------------
// Date grouping helper
// ---------------------------------------------------------------------------

function formatDateHeader(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ActivityFeedProps {
  ticket: Ticket;
}

export function ActivityFeed({ ticket }: ActivityFeedProps) {
  const activities = useMemo(() => {
    // Reverse chronological (newest first)
    return deriveActivity(ticket).reverse();
  }, [ticket]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { date: string; items: ActivityItem[] }[] = [];
    for (const item of activities) {
      const header = formatDateHeader(item.timestamp);
      const last = groups[groups.length - 1];
      if (last && last.date === header) {
        last.items.push(item);
      } else {
        groups.push({ date: header, items: [item] });
      }
    }
    return groups;
  }, [activities]);

  if (activities.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-ink-primary uppercase tracking-wider mb-4">
          Activity
        </h3>
        <p className="text-sm text-ink-muted text-center py-8">
          No activity recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-ink-primary uppercase tracking-wider">
          Activity
        </h3>
        <span className="text-xs text-ink-muted">
          {activities.length} event{activities.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.date}>
            {/* Date header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-medium text-ink-muted uppercase tracking-wider">
                {group.date}
              </span>
              <div className="flex-1 h-px bg-border-subtle" />
            </div>

            {/* Timeline */}
            <div className="relative pl-8 space-y-0">
              {group.items.map((item, idx) => {
                const {
                  Icon: IconComponent,
                  color,
                  bg,
                } = iconMap[item.type];
                const isLast = idx === group.items.length - 1;

                return (
                  <div key={item.id} className="relative pb-4 last:pb-0">
                    {/* Vertical line */}
                    {!isLast && (
                      <div
                        className="absolute left-[-1.5rem] top-8 w-px h-full bg-border-subtle"
                        style={{ height: "calc(100% - 0.5rem)" }}
                      />
                    )}

                    {/* Icon circle */}
                    <div
                      className={`absolute left-[-2rem] top-0.5 flex items-center justify-center w-7 h-7 rounded-full ${bg} ring-2 ring-raised`}
                    >
                      <IconComponent size={13} className={color} />
                    </div>

                    {/* Content */}
                    <div className="space-y-0.5">
                      <p className="text-sm text-ink-primary leading-relaxed">
                        {item.description}
                      </p>
                      <span className="text-xs text-ink-muted">
                        {relativeTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
