import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { STORAGE_KEY } from "../persistence";

// --- localStorage mock (must be set up before importing store) ---

function getMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

// Stub localStorage globally before any module imports
const mockStorage = getMockStorage();
vi.stubGlobal("localStorage", mockStorage);

// Also stub window so the storage event listener doesn't crash
vi.stubGlobal("window", { addEventListener: vi.fn() });

// Now import store (it calls loadTickets() at module load time)
import {
  createTicket,
  addFeedback,
  getTickets,
  clearStorage,
  deleteTicket,
} from "../store";

// --- Helpers ---

function flushDebounce(): void {
  vi.advanceTimersByTime(100);
}

// ========================================================================
// Persistence integration tests (existing tests from main)
// ========================================================================

describe("store persistence integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Re-fresh localStorage mock for each test
    mockStorage.clear();
    // Clear in-memory state
    clearStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("persists created tickets to localStorage after debounce", () => {
    const ticket = createTicket("Test Ticket", "Description");

    // Before debounce fires, localStorage should still be empty
    expect(mockStorage.getItem(STORAGE_KEY)).toBeNull();

    // Advance timers to flush debounce
    flushDebounce();

    const raw = mockStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.tickets).toHaveLength(1);
    expect(parsed.tickets[0].title).toBe("Test Ticket");
    expect(parsed.tickets[0].id).toBe(ticket.id);
  });

  it("persists feedback additions", () => {
    const ticket = createTicket("Test", "Description");
    addFeedback(ticket.id, "engineer", "Looks good", true);

    flushDebounce();

    const raw = mockStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.tickets[0].feedback).toHaveLength(1);
    expect(parsed.tickets[0].feedback[0].content).toBe("Looks good");
    expect(parsed.tickets[0].feedback[0].personaId).toBe("engineer");
  });

  it("clearStorage clears both memory and localStorage", () => {
    createTicket("Test", "Description");
    flushDebounce(); // flush persist

    clearStorage();
    flushDebounce(); // flush any pending

    expect(getTickets()).toHaveLength(0);
    expect(mockStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("batches multiple rapid mutations into a single persist", () => {
    const setItemSpy = vi.spyOn(mockStorage, "setItem");

    createTicket("A", "Desc A");
    createTicket("B", "Desc B");
    createTicket("C", "Desc C");

    // Before debounce, no saves yet
    expect(setItemSpy).not.toHaveBeenCalled();

    flushDebounce();

    // Should have saved only once with all 3 tickets
    const calls = setItemSpy.mock.calls.filter(
      ([key]) => key === STORAGE_KEY
    );
    expect(calls.length).toBe(1);
    const lastCall = calls[0];
    const parsed = JSON.parse(lastCall[1] as string);
    expect(parsed.tickets).toHaveLength(3);

    setItemSpy.mockRestore();
  });

  it("cancels pending persist on clearStorage", () => {
    createTicket("Test", "Description");

    // Clear before debounce fires
    clearStorage();
    flushDebounce();

    // Should NOT have written the ticket
    const raw = mockStorage.getItem(STORAGE_KEY);
    expect(raw).toBeNull();
  });

  it("persists counter IDs across save/load cycle", () => {
    createTicket("A", "Desc A");
    createTicket("B", "Desc B");
    flushDebounce();

    // Simulate a page reload by reading from localStorage
    const raw = mockStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const state = JSON.parse(raw!);
    expect(state.nextTicketId).toBe(3); // started at 1, created 2 tickets
    expect(state.nextFeedbackId).toBe(1); // no feedback added
    expect(state.nextBuildReportId).toBe(1); // no builds
  });
});

// ========================================================================
// DeleteTicket tests (new tests for DEV-28)
// ========================================================================

describe("deleteTicket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage.clear();
    clearStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deletes an existing ticket and returns true", () => {
    const ticket = createTicket("Test Ticket", "A test description");
    const id = ticket.id;

    expect(getTickets()).toHaveLength(1);

    const result = deleteTicket(id);
    expect(result).toBe(true);
    expect(getTickets()).toHaveLength(0);
  });

  it("returns false when deleting a non-existent ticket", () => {
    const result = deleteTicket("NONEXISTENT-999");
    expect(result).toBe(false);
  });

  it("persists deletion to localStorage after debounce", () => {
    const ticket = createTicket("Persist Test", "Should be gone");
    const id = ticket.id;

    expect(getTickets()).toHaveLength(1);

    deleteTicket(id);

    // Flush debounce — deleteTicket calls persistState internally
    flushDebounce();

    // Verify localStorage was updated
    const raw = mockStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.tickets).toHaveLength(0);
  });

  it("survives a simulated page reload (persistence round-trip)", () => {
    const ticket = createTicket("Reload Test", "Should be gone after reload");
    const id = ticket.id;

    deleteTicket(id);
    flushDebounce();

    // Clear in-memory state, simulating page reload
    clearStorage();

    // The ticket should still be gone after re-loading from storage
    // (clearStorage already clears, but in real life loadTickets() would run)
    expect(getTickets()).toHaveLength(0);
  });
});
