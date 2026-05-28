/**
 * feedback-stream.ts — Real-time feedback streaming for multiplayer prompt sessions.
 *
 * Uses BroadcastChannel to stream new feedback entries to all participants
 * in a prompt session in real-time. When one persona submits feedback,
 * everyone else in the session sees it appear instantly.
 *
 * This is the core "multiplayer" experience — the difference between
 * working alone in a room vs. collaborating around a shared whiteboard.
 */

const STREAM_CHANNEL = "concilium-feedback-stream";

// ── Types ──────────────────────────────────────────────────────────────────

export interface FeedbackStreamEvent {
  type: "feedback-submitted";
  feedbackEntry: {
    id: string;
    ticketId: string;
    personaId: string;
    content: string;
    createdAt: string;
    approved: boolean;
  };
  ticketSnapshot: {
    id: string;
    status: string;
    approvals: string[];
    approvalCount: number;
    totalPersonas: number;
  };
  timestamp: number;
}

export type FeedbackStreamListener = (event: FeedbackStreamEvent) => void;

// ── Broadcast Channel ──────────────────────────────────────────────────────

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!channel) {
    try {
      channel = new BroadcastChannel(STREAM_CHANNEL);
    } catch {
      return null;
    }
  }
  return channel;
}

// ── Listeners ───────────────────────────────────────────────────────────────

const listeners = new Set<FeedbackStreamListener>();

function handleIncomingEvent(event: MessageEvent<FeedbackStreamEvent>): void {
  if (!event.data || event.data.type !== "feedback-submitted") return;
  for (const listener of listeners) {
    try {
      listener(event.data);
    } catch {
      // Swallow individual listener errors
    }
  }
}

// Set up the channel listener once
const ch = getChannel();
if (ch) {
  ch.addEventListener("message", handleIncomingEvent);
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Broadcast a feedback submission to all participants in the session.
 * Call this after a feedback entry is persisted.
 */
export function broadcastFeedback(event: FeedbackStreamEvent): void {
  const ch = getChannel();
  if (ch) {
    ch.postMessage(event);
  }
  // Also deliver locally (the sending tab won't receive its own
  // BroadcastChannel message, but components need to react too)
  handleIncomingEvent({ data: event } as MessageEvent<FeedbackStreamEvent>);
}

/**
 * Subscribe to feedback stream events.
 * Returns an unsubscribe function.
 * The listener receives a FeedbackStreamEvent with the full feedback entry
 * and a ticket snapshot (status, approvals, etc.).
 */
export function onFeedbackStream(
  listener: FeedbackStreamListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
