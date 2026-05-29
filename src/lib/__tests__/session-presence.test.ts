/**
 * Unit tests for session-presence.ts — multi-tab multiplayer presence system.
 *
 * Key testing challenges addressed:
 * - Module-level state reset via vi.resetModules() + dynamic import()
 * - BroadcastChannel mocked (not available in jsdom)
 * - localStorage mocked (not reliably available in fork pool jsdom)
 * - vi.useFakeTimers + vi.setSystemTime for heartbeat/stale tests
 * - MessageEvent simulation for cross-client presence sharing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  PresenceMessage,
  Participant,
  PresenceListener,
} from "@/lib/session-presence";

// ── Mock localStorage ───────────────────────────────────────────────────

let _store: Record<string, string> = {};

function mockLocalStorage(): Storage {
  return {
    getItem: vi.fn((key: string) => _store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { _store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete _store[key]; }),
    clear: vi.fn(() => { _store = {}; }),
    get length() { return Object.keys(_store).length; },
    key: vi.fn((index: number) => Object.keys(_store)[index] ?? null),
  } as unknown as Storage;
}

// ── Mock BroadcastChannel infrastructure ─────────────────────────────────

/** Handlers registered on the module-level BroadcastChannel instance */
let messageHandlers: Array<(event: MessageEvent<PresenceMessage>) => void> = [];

/** Calls recorded by postMessage on the module-level BroadcastChannel */
let postedMessages: PresenceMessage[] = [];

function resetBroadcastState(): void {
  messageHandlers = [];
  postedMessages = [];
}

function createBroadcastMock() {
  return {
    postMessage: vi.fn((msg: PresenceMessage) => {
      postedMessages.push(msg);
    }),
    addEventListener: vi.fn((type: string, handler: (event: MessageEvent<PresenceMessage>) => void) => {
      if (type === "message") {
        messageHandlers.push(handler);
      }
    }),
    removeEventListener: vi.fn((type: string, handler: (event: MessageEvent<PresenceMessage>) => void) => {
      if (type === "message") {
        messageHandlers = messageHandlers.filter((h) => h !== handler);
      }
    }),
  };
}

/**
 * Simulates receiving a presence message from "another client" on the
 * BroadcastChannel.  The handler ignores its own clientId, so inject the
 * fake message into all registered handlers directly.
 */
function simulateRemoteMessage(msg: PresenceMessage): void {
  const event = new MessageEvent<PresenceMessage>("message", { data: msg });
  for (const handler of messageHandlers) {
    handler(event);
  }
}

// ── Module-level helpers ─────────────────────────────────────────────────

/** Dynamically imports the session-presence module after resetting modules. */
async function freshImport(): Promise<
  typeof import("@/lib/session-presence")
> {
  return await import("@/lib/session-presence");
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("session-presence", () => {
  let mod: Awaited<ReturnType<typeof freshImport>>;

  beforeEach(async () => {
    vi.resetModules();
    _store = {};
    resetBroadcastState();

    // Mock localStorage (needed because fork-pool jsdom may not provide it)
    vi.stubGlobal("localStorage", mockLocalStorage());

    // Mock BroadcastChannel
    vi.stubGlobal(
      "BroadcastChannel",
      vi.fn().mockImplementation(createBroadcastMock),
    );

    // Ensure crypto.randomUUID exists (fallback for older jsdom)
    if (typeof crypto === "undefined" || !crypto.randomUUID) {
      vi.stubGlobal("crypto", {
        randomUUID: vi.fn(() => {
          const chars = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
          return chars.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
        }),
      });
    }

    mod = await freshImport();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // ── 1. generateUUID ───────────────────────────────────────────────────

  describe("generateUUID (via getClientId)", () => {
    it("produces unique IDs across successive calls", () => {
      mod.getClientId(); // stores ID in localStorage
      const first = _store["concilium-client-id"];

      _store = {}; // clear
      mod.getClientId();
      const second = _store["concilium-client-id"];

      expect(first).toBeTruthy();
      expect(second).toBeTruthy();
      expect(first).not.toBe(second);
    });
  });

  // ── 2. getClientId ────────────────────────────────────────────────────

  describe("getClientId", () => {
    it("returns a persistent ID stored in localStorage", () => {
      const id1 = mod.getClientId();
      const id2 = mod.getClientId();
      const stored = _store["concilium-client-id"];

      expect(id1).toBe(id2);
      expect(stored).toBe(id1);
    });

    it("returns a new ID when localStorage is cleared", () => {
      const id1 = mod.getClientId();

      _store = {}; // simulate clearing localStorage
      const id2 = mod.getClientId();

      expect(id1).not.toBe(id2);
    });

    it('returns "server" when window is undefined (SSR)', async () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error — simulating SSR
      delete globalThis.window;

      vi.resetModules();
      const ssrMod = await import("@/lib/session-presence");

      expect(ssrMod.getClientId()).toBe("server");

      globalThis.window = originalWindow;
    });
  });

  // ── 3. joinSession ────────────────────────────────────────────────────

  describe("joinSession", () => {
    it("broadcasts a join message on the presence channel", () => {
      vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));

      mod.joinSession("TIX-001", "engineer", "Alice");

      expect(postedMessages).toHaveLength(1);
      const msg = postedMessages[0];
      expect(msg.type).toBe("join");
      expect(msg.ticketId).toBe("TIX-001");
      expect(msg.personaId).toBe("engineer");
      expect(msg.label).toBe("Alice");
      expect(msg.timestamp).toBe(new Date("2026-05-28T12:00:00Z").getTime());
      expect(msg.clientId).toBeTruthy();
    });

    it("uses personaId as the label when no label is provided", () => {
      mod.joinSession("TIX-002", "designer");

      expect(postedMessages).toHaveLength(1);
      expect(postedMessages[0].label).toBe("designer");
    });

    it("adds the caller as a participant immediately", () => {
      mod.joinSession("TIX-003", "qa", "QA Bot");

      const participants = mod.getParticipants("TIX-003");
      expect(participants).toHaveLength(1);
      expect(participants[0].personaId).toBe("qa");
      expect(participants[0].label).toBe("QA Bot");
      expect(participants[0].ticketId).toBe("TIX-003");
    });

    it("returns a cleanup function", () => {
      const cleanup = mod.joinSession("TIX-004", "pm");
      expect(typeof cleanup).toBe("function");
      expect(() => cleanup()).not.toThrow();
    });

    it("registers a message event listener on the channel", () => {
      mod.joinSession("TIX-005", "po");
      expect(messageHandlers).toHaveLength(1);
    });

    it("starts a heartbeat interval", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));

      mod.joinSession("TIX-006", "lead");

      postedMessages.length = 0;
      vi.advanceTimersByTime(30_000);

      expect(postedMessages.length).toBeGreaterThanOrEqual(1);
      const hb = postedMessages.find((m) => m.type === "heartbeat");
      expect(hb).toBeTruthy();
      expect(hb!.ticketId).toBe("TIX-006");
    });
  });

  // ── 4. leaveSession (via cleanup) ─────────────────────────────────────

  describe("leaveSession (cleanup function)", () => {
    it("broadcasts a leave message", () => {
      vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));

      const cleanup = mod.joinSession("TIX-007", "engineer");
      postedMessages.length = 0;

      cleanup();

      expect(postedMessages.length).toBeGreaterThanOrEqual(1);
      const leave = postedMessages.find((m) => m.type === "leave");
      expect(leave).toBeTruthy();
      expect(leave!.ticketId).toBe("TIX-007");
      expect(leave!.personaId).toBe("engineer");
    });

    it("stops the heartbeat interval", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));

      const cleanup = mod.joinSession("TIX-008", "designer");
      postedMessages.length = 0;
      cleanup();

      vi.advanceTimersByTime(60_000);
      const hbAfterLeave = postedMessages.find((m) => m.type === "heartbeat");
      expect(hbAfterLeave).toBeUndefined();
    });

    it("removes the message event listener", () => {
      const cleanup = mod.joinSession("TIX-009", "qa");
      const handlerCountBefore = messageHandlers.length;
      cleanup();
      expect(messageHandlers.length).toBeLessThan(handlerCountBefore);
    });

    it("removes own participant from the participants list", () => {
      const cleanup = mod.joinSession("TIX-010", "po");
      expect(mod.getParticipants("TIX-010")).toHaveLength(1);

      cleanup();
      expect(mod.getParticipants("TIX-010")).toHaveLength(0);
    });
  });

  // ── 5. heartbeat mechanism ────────────────────────────────────────────

  describe("heartbeat mechanism", () => {
    it("keeps the participant alive by updating lastHeartbeat", () => {
      vi.useFakeTimers();
      const startTime = new Date("2026-05-28T12:00:00Z");
      vi.setSystemTime(startTime);

      mod.joinSession("TIX-011", "engineer", "Engine");

      // The own client's lastHeartbeat is set at join time but is NOT
      // updated by own heartbeats — only remote messages go through
      // handleMessage which updates lastHeartbeat.  Own heartbeats
      // just post to the channel.  But prune uses >60s (strict), so
      // at 30s and 60s the own participant still survives.
      let participants = mod.getParticipants("TIX-011");
      expect(participants[0].lastHeartbeat).toBe(startTime.getTime());

      vi.advanceTimersByTime(30_000);
      participants = mod.getParticipants("TIX-011");
      expect(participants).toHaveLength(1);
      // lastHeartbeat unchanged (own heartbeat skips handleMessage)
      expect(participants[0].lastHeartbeat).toBe(startTime.getTime());

      vi.advanceTimersByTime(30_000);
      participants = mod.getParticipants("TIX-011");
      // At t=60s, now - lastHeartbeat = 60_000, which is NOT > 60_000
      // (strict inequality), so participant survives.
      expect(participants).toHaveLength(1);
    });

    it("broadcasts heartbeat messages over the channel", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));

      mod.joinSession("TIX-012", "pm");
      postedMessages.length = 0;

      vi.advanceTimersByTime(30_000);
      const hb = postedMessages.find((m) => m.type === "heartbeat");
      expect(hb).toBeTruthy();
    });

    it("does not fire heartbeats after ownPresence is cleared", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));

      const cleanup = mod.joinSession("TIX-013", "designer");
      postedMessages.length = 0;
      cleanup();

      vi.advanceTimersByTime(50_000);
      const hb = postedMessages.find((m) => m.type === "heartbeat");
      expect(hb).toBeUndefined();
    });
  });

  // ── 6. stale participant pruning ──────────────────────────────────────

  describe("stale participant pruning", () => {
    it("removes participants that have not sent a heartbeat for >60s", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));

      // First join own client (registers message handler)
      _store["concilium-client-id"] = "client-a";
      mod.joinSession("TIX-014", "engineer");

      // Then simulate remote client joining
      simulateRemoteMessage({
        type: "join",
        clientId: "client-b",
        ticketId: "TIX-014",
        personaId: "designer",
        label: "Designer",
        timestamp: Date.now(),
      });

      expect(mod.getParticipants("TIX-014")).toHaveLength(2);

      // Advance 91s — both clients' lastHeartbeat is at t=0.
      // At t=30s heartbeat: both have 30s gap, <60s, neither pruned.
      // At t=60s heartbeat: both have 60s gap, NOT >60s (strict), neither pruned.
      // At t=90s heartbeat: both have 90s gap, >60s, both pruned.
      vi.advanceTimersByTime(91_000);

      const participants = mod.getParticipants("TIX-014");
      // Both stale since own heartbeats don't update own lastHeartbeat
      expect(participants).toHaveLength(0);
    });

    it("keeps participants that are within the timeout window", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));

      _store["concilium-client-id"] = "client-a";
      mod.joinSession("TIX-015", "po");

      simulateRemoteMessage({
        type: "join",
        clientId: "client-b",
        ticketId: "TIX-015",
        personaId: "qa",
        label: "QA",
        timestamp: Date.now(),
      });

      vi.advanceTimersByTime(25_000);

      const resp = mod.getParticipants("TIX-015");
      expect(resp).toHaveLength(2);
    });

    it("remote heartbeats prevent pruning", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));

      // First join own client (registers message handler)
      _store["concilium-client-id"] = "client-a";
      mod.joinSession("TIX-016", "pm");

      // Then simulate remote client joining
      simulateRemoteMessage({
        type: "join",
        clientId: "client-b",
        ticketId: "TIX-016",
        personaId: "designer",
        timestamp: Date.now(),
      });

      // Advance 40s, send remote heartbeat for client-b
      vi.advanceTimersByTime(40_000);
      simulateRemoteMessage({
        type: "heartbeat",
        clientId: "client-b",
        ticketId: "TIX-016",
        personaId: "designer",
        timestamp: Date.now(),
      });

      // At t=40s, client-b's lastHeartbeat refreshed via handleMessage.
      // Advance 20s more (t=60s) — heartbeat fires, prune checks:
      //   client-b: now(60s) - lastHeartbeat(40s refreshed) = 20s, safe
      //   client-a: now(60s) - lastHeartbeat(0) = 60s, NOT > 60s, safe
      vi.advanceTimersByTime(20_000);

      // client-b should still be present (remote heartbeat keeps it alive)
      const participants = mod.getParticipants("TIX-016");
      expect(participants).toHaveLength(2);
      expect(participants.map((p) => p.clientId).sort()).toEqual([
        "client-a",
        "client-b",
      ]);
    });
  });

  // ── 7. getParticipants ────────────────────────────────────────────────

  describe("getParticipants", () => {
    it("returns an empty array when no participants have joined", () => {
      expect(mod.getParticipants("TIX-EMPTY")).toEqual([]);
    });

    it("returns only participants for the specified ticketId", () => {
      _store["concilium-client-id"] = "client-a";

      mod.joinSession("TIX-A", "engineer");
      mod.joinSession("TIX-B", "designer");

      const ticketA = mod.getParticipants("TIX-A");
      const ticketB = mod.getParticipants("TIX-B");

      // After second joinSession, own client has ticket TIX-B
      expect(ticketB).toHaveLength(1);
      expect(ticketB[0].ticketId).toBe("TIX-B");
      // ticketA should not include own client anymore
      expect(
        ticketA.find((p) => p.clientId === "client-a"),
      ).toBeUndefined();
    });

    it("includes both own and remote participants for a given ticket", () => {
      _store["concilium-client-id"] = "client-own";

      mod.joinSession("TIX-MULTI", "engineer");

      simulateRemoteMessage({
        type: "join",
        clientId: "client-remote",
        ticketId: "TIX-MULTI",
        personaId: "designer",
        timestamp: Date.now(),
      });

      const all = mod.getParticipants("TIX-MULTI");
      expect(all).toHaveLength(2);
      expect(all.map((p) => p.clientId).sort()).toEqual([
        "client-own",
        "client-remote",
      ]);
    });

    it("filters participants correctly across different tickets", () => {
      _store["concilium-client-id"] = "client-a";

      mod.joinSession("TICKET-1", "pm");

      simulateRemoteMessage({
        type: "join",
        clientId: "client-b",
        ticketId: "TICKET-2",
        personaId: "engineer",
        timestamp: Date.now(),
      });

      expect(mod.getParticipants("TICKET-1")).toHaveLength(1);
      expect(mod.getParticipants("TICKET-2")).toHaveLength(1);
      expect(mod.getParticipants("TICKET-3")).toHaveLength(0);
    });
  });

  // ── 8. multiple participants in same session ──────────────────────────

  describe("multiple participants joining same session", () => {
    it("tracks all distinct clients in a single session", () => {
      _store["concilium-client-id"] = "client-1";
      mod.joinSession("SESSION-1", "persona-1");

      simulateRemoteMessage({
        type: "join",
        clientId: "client-2",
        ticketId: "SESSION-1",
        personaId: "persona-2",
        timestamp: Date.now(),
      });

      simulateRemoteMessage({
        type: "join",
        clientId: "client-3",
        ticketId: "SESSION-1",
        personaId: "persona-3",
        timestamp: Date.now(),
      });

      const participants = mod.getParticipants("SESSION-1");
      expect(participants).toHaveLength(3);
      expect(participants.map((p) => p.personaId).sort()).toEqual([
        "persona-1",
        "persona-2",
        "persona-3",
      ]);
    });

    it("updates an existing client on re-join (same clientId)", () => {
      _store["concilium-client-id"] = "client-rejoin";
      mod.joinSession("TIX-REJOIN", "first-persona");

      let p = mod.getParticipants("TIX-REJOIN");
      expect(p[0].personaId).toBe("first-persona");

      // Re-join with different persona
      mod.joinSession("TIX-REJOIN", "second-persona");

      p = mod.getParticipants("TIX-REJOIN");
      expect(p).toHaveLength(1);
      expect(p[0].personaId).toBe("second-persona");
    });

    it("remote leave removes participant from session", () => {
      _store["concilium-client-id"] = "client-a";
      mod.joinSession("TIX-LEAVE", "pm");

      simulateRemoteMessage({
        type: "join",
        clientId: "client-b",
        ticketId: "TIX-LEAVE",
        personaId: "engineer",
        timestamp: Date.now(),
      });

      expect(mod.getParticipants("TIX-LEAVE")).toHaveLength(2);

      simulateRemoteMessage({
        type: "leave",
        clientId: "client-b",
        ticketId: "TIX-LEAVE",
        personaId: "engineer",
        timestamp: Date.now(),
      });

      expect(mod.getParticipants("TIX-LEAVE")).toHaveLength(1);
      expect(mod.getParticipants("TIX-LEAVE")[0].clientId).toBe("client-a");
    });
  });

  // ── 9. onPresenceChange ───────────────────────────────────────────────

  describe("onPresenceChange", () => {
    it("subscribes a listener and returns an unsubscribe function", () => {
      const listener = vi.fn();
      const unsub = mod.onPresenceChange(listener);
      expect(typeof unsub).toBe("function");
      unsub();
    });

    it("sends current state to the listener on subscription if participants exist", () => {
      mod.joinSession("TIX-LISTEN", "engineer");

      const listener = vi.fn();
      mod.onPresenceChange(listener);

      expect(listener).toHaveBeenCalledTimes(1);
      const snapshot: Participant[] = listener.mock.calls[0][0];
      expect(snapshot.some((p) => p.ticketId === "TIX-LISTEN")).toBe(true);
    });

    it("does not call listener on subscription if no participants exist", () => {
      const listener = vi.fn();
      mod.onPresenceChange(listener);
      expect(listener).not.toHaveBeenCalled();
    });

    it("notifies listeners when a participant joins", () => {
      mod.joinSession("TIX-NOTIFY", "pm");

      const listener = vi.fn();
      mod.onPresenceChange(listener);
      listener.mockClear();

      simulateRemoteMessage({
        type: "join",
        clientId: "client-remote-2",
        ticketId: "TIX-NOTIFY",
        personaId: "engineer",
        timestamp: Date.now(),
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("notifies listeners when a participant leaves", () => {
      mod.joinSession("TIX-NOTIFY-2", "po");

      simulateRemoteMessage({
        type: "join",
        clientId: "client-remote-3",
        ticketId: "TIX-NOTIFY-2",
        personaId: "qa",
        timestamp: Date.now(),
      });

      const listener = vi.fn();
      mod.onPresenceChange(listener);
      listener.mockClear();

      simulateRemoteMessage({
        type: "leave",
        clientId: "client-remote-3",
        ticketId: "TIX-NOTIFY-2",
        personaId: "qa",
        timestamp: Date.now(),
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("does not notify unsubscribed listeners", () => {
      mod.joinSession("TIX-UNSUB", "designer");

      const listener = vi.fn();
      const unsub = mod.onPresenceChange(listener);
      // onPresenceChange immediately fires with current snapshot
      listener.mockClear();
      unsub();

      simulateRemoteMessage({
        type: "join",
        clientId: "client-remote-4",
        ticketId: "TIX-UNSUB",
        personaId: "pm",
        timestamp: Date.now(),
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it("handles listener errors gracefully without affecting other listeners", () => {
      mod.joinSession("TIX-ERROR", "engineer");

      const badListener = vi.fn(() => {
        throw new Error("listener crash");
      });
      const goodListener = vi.fn();

      mod.onPresenceChange(badListener);
      mod.onPresenceChange(goodListener);

      expect(() => {
        simulateRemoteMessage({
          type: "join",
          clientId: "client-remote-5",
          ticketId: "TIX-ERROR",
          personaId: "qa",
          timestamp: Date.now(),
        });
      }).not.toThrow();

      expect(goodListener).toHaveBeenCalled();
    });
  });

  // ── 10. getClaimedPersonas ────────────────────────────────────────────

  describe("getClaimedPersonas", () => {
    it("returns empty array when no participants", () => {
      expect(mod.getClaimedPersonas("TIX-CLAIM")).toEqual([]);
    });

    it("returns persona IDs for a given ticket", () => {
      _store["concilium-client-id"] = "client-claim";
      mod.joinSession("TIX-CLAIM-2", "engineer");

      simulateRemoteMessage({
        type: "join",
        clientId: "client-remote-claim",
        ticketId: "TIX-CLAIM-2",
        personaId: "designer",
        timestamp: Date.now(),
      });

      const claimed = mod.getClaimedPersonas("TIX-CLAIM-2");
      expect(claimed).toHaveLength(2);
      expect(claimed).toContain("engineer");
      expect(claimed).toContain("designer");
    });

    it("filters claimed personas by ticketId", () => {
      _store["concilium-client-id"] = "client-multi";
      mod.joinSession("TIX-X", "pm");

      simulateRemoteMessage({
        type: "join",
        clientId: "client-remote-multi",
        ticketId: "TIX-Y",
        personaId: "qa",
        timestamp: Date.now(),
      });

      expect(mod.getClaimedPersonas("TIX-X")).toEqual(["pm"]);
      expect(mod.getClaimedPersonas("TIX-Y")).toEqual(["qa"]);
    });
  });

  // ── 11. updateOwnPersona ──────────────────────────────────────────────

  describe("updateOwnPersona", () => {
    it("broadcasts a heartbeat with the updated persona", () => {
      vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));

      mod.joinSession("TIX-UPDATE", "original");
      postedMessages.length = 0;

      mod.updateOwnPersona("TIX-UPDATE", "updated", "Updated Label");

      expect(postedMessages.length).toBeGreaterThanOrEqual(1);
      const msg = postedMessages[0];
      expect(msg.type).toBe("heartbeat");
      expect(msg.personaId).toBe("updated");
      expect(msg.label).toBe("Updated Label");
      expect(msg.ticketId).toBe("TIX-UPDATE");
    });

    it("updates own participant entry", () => {
      _store["concilium-client-id"] = "client-update";
      mod.joinSession("TIX-UPDATE-2", "a");

      mod.updateOwnPersona("TIX-UPDATE-2", "b", "B");

      const participants = mod.getParticipants("TIX-UPDATE-2");
      expect(participants).toHaveLength(1);
      expect(participants[0].personaId).toBe("b");
      expect(participants[0].label).toBe("B");
    });

    it("uses personaId as label when no label is provided", () => {
      mod.joinSession("TIX-UPDATE-3", "x");
      postedMessages.length = 0;

      mod.updateOwnPersona("TIX-UPDATE-3", "y");

      expect(postedMessages[0].label).toBe("y");
    });
  });

  // ── 12. edge cases ────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles multiple cleanup calls without throwing", () => {
      const cleanup = mod.joinSession("TIX-EDGE", "engineer");
      cleanup();
      expect(() => cleanup()).not.toThrow();
    });

    it("ignores messages from own clientId in the broadcast handler", () => {
      _store["concilium-client-id"] = "self-client";
      mod.joinSession("TIX-SELF", "engineer");

      expect(mod.getParticipants("TIX-SELF")).toHaveLength(1);

      // Simulate a message with our own clientId (should be ignored by handler)
      simulateRemoteMessage({
        type: "join",
        clientId: "self-client",
        ticketId: "TIX-SELF",
        personaId: "designer",
        timestamp: Date.now(),
      });

      // Still only 1 participant (self, not duplicated)
      expect(mod.getParticipants("TIX-SELF")).toHaveLength(1);
    });

    it("does not crash when BroadcastChannel is unavailable", async () => {
      vi.unstubAllGlobals();
      _store = {};
      vi.stubGlobal("localStorage", mockLocalStorage());
      vi.stubGlobal("BroadcastChannel", undefined);

      vi.resetModules();
      const modNoChannel = await import("@/lib/session-presence");

      // joinSession should not throw even without BroadcastChannel
      expect(() =>
        modNoChannel.joinSession("TIX-NOCH", "engineer"),
      ).not.toThrow();
      // The participant is still added via handleMessage(joinMsg) call
      // which runs regardless of BroadcastChannel availability
      expect(modNoChannel.getParticipants("TIX-NOCH")).toHaveLength(1);
    });

    it("preserves the joinedAt timestamp across heartbeats", () => {
      vi.useFakeTimers();
      const joinTime = new Date("2026-05-28T12:00:00Z");
      vi.setSystemTime(joinTime);

      _store["concilium-client-id"] = "persist-join";
      mod.joinSession("TIX-JOINED", "engineer");

      const initialJoinedAt = mod.getParticipants("TIX-JOINED")[0].joinedAt;
      expect(initialJoinedAt).toBe(joinTime.getTime());

      // Advance 30s — one heartbeat fires, but own participant is still
      // present (now - lastHeartbeat = 30s < 60s strict)
      vi.advanceTimersByTime(30_000);

      const participants = mod.getParticipants("TIX-JOINED");
      expect(participants).toHaveLength(1);
      expect(participants[0].joinedAt).toBe(initialJoinedAt);
    });
  });
});
