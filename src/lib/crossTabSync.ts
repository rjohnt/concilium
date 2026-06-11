/**
 * crossTabSync.ts — Ticket-mutation fan-out across tabs and users.
 *
 * Rides the realtime transport (Supabase Broadcast when configured, else
 * BroadcastChannel), so a write in one session is signalled to every other
 * open session — same browser or another user's machine.
 */

import { getTransportChannel, type TransportChannel } from "./realtime-transport";

let channel: TransportChannel | null = null;

function getChannel(): TransportChannel | null {
  if (typeof window === "undefined") return null;
  if (!channel) {
    channel = getTransportChannel("sync");
  }
  return channel;
}

export interface TicketUpdateMessage {
  type: "ticket-update";
  ticketId: string;
  action: string;
  timestamp: number;
}

/**
 * Broadcast a ticket mutation to all other tabs/users.
 * Called from the store after persistState().
 */
export function broadcastTicketUpdate(
  ticketId: string,
  action: string,
): void {
  const ch = getChannel();
  if (!ch) return;
  const msg: TicketUpdateMessage = {
    type: "ticket-update",
    ticketId,
    action,
    timestamp: Date.now(),
  };
  ch.send(msg as unknown as Record<string, unknown>);
}

/**
 * Subscribe to ticket updates from other tabs/users.
 * Returns an unsubscribe function.
 */
export function onTicketUpdate(
  callback: (data: TicketUpdateMessage) => void,
): () => void {
  const ch = getChannel();
  if (!ch) return () => {};

  return ch.onMessage((message) => {
    const msg = message as unknown as TicketUpdateMessage;
    if (msg?.type === "ticket-update") {
      callback(msg);
    }
  });
}

/**
 * Broadcast that ALL state changed (e.g. seed data, clear storage).
 */
export function broadcastFullSync(): void {
  const ch = getChannel();
  if (!ch) return;
  ch.send({
    type: "ticket-update",
    ticketId: "*",
    action: "full-sync",
    timestamp: Date.now(),
  } as Record<string, unknown>);
}
