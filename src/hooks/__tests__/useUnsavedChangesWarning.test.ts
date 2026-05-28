import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUnsavedChangesWarning } from "../useUnsavedChangesWarning";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useUnsavedChangesWarning", () => {
  it("adds beforeunload listener when dirty (hasUnsaved=true)", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useUnsavedChangesWarning(true));

    expect(addSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("does NOT add beforeunload listener when clean (hasUnsaved=false)", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useUnsavedChangesWarning(false));

    expect(addSpy).not.toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
  });

  it("removes listener when hasUnsaved transitions from true to false", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { rerender } = renderHook(
      ({ dirty }) => useUnsavedChangesWarning(dirty),
      { initialProps: { dirty: true } },
    );

    // Transition to clean
    rerender({ dirty: false });

    expect(removeSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
  });

  it("removes listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useUnsavedChangesWarning(true));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
  });

  it("handler calls preventDefault on the event", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useUnsavedChangesWarning(true));

    // Extract the registered handler
    const handler = addSpy.mock.calls.find(
      ([type]) => type === "beforeunload",
    )?.[1] as ((e: BeforeUnloadEvent) => void) | undefined;

    expect(handler).toBeDefined();

    const mockEvent = {
      preventDefault: vi.fn(),
      returnValue: "" as string,
    } as unknown as BeforeUnloadEvent;

    handler!(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("handler sets returnValue to empty string for legacy browser support", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useUnsavedChangesWarning(true));

    const handler = addSpy.mock.calls.find(
      ([type]) => type === "beforeunload",
    )?.[1] as ((e: BeforeUnloadEvent) => void) | undefined;

    expect(handler).toBeDefined();

    const mockEvent = {
      preventDefault: vi.fn(),
      returnValue: "" as string,
    } as unknown as BeforeUnloadEvent;

    handler!(mockEvent);

    // returnValue should remain "" (the handler sets it)
    expect(mockEvent.returnValue).toBe("");
  });
});
