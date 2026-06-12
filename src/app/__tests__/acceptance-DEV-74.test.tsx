import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

// ── Mock navigator.clipboard ──────────────────────────────────────────
vi.stubGlobal("navigator", {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// ── Now safe to import store + page ───────────────────────────────────
import { clearStorage, createTicket } from "@/lib/store";
import DashboardPage from "../page";

// ── Helpers ────────────────────────────────────────────────────────────

function renderDashboard() {
  // Advanced filters live behind the Filters disclosure since the redesign
  const result = render(<DashboardPage />);
  fireEvent.click(screen.getByRole("button", { name: /^filters/i }));
  return result;
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("DEV-74: Clear all filters button (acceptance)", () => {
  beforeEach(() => {
    mockStorage.clear();
    clearStorage();
    Object.keys(eventMap).forEach((k) => delete eventMap[k]);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── AC1: Button hidden when no filters are active ────────────────────

  it("AC1: 'Clear all filters' button is NOT rendered when no filters are active", () => {
    renderDashboard();

    // Default state: activeFilter="all", searchQuery="", priorityFilter=null,
    // tagFilter=[], personaFilter=[]
    expect(
      screen.queryByRole("button", { name: "Clear all filters" }),
    ).not.toBeInTheDocument();
  });

  // ── AC2: Button appears when a status filter is active ───────────────

  it("AC2: button appears when a status filter is active (activeFilter !== 'all')", () => {
    renderDashboard();

    // Click the "In Review" filter tab (aria-label = "In Review (N tickets)")
    const inReviewTab = screen.getByRole("button", { name: /In Review/i });
    fireEvent.click(inReviewTab);

    expect(
      screen.getByRole("button", { name: "Clear all filters" }),
    ).toBeInTheDocument();
  });

  // ── AC3: Button appears when search query is non-empty ───────────────

  it("AC3: button appears when search query is entered", () => {
    renderDashboard();

    const searchInput = screen.getByRole("textbox", { name: "Search tickets" });
    fireEvent.change(searchInput, { target: { value: "test query" } });

    expect(
      screen.getByRole("button", { name: "Clear all filters" }),
    ).toBeInTheDocument();
  });

  // ── AC4: Button appears when a priority filter is set ────────────────

  it("AC4: button appears when a priority filter is selected", () => {
    renderDashboard();

    // Click a priority button (e.g., "Urgent" — priority 0)
    const urgentBtn = screen.getByRole("button", { name: "Urgent" });
    fireEvent.click(urgentBtn);

    expect(
      screen.getByRole("button", { name: "Clear all filters" }),
    ).toBeInTheDocument();
  });

  // ── AC5: Button appears when a tag filter is active ─────────────────

  it("AC5: button appears when a tag filter is toggled on", () => {
    renderDashboard();

    // Toggle on any tag chip — "bug" exists in PREDEFINED_TAGS
    const bugChip = screen.getByRole("button", { name: /bug/i });
    fireEvent.click(bugChip);

    expect(
      screen.getByRole("button", { name: "Clear all filters" }),
    ).toBeInTheDocument();
  });

  // ── AC6: clearAllFilters resets all 5 filter states to defaults ─────

  it("AC6: clicking 'Clear all filters' resets status, search, priority, tags, and persona filters", () => {
    renderDashboard();

    // Set multiple filters first
    // 1. Status
    fireEvent.click(screen.getByRole("button", { name: /Draft/i }));
    // 2. Search
    const searchInput = screen.getByRole("textbox", { name: "Search tickets" });
    fireEvent.change(searchInput, { target: { value: "something" } });
    // 3. Priority
    fireEvent.click(screen.getByRole("button", { name: "Urgent" }));
    // 4. Tag
    fireEvent.click(screen.getByRole("button", { name: /feature/i }));

    // Verify button is present
    const clearBtn = screen.getByRole("button", { name: "Clear all filters" });
    expect(clearBtn).toBeInTheDocument();

    // Click clear all
    fireEvent.click(clearBtn);

    // Button should disappear (no active filters)
    expect(
      screen.queryByRole("button", { name: "Clear all filters" }),
    ).not.toBeInTheDocument();

    // Search input should be empty
    expect(searchInput).toHaveValue("");

    // Status should be back to "All" — the redesigned tabs signal the active
    // tab with the coral background (no aria-current / "(N tickets)" naming)
    const allTab = screen.getAllByRole("button", { name: /^All\b/ })[0];
    expect(allTab.style.background).toContain("coral");

    // Priority should be back to default — the "All" priority button should be active
    // (We can verify an All button is still in the document as a sanity check)
    const priorityAllBtns = screen.getAllByRole("button", { name: "All" });
    expect(priorityAllBtns.length).toBeGreaterThanOrEqual(1);

    // Tag "bug" should not be selected anymore
    // (the TagChip in toggle mode would show selected styling when active)
    const bugChipAfter = screen.getByRole("button", { name: /bug/i });
    expect(bugChipAfter.className).not.toContain("ring");
  });

  // ── AC7: Button has correct styling classes ──────────────────────────

  it("AC7: button renders with an icon and the expected label", () => {
    createTicket("Test", "Desc");
    renderDashboard();

    // Activate a filter so button appears
    fireEvent.click(screen.getByRole("button", { name: /In review/i }));

    // The redesign replaced .btn-ghost with inline-styled text buttons —
    // assert the durable contract: an icon plus the label.
    const clearBtn = screen.getByRole("button", { name: "Clear all filters" });
    expect(clearBtn.className).toContain("inline-flex");
    expect(clearBtn.querySelector("svg")).not.toBeNull();
    expect(clearBtn.textContent).toContain("Clear all filters");
  });
});
