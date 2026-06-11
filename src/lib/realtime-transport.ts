/**
 * realtime-transport.ts — Pub/sub transport for multiplayer features.
 *
 * Presents a small BroadcastChannel-like API (`send` / `onMessage` / `close`)
 * with two backends, chosen at runtime:
 *
 *   - Supabase Broadcast (when NEXT_PUBLIC_SUPABASE_* is configured) — real
 *     cross-USER realtime over a websocket. This is the upgrade BroadcastChannel
 *     never gave us: different people on different machines see each other.
 *   - BroadcastChannel fallback — cross-TAB only, same browser. Keeps dev and
 *     unconfigured environments working with zero infrastructure.
 *
 * Semantics match BroadcastChannel: a sender does NOT receive its own message
 * (Supabase `self: false`), so existing callers keep their own local-delivery
 * where they need the sending tab to react too.
 *
 * Browser-only — uses the anon Supabase client. Safe no-op on the server.
 */

import { createClient, isSupabaseConfigured } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type TransportMessage = Record<string, unknown>;
export type TransportListener = (message: TransportMessage) => void;

export interface TransportChannel {
  /** Broadcast a message to all other subscribers (not the sender). */
  send(message: TransportMessage): void;
  /** Subscribe to incoming messages. Returns an unsubscribe function. */
  onMessage(listener: TransportListener): () => void;
  /** Tear down the underlying channel. */
  close(): void;
  /** Which backend is in use — handy for diagnostics. */
  readonly backend: "supabase" | "broadcast-channel" | "none";
}

// All transport messages ride a single broadcast event name; the real
// discriminator is the message's own `type` field, exactly like the old
// BroadcastChannel payloads.
const BROADCAST_EVENT = "msg";

// ── Supabase backend ─────────────────────────────────────────────────────────

function createSupabaseChannel(name: string): TransportChannel {
  const listeners = new Set<TransportListener>();
  const supabase = createClient();
  // Namespace so it can't collide with Postgres-changes channels.
  const channel: RealtimeChannel = supabase.channel(`concilium:${name}`, {
    config: { broadcast: { self: false, ack: false } },
  });

  channel
    .on("broadcast", { event: BROADCAST_EVENT }, (payload) => {
      const message = (payload as { payload?: TransportMessage }).payload;
      if (!message) return;
      for (const listener of listeners) {
        try {
          listener(message);
        } catch {
          // Swallow individual listener errors
        }
      }
    })
    .subscribe();

  return {
    backend: "supabase",
    send(message) {
      // Fire-and-forget; if the socket isn't ready the message drops, which is
      // fine — DB state is the source of truth and is re-pulled on changes.
      void channel.send({ type: "broadcast", event: BROADCAST_EVENT, payload: message });
    },
    onMessage(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      listeners.clear();
      void supabase.removeChannel(channel);
    },
  };
}

// ── BroadcastChannel backend ─────────────────────────────────────────────────

function createBroadcastChannel(name: string): TransportChannel {
  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(`concilium:${name}`);
  } catch {
    bc = null;
  }

  if (!bc) return createNoopChannel();

  const wrappers = new Map<TransportListener, (e: MessageEvent) => void>();

  return {
    backend: "broadcast-channel",
    send(message) {
      bc!.postMessage(message);
    },
    onMessage(listener) {
      const wrapper = (event: MessageEvent) => {
        if (event.data && typeof event.data === "object") {
          listener(event.data as TransportMessage);
        }
      };
      wrappers.set(listener, wrapper);
      bc!.addEventListener("message", wrapper);
      return () => {
        const w = wrappers.get(listener);
        if (w) bc!.removeEventListener("message", w);
        wrappers.delete(listener);
      };
    },
    close() {
      wrappers.clear();
      bc!.close();
    },
  };
}

// ── No-op backend (SSR / unsupported) ────────────────────────────────────────

function createNoopChannel(): TransportChannel {
  return {
    backend: "none",
    send() {},
    onMessage() {
      return () => {};
    },
    close() {},
  };
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Get a transport channel by logical name. Backends are chosen per call but
 * callers typically memoize one channel per feature (see session-presence,
 * feedback-stream, crossTabSync).
 */
export function getTransportChannel(name: string): TransportChannel {
  if (typeof window === "undefined") return createNoopChannel();
  if (isSupabaseConfigured()) return createSupabaseChannel(name);
  return createBroadcastChannel(name);
}
