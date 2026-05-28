import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// ── localStorage mock (must be set up BEFORE importing store) ─────────
function getMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

const mockStorage = getMockStorage();
vi.stubGlobal("localStorage", mockStorage);

// ── Real window mock for addEventListener/dispatchEvent ──────────────
// Needed so DashboardPage's "tickets-changed" listener actually works.
const eventMap: Record<string, EventListenerOrEventListenerObject[]> = {};
const mockWindow = {
  addEventListener: vi.fn(
    (type: string, handler: EventListenerOrEventListenerObject) => {
      if (!eventMap[type]) eventMap[type] = [];
      eventMap[type].push(handler);
    },
  ),
  removeEventListener: vi.fn(
    (type: string, handler: EventListenerOrEventListenerObject) => {
      if (eventMap[type]) {
        eventMap[type] = eventMap[type].filter((h) => h !== handler);
      }
    },
  ),
  dispatchEvent: vi.fn((event: Event) => {
    const handlers = eventMap[event.type] || [];
    handlers.forEach((h) => {
      if (typeof h === "function") h(event);
      else h.handleEvent(event);
    });
    return true;
  }),
};
vi.stubGlobal("window", mockWindow);

// ── Mock navigator.clipboard for CopyButton ──────────────────────────
vi.stubGlobal("navigator", {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// ── Now safe to import store + page ───────────────────────────────────
import { clearStorage, createTicket, getTickets } from "@/lib/store";
import DashboardPage from "../page";

// ── Helpers ────────────────────────────────────────────────────────────

/** Enter inline edit mode by clicking a ticket title heading. */
function enterEditMode(title: string) {
  const heading = screen.getByRole("heading", { name: title });
  fireEvent.click(heading);
}

/** Get the inline edit input once in edit mode. */
function getEditInput() {
  return screen.getByRole("textbox", { name: "Edit ticket title" });
}

/** Save current edit by pressing Enter. */
function saveViaEnter() {
  fireEvent.keyDown(getEditInput(), { key: "Enter" });
}

/** Cancel current edit by pressing Escape. */
function cancelViaEscape() {
  fireEvent.keyDown(getEditInput(), { key: "Escape" });
}

/** Blur the edit input (simulates clicking away). */
function saveViaBlur() {
  fireEvent.blur(getEditInput());
}

/** Create a single ticket, render the dashboard, and wait for loading to settle. */
function renderDashboardWithTicket(
  title = "Original Title",
  description = "Test description",
) {
  createTicket(title, description);
  return render(<DashboardPage />);
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("DEV-48: Inline ticket title editing (acceptance)", () => {
  beforeEach(() => {
    mockStorage.clear();
    clearStorage();
    // Clear the event map between tests
    Object.keys(eventMap).forEach((k) => delete eventMap[k]);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── AC1: Clicking title switches to inline text input ─────────────────

  it("AC1: clicking a ticket title on the dashboard switches to an inline text input", () => {
    renderDashboardWithTicket();

    // Title is displayed as a heading
    expect(
      screen.getByRole("heading", { name: "Original Title" }),
    ).toBeInTheDocument();

    // Click the title
    enterEditMode("Original Title");

    // Heading should disappear, input should appear
    expect(
      screen.queryByRole("heading", { name: "Original Title" }),
    ).not.toBeInTheDocument();

    const input = getEditInput();
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveValue("Original Title");
  });

  // ── AC2: Pressing Enter saves the new title ──────────────────────────

  it("AC2: pressing Enter saves the new title and exits edit mode", () => {
    renderDashboardWithTicket();

    enterEditMode("Original Title");

    const input = getEditInput();
    fireEvent.change(input, { target: { value: "Renamed Ticket" } });
    saveViaEnter();

    // Edit mode should exit — heading reappears
    // (Title may show original until tickets-changed fires, but edit mode is exited)
    expect(screen.queryByRole("textbox", { name: "Edit ticket title" })).not
      .toBeInTheDocument();

    // The store should have the updated ticket
    const tickets = getTickets();
    expect(tickets[0].title).toBe("Renamed Ticket");
  });

  // ── AC3: Blurring (clicking away) saves the new title ────────────────

  it("AC3: blurring the input saves the new title and exits edit mode", () => {
    renderDashboardWithTicket();

    enterEditMode("Original Title");

    const input = getEditInput();
    fireEvent.change(input, { target: { value: "Blur Saved Title" } });
    saveViaBlur();

    // Edit mode should exit
    expect(screen.queryByRole("textbox", { name: "Edit ticket title" })).not
      .toBeInTheDocument();

    // The store should have the updated ticket
    const tickets = getTickets();
    expect(tickets[0].title).toBe("Blur Saved Title");
  });

  // ── AC4: Pressing Escape cancels and reverts ─────────────────────────

  it("AC4: pressing Escape cancels editing and reverts to original title", () => {
    renderDashboardWithTicket();

    enterEditMode("Original Title");

    const input = getEditInput();
    fireEvent.change(input, { target: { value: "Should Not Save" } });
    cancelViaEscape();

    // Should exit edit mode — heading reappears with original title
    expect(
      screen.getByRole("heading", { name: "Original Title" }),
    ).toBeInTheDocument();

    // Store should NOT be updated
    const tickets = getTickets();
    expect(tickets[0].title).toBe("Original Title");
  });

  // ── AC5: Empty titles are rejected (revert to original) ──────────────

  it("AC5: empty title is rejected and reverts to original", () => {
    renderDashboardWithTicket();

    enterEditMode("Original Title");

    const input = getEditInput();
    fireEvent.change(input, { target: { value: "" } });
    saveViaBlur();

    // Should revert to original title
    expect(
      screen.getByRole("heading", { name: "Original Title" }),
    ).toBeInTheDocument();

    // Store should NOT be updated
    const tickets = getTickets();
    expect(tickets[0].title).toBe("Original Title");
  });

  it("AC5: whitespace-only title is rejected and reverts to original", () => {
    renderDashboardWithTicket();

    enterEditMode("Original Title");

    const input = getEditInput();
    fireEvent.change(input, { target: { value: "    " } });
    saveViaBlur();

    // Should revert to original title
    expect(
      screen.getByRole("heading", { name: "Original Title" }),
    ).toBeInTheDocument();

    // Store should NOT be updated
    const tickets = getTickets();
    expect(tickets[0].title).toBe("Original Title");
  });

  // ── AC6: Input inherits display title typography ─────────────────────

  it("AC6: input has font-bold and text-ink-primary typography classes", () => {
    renderDashboardWithTicket();

    enterEditMode("Original Title");

    const input = getEditInput();
    expect(input.className).toContain("font-bold");
    expect(input.className).toContain("text-ink-primary");
  });

  // ── AC7: Navigation suppressed during edit ───────────────────────────

  it("AC7: clicking the title does not navigate (stopPropagation on Link)", () => {
    renderDashboardWithTicket();

    // The card is wrapped in a Link to /ticket/TIX-001
    // Clicking the title should enter edit mode, not follow the link
    const heading = screen.getByRole("heading", { name: "Original Title" });
    fireEvent.click(heading);

    // Edit mode should be active — proof navigation was suppressed
    expect(getEditInput()).toBeInTheDocument();

    // Also verify the edit input handles its own key events and doesn't
    // inadvertently trigger navigation via the Link wrapper
    const input = getEditInput();
    // Clicking inside the input should not propagate to the Link
    const clickEvent = fireEvent.click(input);
    // Input should still have focus (edit mode persists)
    expect(input).toBeInTheDocument();
  });

  // ── AC8: Dashboard state stays current after tickets-changed event ───

  it("AC8: dashboard re-renders with new title after tickets-changed event", async () => {
    vi.useFakeTimers();

    // Create a ticket with a unique title we can track
    createTicket("Watch Me Change", "Description");
    render(<DashboardPage />);

    // Verify initial state
    expect(
      screen.getByRole("heading", { name: "Watch Me Change" }),
    ).toBeInTheDocument();

    // Enter edit mode, change title, save via Enter
    enterEditMode("Watch Me Change");
    const input = getEditInput();
    fireEvent.change(input, { target: { value: "Title Updated!" } });
    saveViaEnter();

    // At this point, the card exits edit mode but shows the original title
    // (it re-renders from props which haven't been updated yet).
    // The store has been mutated synchronously, but the dashboard
    // hasn't re-fetched yet because tickets-changed fires after 50ms debounce.

    // Advance past the 50ms persist debounce so tickets-changed fires
    vi.advanceTimersByTime(100);

    // Now the dashboard should have re-rendered with the new title
    // Use act to flush any pending React state updates
    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    // The new title should be visible
    expect(
      screen.getByRole("heading", { name: "Title Updated!" }),
    ).toBeInTheDocument();

    // Old title should not be present
    expect(
      screen.queryByRole("heading", { name: "Watch Me Change" }),
    ).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  // ── AC9: No regressions to CopyButton ────────────────────────────────

  it("AC9: CopyButton is present and does not trigger edit mode when clicked", () => {
    renderDashboardWithTicket("Copy Test Title");

    // CopyButton should be in the document
    const copyButton = screen.getByRole("button", { name: /Copy TIX-001/ });
    expect(copyButton).toBeInTheDocument();

    // Clicking CopyButton should NOT enter edit mode
    fireEvent.click(copyButton);

    // Title heading should still be visible (not in edit mode)
    expect(
      screen.getByRole("heading", { name: "Copy Test Title" }),
    ).toBeInTheDocument();

    // No edit input should be present
    expect(
      screen.queryByRole("textbox", { name: "Edit ticket title" }),
    ).not.toBeInTheDocument();
  });

  // ── AC10: Input auto-focuses when entering edit mode ─────────────────

  it("AC10: input auto-focuses when entering edit mode", () => {
    renderDashboardWithTicket();

    enterEditMode("Original Title");

    const input = getEditInput();
    expect(input).toHaveFocus();
  });
});
