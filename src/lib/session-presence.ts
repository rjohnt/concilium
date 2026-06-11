/**
 * session-presence.ts — Real-time session presence for multiplayer prompt sessions.
 *
 * Rides the realtime transport (Supabase Broadcast when configured, else
 * BroadcastChannel) to share presence across tabs and users. Each client gets
 * a persistent UUID stored in localStorage. When a user joins a session, they
 * broadcast their presence and listen for others.
 *
 * Heartbeat mechanism: re-broadcast every 30s. Clients >60s stale are pruned.
 */

import { getTransportChannel, type TransportChannel, type TransportMessage } from "./realtime-transport";

const CLIENT_ID_KEY = "concilium-client-id";
const HEARTBEAT_INTERVAL = 30_000; // 30s
const STALE_TIMEOUT = 60_000; // 60s

// ── Types ──────────────────────────────────────────────────────────────────

export interface PresenceMessage {
  type: "join" | "leave" | "heartbeat";
  clientId: string;
  ticketId: string;
  personaId: string;
  timestamp: number;
  label?: string;
}

export interface Participant {
  clientId: string;
  ticketId: string;
  personaId: string;
  label: string;
  joinedAt: number;
  lastHeartbeat: number;
}

export type PresenceListener = (participants: Participant[]) => void;

// ── Client ID (persistent) ──────────────────────────────────────────────────

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Fallback when localStorage is unavailable (private mode, restricted envs)
let inMemoryClientId: string | null = null;

export function getClientId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    if (!inMemoryClientId) {
      inMemoryClientId = generateUUID();
    }
    return inMemoryClientId;
  }
}

// ── Presence Channel ────────────────────────────────────────────────────────

let channel: TransportChannel | null = null;

function getChannel(): TransportChannel | null {
  if (typeof window === "undefined") return null;
  if (!channel) {
    channel = getTransportChannel("presence");
  }
  return channel;
}

function sendPresence(ch: TransportChannel | null, msg: PresenceMessage): void {
  ch?.send(msg as unknown as TransportMessage);
}

// ── Presence State ──────────────────────────────────────────────────────────

const participants = new Map<string, Participant>();
const listeners = new Set<PresenceListener>();
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let ownPresence: { ticketId: string; personaId: string; label: string } | null =
  null;

function notifyListeners(): void {
  const snapshot = Array.from(participants.values());
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch {
      // Swallow individual listener errors
    }
  }
}

function pruneStaleParticipants(): boolean {
  const now = Date.now();
  let changed = false;
  for (const [id, p] of participants) {
    if (now - p.lastHeartbeat > STALE_TIMEOUT) {
      participants.delete(id);
      changed = true;
    }
  }
  return changed;
}

function handleMessage(msg: PresenceMessage): void {
  const now = Date.now();

  if (msg.type === "leave") {
    participants.delete(msg.clientId);
    notifyListeners();
    return;
  }

  if (msg.type === "join" || msg.type === "heartbeat") {
    participants.set(msg.clientId, {
      clientId: msg.clientId,
      ticketId: msg.ticketId,
      personaId: msg.personaId,
      label: msg.label || msg.personaId,
      joinedAt:
        msg.type === "join" ? msg.timestamp : (participants.get(msg.clientId)?.joinedAt ?? msg.timestamp),
      lastHeartbeat: now,
    });
    // Skip stale participants
    pruneStaleParticipants();
    notifyListeners();
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Join a prompt session. Broadcasts presence and starts heartbeat.
 * Call when user enters a prompt page and picks a persona.
 * Returns a cleanup function.
 */
export function joinSession(
  ticketId: string,
  personaId: string,
  label?: string,
): () => void {
  const clientId = getClientId();
  const ch = getChannel();
  ownPresence = { ticketId, personaId, label: label || personaId };

  // Broadcast join
  const joinMsg: PresenceMessage = {
    type: "join",
    clientId,
    ticketId,
    personaId,
    label: label || personaId,
    timestamp: Date.now(),
  };
  sendPresence(ch, joinMsg);
  handleMessage(joinMsg);

  // Start heartbeat
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    if (!ownPresence) return;
    const hb: PresenceMessage = {
      type: "heartbeat",
      clientId,
      ticketId: ownPresence.ticketId,
      personaId: ownPresence.personaId,
      label: ownPresence.label,
      timestamp: Date.now(),
    };
    sendPresence(ch, hb);
    // Also prune on heartbeat
    if (pruneStaleParticipants()) {
      notifyListeners();
    }
  }, HEARTBEAT_INTERVAL);

  // Listen for others (the transport never echoes our own messages, but keep
  // the clientId guard as belt-and-suspenders)
  const unsubscribe = ch?.onMessage((message) => {
    const msg = message as unknown as PresenceMessage;
    if (msg && msg.type && msg.clientId !== clientId) {
      handleMessage(msg);
    }
  });

  // Return cleanup function
  return () => {
    cleanUp(ch, clientId, unsubscribe);
  };
}

function cleanUp(
  ch: TransportChannel | null,
  clientId: string,
  unsubscribe: (() => void) | undefined,
): void {
  // Broadcast leave
  if (ownPresence) {
    const leaveMsg: PresenceMessage = {
      type: "leave",
      clientId,
      ticketId: ownPresence.ticketId,
      personaId: ownPresence.personaId,
      label: ownPresence.label,
      timestamp: Date.now(),
    };
    sendPresence(ch, leaveMsg);
    handleMessage(leaveMsg);
  }
  ownPresence = null;

  // Stop heartbeat
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  // Remove listener
  unsubscribe?.();
}

/**
 * Subscribe to presence changes. Returns unsubscribe function.
 */
export function onPresenceChange(
  listener: PresenceListener,
): () => void {
  listeners.add(listener);
  // Send current state immediately
  const snapshot = Array.from(participants.values());
  if (snapshot.length > 0) {
    try {
      listener(snapshot);
    } catch {
      // noop
    }
  }
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Get current participants for a specific ticket.
 */
export function getParticipants(ticketId: string): Participant[] {
  return Array.from(participants.values()).filter(
    (p) => p.ticketId === ticketId,
  );
}

/**
 * Update own persona (when user switches personas in a session).
 */
export function updateOwnPersona(
  ticketId: string,
  newPersonaId: string,
  label?: string,
): void {
  const clientId = getClientId();
  const ch = getChannel();
  ownPresence = { ticketId, personaId: newPersonaId, label: label || newPersonaId };

  // Broadcast as a heartbeat with updated persona
  const msg: PresenceMessage = {
    type: "heartbeat",
    clientId,
    ticketId,
    personaId: newPersonaId,
    label: label || newPersonaId,
    timestamp: Date.now(),
  };
  sendPresence(ch, msg);
  handleMessage(msg);
}

/**
 * Get which personas are currently claimed in a session.
 */
export function getClaimedPersonas(ticketId: string): string[] {
  return Array.from(participants.values())
    .filter((p) => p.ticketId === ticketId)
    .map((p) => p.personaId);
}
