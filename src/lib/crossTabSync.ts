const CHANNEL_NAME = "concilium-sync";

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!channel) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      // BroadcastChannel not supported (e.g. older browsers) —
      // cross-tab sync will fall back to the existing storage event.
      return null;
    }
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
 * Broadcast a ticket mutation to all other tabs (and the current tab).
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
  ch.postMessage(msg);
}

/**
 * Subscribe to ticket updates from other tabs.
 * Returns an unsubscribe function.
 */
export function onTicketUpdate(
  callback: (data: TicketUpdateMessage) => void,
): () => void {
  const ch = getChannel();
  if (!ch) return () => {};

  const handler = (event: MessageEvent<TicketUpdateMessage>) => {
    if (event.data?.type === "ticket-update") {
      callback(event.data);
    }
  };

  ch.addEventListener("message", handler);
  return () => ch.removeEventListener("message", handler);
}

/**
 * Broadcast that ALL state changed (e.g. seed data, clear storage).
 */
export function broadcastFullSync(): void {
  const ch = getChannel();
  if (!ch) return;
  ch.postMessage({
    type: "ticket-update",
    ticketId: "*",
    action: "full-sync",
    timestamp: Date.now(),
  });
}
