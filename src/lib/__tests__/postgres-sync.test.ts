import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Deterministic test of the Postgres Changes subscription. We mock the Supabase
 * client so no network is involved, capture the change handlers it registers,
 * and use fake timers to assert the debounce collapses a burst of peer writes
 * into a single re-pull callback.
 */

// Fake Supabase realtime channel that records postgres_changes handlers.
type ChangeHandler = () => void;
const handlers: ChangeHandler[] = [];
const subscribeSpy = vi.fn();
const removeChannelSpy = vi.fn();

const fakeChannel = {
  on(_event: string, opts: { table: string }, handler: ChangeHandler) {
    handlers.push(handler);
    void opts;
    return fakeChannel;
  },
  subscribe() {
    subscribeSpy();
    return fakeChannel;
  },
};

let configured = true;

vi.mock("../supabase", () => ({
  isSupabaseConfigured: () => configured,
  createClient: () => ({
    channel: () => fakeChannel,
    removeChannel: (ch: unknown) => removeChannelSpy(ch),
  }),
}));

import { subscribeToPostgresChanges } from "../postgres-sync";

beforeEach(() => {
  vi.useFakeTimers();
  handlers.length = 0;
  subscribeSpy.mockClear();
  removeChannelSpy.mockClear();
  configured = true;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("subscribeToPostgresChanges", () => {
  it("subscribes to tickets, feedback, and build_reports changes", () => {
    const unsub = subscribeToPostgresChanges(() => {});
    expect(handlers.length).toBe(3);
    expect(subscribeSpy).toHaveBeenCalledOnce();
    unsub();
  });

  it("debounces a burst of peer writes into a single callback", () => {
    const onChange = vi.fn();
    const unsub = subscribeToPostgresChanges(onChange);

    // Three rapid changes (e.g. ticket + two feedback rows from another user)
    handlers[0]();
    handlers[1]();
    handlers[2]();

    expect(onChange).not.toHaveBeenCalled(); // still within debounce window
    vi.advanceTimersByTime(600);
    expect(onChange).toHaveBeenCalledOnce();

    unsub();
  });

  it("fires again for a change after the debounce window elapses", () => {
    const onChange = vi.fn();
    const unsub = subscribeToPostgresChanges(onChange);

    handlers[0]();
    vi.advanceTimersByTime(600);
    handlers[0]();
    vi.advanceTimersByTime(600);

    expect(onChange).toHaveBeenCalledTimes(2);
    unsub();
  });

  it("unsubscribe removes the channel and cancels a pending callback", () => {
    const onChange = vi.fn();
    const unsub = subscribeToPostgresChanges(onChange);

    handlers[0](); // schedule a callback
    unsub(); // should cancel it and remove the channel
    vi.advanceTimersByTime(600);

    expect(onChange).not.toHaveBeenCalled();
    expect(removeChannelSpy).toHaveBeenCalledOnce();
  });

  it("is a no-op when Supabase isn't configured", () => {
    configured = false;
    const onChange = vi.fn();
    const unsub = subscribeToPostgresChanges(onChange);

    expect(handlers.length).toBe(0);
    expect(subscribeSpy).not.toHaveBeenCalled();
    unsub();
  });
});
