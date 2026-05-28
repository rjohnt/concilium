import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useState, useRef } from "react";
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";
import type { UseKeyboardShortcutsOptions } from "../useKeyboardShortcuts";

// Helper: fire a global keydown event on window
function fireKeyDown(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  window.dispatchEvent(event);
  return event;
}

// Test harness that renders a mini-dashboard using the hook
function TestDashboard({
  ticketCount,
  ticketIds,
  onOpenTicket,
  onNewTicket,
}: {
  ticketCount: number;
  ticketIds: string[];
  onOpenTicket: (id: string) => void;
  onNewTicket: () => void;
}) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const { selectedIndex } = useKeyboardShortcuts({
    ticketCount,
    ticketIds,
    onOpenTicket,
    onNewTicket,
    searchInputRef,
  });

  return (
    <div>
      <input
        ref={searchInputRef}
        type="text"
        data-testid="search-input"
        placeholder="Search tickets..."
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <div data-testid="selected-index">
        {selectedIndex === null ? "none" : String(selectedIndex)}
      </div>
      <div data-testid="search-focused">{focused ? "focused" : "blurred"}</div>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useKeyboardShortcuts", () => {
  // ── j / k navigation ────────────────────────────────────────────

  it("[AC1] j selects the first ticket when nothing is selected", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={3}
        ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    act(() => fireKeyDown("j"));
    expect(screen.getByTestId("selected-index").textContent).toBe("0");
  });

  it("[AC1] j moves selection down incrementally", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={3}
        ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    act(() => fireKeyDown("j"));
    act(() => fireKeyDown("j"));
    expect(screen.getByTestId("selected-index").textContent).toBe("1");
  });

  it("[AC1] j stops at last item (no wrapping)", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={3}
        ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    act(() => fireKeyDown("j"));
    act(() => fireKeyDown("j"));
    act(() => fireKeyDown("j")); // selects index 2
    act(() => fireKeyDown("j")); // should stay at 2
    expect(screen.getByTestId("selected-index").textContent).toBe("2");
  });

  it("[AC2] k selects the last ticket when nothing is selected", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={3}
        ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    act(() => fireKeyDown("k"));
    expect(screen.getByTestId("selected-index").textContent).toBe("2");
  });

  it("[AC2] k moves selection up incrementally", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={3}
        ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    act(() => fireKeyDown("j"));
    act(() => fireKeyDown("j")); // at index 1
    act(() => fireKeyDown("k")); // should be at index 0
    expect(screen.getByTestId("selected-index").textContent).toBe("0");
  });

  it("[AC2] k stops at first item (no wrapping)", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={3}
        ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    act(() => fireKeyDown("j")); // index 0
    act(() => fireKeyDown("k")); // should stay at 0
    expect(screen.getByTestId("selected-index").textContent).toBe("0");
  });

  // ── Empty list ──────────────────────────────────────────────────

  it("j does nothing when ticketCount is 0", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={0}
        ticketIds={[]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    act(() => fireKeyDown("j"));
    expect(screen.getByTestId("selected-index").textContent).toBe("none");
  });

  it("k does nothing when ticketCount is 0", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={0}
        ticketIds={[]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    act(() => fireKeyDown("k"));
    expect(screen.getByTestId("selected-index").textContent).toBe("none");
  });

  // ── Enter navigation ────────────────────────────────────────────

  it("[AC3] Enter calls onOpenTicket with the selected ticket ID", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={3}
        ticketIds={["TIX-A", "TIX-B", "TIX-C"]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    act(() => fireKeyDown("j")); // select index 0 -> TIX-A
    act(() => fireKeyDown("Enter"));
    expect(onOpen).toHaveBeenCalledWith("TIX-A");
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("Enter does nothing when nothing is selected", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={3}
        ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    act(() => fireKeyDown("Enter"));
    expect(onOpen).not.toHaveBeenCalled();
  });

  // ── / search focus ──────────────────────────────────────────────

  it("[AC4] / focuses the search input", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={3}
        ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    act(() => fireKeyDown("/"));
    expect(screen.getByTestId("search-focused").textContent).toBe("focused");
  });

  it("/ clears selection when focusing search", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={3}
        ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    act(() => fireKeyDown("j")); // select index 0
    expect(screen.getByTestId("selected-index").textContent).toBe("0");

    act(() => fireKeyDown("/"));
    expect(screen.getByTestId("selected-index").textContent).toBe("none");
  });

  // ── n new ticket ────────────────────────────────────────────────

  it("[AC5] n calls onNewTicket", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={3}
        ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    act(() => fireKeyDown("n"));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  // ── Escape ──────────────────────────────────────────────────────

  it("[AC6] Escape clears selection", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={3}
        ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    act(() => fireKeyDown("j"));
    expect(screen.getByTestId("selected-index").textContent).toBe("0");

    act(() => fireKeyDown("Escape"));
    expect(screen.getByTestId("selected-index").textContent).toBe("none");
  });

  it("Escape clears selection even when search input is focused", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={3}
        ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    // Select a ticket and focus search
    act(() => fireKeyDown("j"));
    act(() => fireKeyDown("/"));
    expect(screen.getByTestId("selected-index").textContent).toBe("none");

    // Re-select and press Escape
    act(() => {
      (screen.getByTestId("search-input") as HTMLInputElement).blur();
    });
    act(() => fireKeyDown("j"));
    expect(screen.getByTestId("selected-index").textContent).toBe("0");

    act(() => fireKeyDown("Escape"));
    expect(screen.getByTestId("selected-index").textContent).toBe("none");
  });

  // ── [AC8] Scoping: suppressed while typing ──────────────────────

  it("[AC8] shortcuts are suppressed when focused on a text input", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={3}
        ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    const input = screen.getByTestId("search-input");
    act(() => input.focus());

    act(() => fireKeyDown("j"));
    expect(screen.getByTestId("selected-index").textContent).toBe("none");

    act(() => fireKeyDown("k"));
    expect(screen.getByTestId("selected-index").textContent).toBe("none");

    act(() => fireKeyDown("n"));
    expect(onNew).not.toHaveBeenCalled();
  });

  it("shortcuts work when focused on a non-text input (e.g. button)", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <div>
        <button data-testid="some-button">Click me</button>
        <TestDashboard
          ticketCount={3}
          ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
          onOpenTicket={onOpen}
          onNewTicket={onNew}
        />
      </div>,
    );

    const button = screen.getByTestId("some-button");
    act(() => button.focus());

    act(() => fireKeyDown("j"));
    expect(screen.getByTestId("selected-index").textContent).toBe("0");
  });

  // ── [AC8] Modal suppression ─────────────────────────────────────

  it("[AC8] shortcuts are suppressed when a modal dialog is open", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <div>
        <div role="dialog" aria-modal="true" data-testid="modal">
          Modal content
        </div>
        <TestDashboard
          ticketCount={3}
          ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
          onOpenTicket={onOpen}
          onNewTicket={onNew}
        />
      </div>,
    );

    // Modal is open — shortcuts should be suppressed
    act(() => fireKeyDown("j"));
    expect(screen.getByTestId("selected-index").textContent).toBe("none");

    act(() => fireKeyDown("n"));
    expect(onNew).not.toHaveBeenCalled();
  });

  it("shortcuts work after modal is removed", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    const { rerender } = render(
      <div>
        <div role="dialog" aria-modal="true" data-testid="modal">
          Modal content
        </div>
        <TestDashboard
          ticketCount={3}
          ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
          onOpenTicket={onOpen}
          onNewTicket={onNew}
        />
      </div>,
    );

    // Modal open — suppressed
    act(() => fireKeyDown("j"));
    expect(screen.getByTestId("selected-index").textContent).toBe("none");

    // Remove modal
    rerender(
      <div>
        <TestDashboard
          ticketCount={3}
          ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
          onOpenTicket={onOpen}
          onNewTicket={onNew}
        />
      </div>,
    );

    act(() => fireKeyDown("j"));
    expect(screen.getByTestId("selected-index").textContent).toBe("0");
  });

  // ── preventDefault ──────────────────────────────────────────────

  it("j keydown event is prevented from default", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={3}
        ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    const event = fireKeyDown("j");
    expect(event.defaultPrevented).toBe(true);
  });

  it("shortcuts without modal do prevent default", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(
      <TestDashboard
        ticketCount={3}
        ticketIds={["TIX-1", "TIX-2", "TIX-3"]}
        onOpenTicket={onOpen}
        onNewTicket={onNew}
      />,
    );

    const event = fireKeyDown("n");
    expect(event.defaultPrevented).toBe(true);
  });
});
