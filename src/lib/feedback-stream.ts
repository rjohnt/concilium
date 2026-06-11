/**
 * feedback-stream.ts — Real-time feedback streaming for multiplayer prompt sessions.
 *
 * Rides the realtime transport (Supabase Broadcast when configured, else
 * BroadcastChannel) to stream new feedback entries to all participants in a
 * session in real-time. When one persona submits feedback, everyone else —
 * including other users — sees it appear instantly.
 *
 * This is the core "multiplayer" experience — the difference between
 * working alone in a room vs. collaborating around a shared whiteboard.
 */

import { getTransportChannel, type TransportChannel } from "./realtime-transport";

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
    source?: string;
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

// ── Transport ───────────────────────────────────────────────────────────────

let channel: TransportChannel | null = null;

function getChannel(): TransportChannel | null {
  if (typeof window === "undefined") return null;
  if (!channel) {
    channel = getTransportChannel("feedback-stream");
    channel.onMessage((message) => dispatchLocally(message as unknown as FeedbackStreamEvent));
  }
  return channel;
}

// ── Listeners ───────────────────────────────────────────────────────────────

const listeners = new Set<FeedbackStreamListener>();

function dispatchLocally(event: FeedbackStreamEvent): void {
  if (!event || event.type !== "feedback-submitted") return;
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Swallow individual listener errors
    }
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Broadcast a feedback submission to all participants in the session.
 * Call this after a feedback entry is persisted.
 */
export function broadcastFeedback(event: FeedbackStreamEvent): void {
  const ch = getChannel();
  if (ch) {
    ch.send(event as unknown as Record<string, unknown>);
  }
  // Also deliver locally — the sending tab does not receive its own
  // transport message, but its components still need to react.
  dispatchLocally(event);
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
  // Ensure the transport channel + its incoming-message wiring exist, so a
  // tab that only subscribes (never broadcasts) still receives events.
  getChannel();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
