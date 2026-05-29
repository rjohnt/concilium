import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnlineStatus } from "../useOnlineStatus";

/**
 * Helper: set navigator.onLine to a specific value.
 * Uses a getter spy so individual tests can override the value.
 */
function mockNavigatorOnline(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

/**
 * Helper: dispatch an online or offline event on window.
 */
function fireNetworkEvent(type: "online" | "offline") {
  window.dispatchEvent(new Event(type));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useOnlineStatus", () => {
  // ── AC #9: SSR safety ──────────────────────────────────────────────
  it("returns isOnline: true by default (SSR safety)", () => {
    // Default without mocking navigator: isOnline starts as true.
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(true);
  });

  // ── Initial offline edge case ───────────────────────────────────────
  it("returns isOnline: false when navigator.onLine is false on mount", () => {
    mockNavigatorOnline(false);

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(false);
  });

  // ── Core detection: offline ────────────────────────────────────────
  it("updates isOnline to false on offline event", () => {
    // Start online
    mockNavigatorOnline(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(true);

    // Go offline
    act(() => {
      fireNetworkEvent("offline");
    });

    expect(result.current.isOnline).toBe(false);
  });

  // ── Core detection: online ─────────────────────────────────────────
  it("updates isOnline to true on online event", () => {
    // Start offline
    mockNavigatorOnline(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(false);

    // Go online
    act(() => {
      fireNetworkEvent("online");
    });

    expect(result.current.isOnline).toBe(true);
  });

  // ── Reconnection detection ─────────────────────────────────────────
  it("sets wasOffline: true after offline→online transition", () => {
    mockNavigatorOnline(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.wasOffline).toBe(false);

    // Go offline
    act(() => {
      fireNetworkEvent("offline");
    });
    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(false); // not yet reconnected

    // Come back online — wasOffline should flip
    act(() => {
      fireNetworkEvent("online");
    });
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(true);
  });

  // ── False-positive prevention ───────────────────────────────────────
  it("does not set wasOffline on first mount when already online", () => {
    mockNavigatorOnline(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.wasOffline).toBe(false);
  });

  // ── Memory leak prevention: cleanup ────────────────────────────────
  it("cleans up event listeners on unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useOnlineStatus());

    // Should have registered both listeners
    expect(addSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("offline", expect.any(Function));

    unmount();

    // Should remove both listeners
    expect(removeSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("offline", expect.any(Function));
  });

  // ── Flapping edge case ─────────────────────────────────────────────
  it("rapid offline/online flapping: isOnline reflects latest event", () => {
    mockNavigatorOnline(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(true);

    // Rapid flapping sequence
    act(() => fireNetworkEvent("offline"));
    expect(result.current.isOnline).toBe(false);

    act(() => fireNetworkEvent("online"));
    expect(result.current.isOnline).toBe(true);

    act(() => fireNetworkEvent("offline"));
    expect(result.current.isOnline).toBe(false);

    act(() => fireNetworkEvent("online"));
    expect(result.current.isOnline).toBe(true);

    // wasOffline should have been set because we did offline→online
    expect(result.current.wasOffline).toBe(true);
  });

  // ── Dismiss/timer reset ────────────────────────────────────────────
  it("resetWasOffline() resets wasOffline to false", () => {
    mockNavigatorOnline(true);
    const { result } = renderHook(() => useOnlineStatus());

    // Trigger an offline→online transition to set wasOffline
    act(() => fireNetworkEvent("offline"));
    act(() => fireNetworkEvent("online"));
    expect(result.current.wasOffline).toBe(true);

    // Reset
    act(() => {
      result.current.resetWasOffline();
    });
    expect(result.current.wasOffline).toBe(false);
  });

  // ── Multiple offline→online transitions ─────────────────────────────
  it("wasOffline remains true across multiple offline→online cycles until reset", () => {
    mockNavigatorOnline(true);
    const { result } = renderHook(() => useOnlineStatus());

    // First offline→online
    act(() => fireNetworkEvent("offline"));
    act(() => fireNetworkEvent("online"));
    expect(result.current.wasOffline).toBe(true);

    // Do not reset — go offline and back again
    act(() => fireNetworkEvent("offline"));
    act(() => fireNetworkEvent("online"));
    expect(result.current.wasOffline).toBe(true); // still true

    // Now reset
    act(() => result.current.resetWasOffline());
    expect(result.current.wasOffline).toBe(false);
  });
});
