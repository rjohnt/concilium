import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcut } from "../useKeyboardShortcut";

// Helper: dispatch a keydown event on window
function fireKeyDown(key: string, opts: Partial<KeyboardEvent> = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  window.dispatchEvent(event);
  return event;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useKeyboardShortcut", () => {
  it("renders and registers keydown listener when mounted", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() =>
      useKeyboardShortcut("k", () => {}, "metaOrCtrl"),
    );

    expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("calls callback on matching key+modifier combo (meta+k)", () => {
    const fn = vi.fn();

    renderHook(() => useKeyboardShortcut("k", fn, "meta"));

    fireKeyDown("k", { metaKey: true, ctrlKey: false });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls callback on matching key+modifier combo (ctrl+k)", () => {
    const fn = vi.fn();

    renderHook(() => useKeyboardShortcut("k", fn, "ctrl"));

    fireKeyDown("k", { metaKey: false, ctrlKey: true });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls callback with metaOrCtrl when meta is pressed", () => {
    const fn = vi.fn();

    renderHook(() => useKeyboardShortcut("k", fn, "metaOrCtrl"));

    fireKeyDown("k", { metaKey: true, ctrlKey: false });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls callback with metaOrCtrl when ctrl is pressed", () => {
    const fn = vi.fn();

    renderHook(() => useKeyboardShortcut("k", fn, "metaOrCtrl"));

    fireKeyDown("k", { metaKey: false, ctrlKey: true });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire when wrong modifier is set (meta requested, only ctrl pressed)", () => {
    const fn = vi.fn();

    renderHook(() => useKeyboardShortcut("k", fn, "meta"));

    fireKeyDown("k", { metaKey: false, ctrlKey: true });

    expect(fn).not.toHaveBeenCalled();
  });

  it("does NOT fire on wrong key", () => {
    const fn = vi.fn();

    renderHook(() => useKeyboardShortcut("k", fn, "metaOrCtrl"));

    fireKeyDown("j", { metaKey: true });

    expect(fn).not.toHaveBeenCalled();
  });

  it("runs callback with the event", () => {
    const fn = vi.fn();

    renderHook(() => {
      useKeyboardShortcut("k", () => {
        // We can't capture the event directly from the hook callback
        // since it only passes () => void, but we verify it was called
        fn();
      }, "metaOrCtrl");
    });

    fireKeyDown("k", { metaKey: true });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("cleans up listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const fn = vi.fn();

    const { unmount } = renderHook(() =>
      useKeyboardShortcut("k", fn, "metaOrCtrl"),
    );

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("calls preventDefault by default", () => {
    const fn = vi.fn();

    renderHook(() => useKeyboardShortcut("k", fn, "metaOrCtrl"));

    const event = fireKeyDown("k", { metaKey: true });

    expect(event.defaultPrevented).toBe(true);
  });

  it("does not call preventDefault when opted out", () => {
    const fn = vi.fn();

    renderHook(() => useKeyboardShortcut("k", fn, "metaOrCtrl", false));

    const event = fireKeyDown("k", { metaKey: true });

    expect(event.defaultPrevented).toBe(false);
  });

  describe("legacy Modifiers object", () => {
    it("fires when meta matches (ctrl don't-care)", () => {
      const fn = vi.fn();

      renderHook(() =>
        useKeyboardShortcut("k", fn, { meta: true }),
      );

      fireKeyDown("k", { metaKey: true, ctrlKey: false });
      expect(fn).toHaveBeenCalledTimes(1);

      fn.mockReset();
      fireKeyDown("k", { metaKey: true, ctrlKey: true });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("does NOT fire when meta is required but not pressed", () => {
      const fn = vi.fn();

      renderHook(() =>
        useKeyboardShortcut("k", fn, { meta: true }),
      );

      fireKeyDown("k", { metaKey: false, ctrlKey: true });
      expect(fn).not.toHaveBeenCalled();
    });

    it("fires when ctrl is explicitly false and not pressed", () => {
      const fn = vi.fn();

      renderHook(() =>
        useKeyboardShortcut("k", fn, { meta: true, ctrl: false }),
      );

      // meta=true, ctrl=false → event has meta but not ctrl
      fireKeyDown("k", { metaKey: true, ctrlKey: false });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("does NOT fire when ctrl is explicitly false but ctrl IS pressed", () => {
      const fn = vi.fn();

      renderHook(() =>
        useKeyboardShortcut("k", fn, { meta: true, ctrl: false }),
      );

      fireKeyDown("k", { metaKey: true, ctrlKey: true });
      expect(fn).not.toHaveBeenCalled();
    });
  });
});
