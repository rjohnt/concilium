import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getTransportChannel } from "../realtime-transport";

/**
 * Deterministic test of the BroadcastChannel backend of the realtime transport
 * (the fallback used when Supabase isn't configured). A fake BroadcastChannel
 * registry delivers synchronously to sibling instances and excludes the sender
 * — matching real BroadcastChannel semantics — so we can assert the adapter's
 * fan-out, self-exclusion, multi-subscriber, and teardown behavior.
 *
 * Two transport channels on the same name model two browser tabs / two users.
 */

class FakeBroadcastChannel {
  static registry = new Map<string, Set<FakeBroadcastChannel>>();
  private listeners = new Set<(ev: { data: unknown }) => void>();
  closed = false;

  constructor(public name: string) {
    const set = FakeBroadcastChannel.registry.get(name) ?? new Set();
    set.add(this);
    FakeBroadcastChannel.registry.set(name, set);
  }
  postMessage(data: unknown) {
    for (const ch of FakeBroadcastChannel.registry.get(this.name) ?? []) {
      if (ch === this || ch.closed) continue; // sender never receives its own
      for (const l of ch.listeners) l({ data });
    }
  }
  addEventListener(_type: string, cb: (ev: { data: unknown }) => void) {
    this.listeners.add(cb);
  }
  removeEventListener(_type: string, cb: (ev: { data: unknown }) => void) {
    this.listeners.delete(cb);
  }
  close() {
    this.closed = true;
    FakeBroadcastChannel.registry.get(this.name)?.delete(this);
  }
  static reset() {
    FakeBroadcastChannel.registry.clear();
  }
}

beforeEach(() => {
  FakeBroadcastChannel.reset();
  vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel as unknown as typeof BroadcastChannel);
  // Ensure Supabase path is off so we exercise the BroadcastChannel backend.
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("realtime transport — BroadcastChannel backend", () => {
  it("uses the broadcast-channel backend when Supabase isn't configured", () => {
    const ch = getTransportChannel("t1");
    expect(ch.backend).toBe("broadcast-channel");
  });

  it("delivers a message from one peer to another on the same channel", () => {
    const a = getTransportChannel("room");
    const b = getTransportChannel("room");
    const received: unknown[] = [];
    b.onMessage((m) => received.push(m));

    a.send({ type: "hello", n: 1 });

    expect(received).toEqual([{ type: "hello", n: 1 }]);
  });

  it("does NOT echo a message back to the sender", () => {
    const a = getTransportChannel("room");
    const mine: unknown[] = [];
    a.onMessage((m) => mine.push(m));

    a.send({ type: "mine" });

    expect(mine).toEqual([]);
  });

  it("fans out to multiple subscribers/peers", () => {
    const a = getTransportChannel("room");
    const b = getTransportChannel("room");
    const c = getTransportChannel("room");
    const bMsgs: unknown[] = [];
    const cMsgs: unknown[] = [];
    b.onMessage((m) => bMsgs.push(m));
    c.onMessage((m) => cMsgs.push(m));

    a.send({ ping: true });

    expect(bMsgs).toEqual([{ ping: true }]);
    expect(cMsgs).toEqual([{ ping: true }]);
  });

  it("isolates channels with different names", () => {
    const a = getTransportChannel("room-A");
    const b = getTransportChannel("room-B");
    const bMsgs: unknown[] = [];
    b.onMessage((m) => bMsgs.push(m));

    a.send({ x: 1 });

    expect(bMsgs).toEqual([]);
  });

  it("unsubscribe stops delivery to that listener", () => {
    const a = getTransportChannel("room");
    const b = getTransportChannel("room");
    const msgs: unknown[] = [];
    const off = b.onMessage((m) => msgs.push(m));

    a.send({ k: 1 });
    off();
    a.send({ k: 2 });

    expect(msgs).toEqual([{ k: 1 }]);
  });

  it("close tears the peer down so it no longer receives", () => {
    const a = getTransportChannel("room");
    const b = getTransportChannel("room");
    const msgs: unknown[] = [];
    b.onMessage((m) => msgs.push(m));

    b.close();
    a.send({ after: "close" });

    expect(msgs).toEqual([]);
  });
});
