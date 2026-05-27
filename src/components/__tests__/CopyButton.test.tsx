import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CopyButton } from "../CopyButton";

describe("CopyButton", () => {
  beforeEach(() => {
    // Only fake timers, not queueMicrotask — so Promises still work
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    // Set up a mock clipboard API that resolves successfully by default
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
    // Ensure window.location.href is set
    Object.defineProperty(window, "location", {
      value: { href: "https://example.com/page" },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renders with Copy icon by default", () => {
    render(<CopyButton text="test-id" />);
    const button = screen.getByRole("button", { name: "Copy to clipboard" });
    expect(button).toBeInTheDocument();
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("renders with Link icon when icon='link'", () => {
    render(<CopyButton text="test-id" icon="link" />);
    const button = screen.getByRole("button", { name: "Copy to clipboard" });
    expect(button).toBeInTheDocument();
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("shows 'Copied!' after click", async () => {
    render(<CopyButton text="test-id" />);
    const button = screen.getByRole("button", { name: "Copy to clipboard" });

    // Use act to flush React state updates including the promise callback
    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("resets after 2 seconds", async () => {
    render(<CopyButton text="test-id" />);
    const button = screen.getByRole("button", { name: "Copy to clipboard" });

    await act(async () => {
      fireEvent.click(button);
    });

    // Should show "Copied!" immediately after promise resolves
    expect(screen.getByText("Copied!")).toBeInTheDocument();

    // Advance timers by 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Should be back to the Copy button
    expect(screen.getByRole("button", { name: "Copy to clipboard" })).toBeInTheDocument();
    expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
  });

  it("stops click propagation to parent", async () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <CopyButton text="test-id" />
      </div>
    );

    const button = screen.getByRole("button", { name: "Copy to clipboard" });

    await act(async () => {
      fireEvent.click(button);
    });

    // Parent's click handler should NOT fire because stopPropagation is called
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("gracefully handles missing Clipboard API", async () => {
    // Remove the clipboard API
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(<CopyButton text="test-id" />);
    const button = screen.getByRole("button", { name: "Copy to clipboard" });

    fireEvent.click(button);

    expect(warnSpy).toHaveBeenCalledWith("Clipboard API not available");
    // Should NOT show "Copied!" since the API is unavailable
    expect(screen.queryByText("Copied!")).not.toBeInTheDocument();

    warnSpy.mockRestore();
  });

  it("uses window.location.href fallback when text is undefined", async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextSpy },
      writable: true,
      configurable: true,
    });

    render(<CopyButton label="Copy link" icon="link" />);
    const button = screen.getByRole("button", { name: "Copy Copy link" });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeTextSpy).toHaveBeenCalledWith("https://example.com/page");
  });

  it("does NOT fall back to window.location.href when text is empty string", async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextSpy },
      writable: true,
      configurable: true,
    });

    render(<CopyButton text="" label="Copy empty" />);
    const button = screen.getByRole("button", { name: "Copy Copy empty" });

    await act(async () => {
      fireEvent.click(button);
    });

    // Should copy the empty string, not the location href
    expect(writeTextSpy).toHaveBeenCalledWith("");
  });

  it("does not show Copied! when writeText fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const writeTextSpy = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextSpy },
      writable: true,
      configurable: true,
    });

    render(<CopyButton text="test-id" />);
    const button = screen.getByRole("button", { name: "Copy to clipboard" });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "Clipboard writeText failed:",
      expect.any(Error)
    );
    expect(screen.queryByText("Copied!")).not.toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it("includes label in aria-label when provided", () => {
    render(<CopyButton text="TICKET-123" label="TICKET-123" />);
    expect(
      screen.getByRole("button", { name: "Copy TICKET-123" })
    ).toBeInTheDocument();
  });

  it("cleans up timeout on unmount", async () => {
    const { unmount } = render(<CopyButton text="test-id" />);
    const button = screen.getByRole("button", { name: "Copy to clipboard" });

    await act(async () => {
      fireEvent.click(button);
    });

    // Verify we're in the copied state (timeout is actively pending)
    expect(screen.getByText("Copied!")).toBeInTheDocument();

    // Unmount the component — useEffect cleanup should clear the timeout
    unmount();

    // No assertion needed — if the cleanup didn't work, advancing timers
    // would cause a state update on an unmounted component.
    // We simply verify no crash occurs.
    act(() => {
      vi.advanceTimersByTime(3000);
    });
  });
});
