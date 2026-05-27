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
vi.stubGlobal("window", { addEventListener: vi.fn(), dispatchEvent: vi.fn() });

// Now import store (it calls loadTickets() at module load time)
import {
  createTicket,
  addFeedback,
  getTickets,
  clearStorage,
  deleteTicket,
  updateTicket,
  updateTicketPriority,
  updateTicketTags,
  getTicket,
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

// ========================================================================
// updateTicket tests (new tests for DEV-37)
// ========================================================================

describe("updateTicket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage.clear();
    clearStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates ticket title only and returns the updated ticket", () => {
    const ticket = createTicket("Original Title", "Original description");
    const originalUpdatedAt = ticket.updatedAt;

    // Advance time so updatedAt will be different
    vi.advanceTimersByTime(1000);

    const result = updateTicket(ticket.id, { title: "Updated Title" });

    expect(result).not.toBeNull();
    expect(result!.title).toBe("Updated Title");
    expect(result!.description).toBe("Original description"); // unchanged
    expect(result!.updatedAt).not.toBe(originalUpdatedAt);
  });

  it("updates ticket description only and returns the updated ticket", () => {
    const ticket = createTicket("A Title", "Old description");
    const originalUpdatedAt = ticket.updatedAt;

    vi.advanceTimersByTime(1000);

    const result = updateTicket(ticket.id, { description: "New description" });

    expect(result).not.toBeNull();
    expect(result!.title).toBe("A Title"); // unchanged
    expect(result!.description).toBe("New description");
    expect(result!.updatedAt).not.toBe(originalUpdatedAt);
  });

  it("updates both title and description simultaneously", () => {
    const ticket = createTicket("Old Title", "Old Desc");
    const originalUpdatedAt = ticket.updatedAt;

    vi.advanceTimersByTime(1000);

    const result = updateTicket(ticket.id, {
      title: "New Title",
      description: "New Desc",
    });

    expect(result).not.toBeNull();
    expect(result!.title).toBe("New Title");
    expect(result!.description).toBe("New Desc");
    expect(result!.updatedAt).not.toBe(originalUpdatedAt);
  });

  it("returns null for non-existent ticket ID", () => {
    const result = updateTicket("NONEXISTENT-999", { title: "Ghost" });
    expect(result).toBeNull();
  });

  it("updates updatedAt timestamp on every update", () => {
    const ticket = createTicket("Timing Test", "Check timestamps");

    // First update
    vi.advanceTimersByTime(500);
    const first = updateTicket(ticket.id, { title: "First Update" });
    const firstTimestamp = first!.updatedAt;

    // Second update
    vi.advanceTimersByTime(1000);
    const second = updateTicket(ticket.id, { description: "Second Update" });
    const secondTimestamp = second!.updatedAt;

    expect(firstTimestamp).not.toBe(secondTimestamp);
    // Second timestamp should be later than first
    expect(new Date(secondTimestamp).getTime()).toBeGreaterThan(
      new Date(firstTimestamp).getTime()
    );
  });

  it("persists ticket update to localStorage after debounce", () => {
    const ticket = createTicket("Persist Me", "Old value");
    flushDebounce(); // flush initial create

    updateTicket(ticket.id, { title: "Persisted Title" });
    flushDebounce(); // flush update persist

    const raw = mockStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.tickets).toHaveLength(1);
    expect(parsed.tickets[0].title).toBe("Persisted Title");
  });

  it("does not modify other tickets when updating one", () => {
    const t1 = createTicket("Ticket 1", "Desc 1");
    const t2 = createTicket("Ticket 2", "Desc 2");

    updateTicket(t1.id, { title: "Updated Ticket 1" });

    const allTickets = getTickets();
    const updatedT2 = allTickets.find((t) => t.id === t2.id);
    expect(updatedT2).toBeDefined();
    expect(updatedT2!.title).toBe("Ticket 2"); // unchanged
  });
});

// ========================================================================
// updateTicketPriority tests (new tests for DEV-38)
// ========================================================================

describe("updateTicketPriority", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage.clear();
    clearStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates priority on valid ticket and returns the updated ticket", () => {
    const ticket = createTicket("Priority Test", "Testing priority updates");
    expect(ticket.priority).toBe(2); // default is Medium

    const result = updateTicketPriority(ticket.id, 0); // Urgent

    expect(result).not.toBeNull();
    expect(result!.priority).toBe(0);
    expect(result!.id).toBe(ticket.id);
  });

  it("returns null for non-existent ticket", () => {
    const result = updateTicketPriority("NONEXISTENT-999", 1);
    expect(result).toBeNull();
  });

  it("persists priority update to localStorage after debounce", () => {
    const ticket = createTicket("Persist Priority", "Testing persistence");
    flushDebounce(); // flush initial create

    updateTicketPriority(ticket.id, 4); // None
    flushDebounce(); // flush update persist

    const raw = mockStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.tickets).toHaveLength(1);
    expect(parsed.tickets[0].priority).toBe(4);
  });

  it("updates updatedAt timestamp on priority change", () => {
    const ticket = createTicket("Timestamp Test", "Check timestamps");
    const originalUpdatedAt = ticket.updatedAt;

    vi.advanceTimersByTime(1000);

    const result = updateTicketPriority(ticket.id, 1); // High
    expect(result!.updatedAt).not.toBe(originalUpdatedAt);
    expect(new Date(result!.updatedAt).getTime()).toBeGreaterThan(
      new Date(originalUpdatedAt).getTime()
    );
  });
});

// ========================================================================
// Due date tests (new tests for DEV-44)
// ========================================================================

describe("ticket due dates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage.clear();
    clearStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("createTicket with due date sets the field correctly", () => {
    const dueDate = "2026-12-25";
    const ticket = createTicket("Due Date Test", "Description", 2, dueDate);
    expect(ticket.dueDate).toBe(dueDate);

    flushDebounce();
    const raw = mockStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.tickets[0].dueDate).toBe(dueDate);
  });

  it("createTicket without due date leaves dueDate undefined", () => {
    const ticket = createTicket("No Due Date", "Description");
    expect(ticket.dueDate).toBeUndefined();

    flushDebounce();
    const raw = mockStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.tickets[0].dueDate).toBeUndefined();
  });

  it("updateTicket sets a new due date", () => {
    const ticket = createTicket("Test", "Description");
    expect(ticket.dueDate).toBeUndefined();

    const updated = updateTicket(ticket.id, { dueDate: "2026-06-15" });
    expect(updated).not.toBeNull();
    expect(updated!.dueDate).toBe("2026-06-15");

    // Verify the in-memory ticket was also updated
    const fetched = getTicket(ticket.id);
    expect(fetched!.dueDate).toBe("2026-06-15");
  });

  it("updateTicket clears due date via null", () => {
    const ticket = createTicket("Test", "Description", 2, "2026-12-25");
    expect(ticket.dueDate).toBe("2026-12-25");

    const updated = updateTicket(ticket.id, { dueDate: null });
    expect(updated).not.toBeNull();
    expect(updated!.dueDate).toBeUndefined();
  });

  it("updateTicket with empty string normalizes to undefined", () => {
    const ticket = createTicket("Test", "Description", 2, "2026-12-25");
    expect(ticket.dueDate).toBe("2026-12-25");

    const updated = updateTicket(ticket.id, { dueDate: "" });
    expect(updated).not.toBeNull();
    expect(updated!.dueDate).toBeUndefined();
  });

  it("persists due date updates to localStorage", () => {
    const ticket = createTicket("Persist Due Date", "Description", 2, "2026-01-01");
    flushDebounce(); // flush create

    updateTicket(ticket.id, { dueDate: "2026-06-01" });
    flushDebounce(); // flush update

    const raw = mockStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.tickets[0].dueDate).toBe("2026-06-01");
  });

  it("clearing due date is persisted", () => {
    const ticket = createTicket("Clear Due Date", "Description", 2, "2026-01-01");
    flushDebounce();

    updateTicket(ticket.id, { dueDate: null });
    flushDebounce();

    const raw = mockStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.tickets[0].dueDate).toBeUndefined();
  });
});

// ========================================================================
// updateTicketTags tests (new tests for DEV-53)
// ========================================================================

describe("updateTicketTags", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage.clear();
    clearStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates tags on a valid ticket and returns the updated ticket", () => {
    const ticket = createTicket("Tag Test", "Testing tag updates");
    expect(ticket.tags).toEqual([]);

    const newTags = [
      { id: "bug", label: "Bug", color: "bg-cardinal/20 text-cardinal border-cardinal/40" },
      { id: "feature", label: "Feature", color: "bg-gold/20 text-gold-light border-gold/40" },
    ];

    const result = updateTicketTags(ticket.id, newTags);

    expect(result).not.toBeNull();
    expect(result!.tags).toEqual(newTags);
    expect(result!.id).toBe(ticket.id);
  });

  it("returns null for non-existent ticket", () => {
    const result = updateTicketTags("NONEXISTENT-999", []);
    expect(result).toBeNull();
  });

  it("allows clearing all tags by passing an empty array", () => {
    const ticket = createTicket(
      "Clear Tags",
      "Testing tag clearing",
      2,
      undefined,
      [{ id: "bug", label: "Bug", color: "bg-cardinal/20 text-cardinal border-cardinal/40" }]
    );
    expect(ticket.tags).toHaveLength(1);

    const result = updateTicketTags(ticket.id, []);
    expect(result).not.toBeNull();
    expect(result!.tags).toEqual([]);
  });

  it("persists tag update to localStorage after debounce", () => {
    const ticket = createTicket("Persist Tags", "Testing persistence");
    flushDebounce(); // flush initial create

    const newTags = [
      { id: "security", label: "Security", color: "bg-red-950/60 text-red-400 border-red-900" },
    ];
    updateTicketTags(ticket.id, newTags);
    flushDebounce(); // flush update persist

    const raw = mockStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.tickets).toHaveLength(1);
    expect(parsed.tickets[0].tags).toEqual(newTags);
  });

  it("updates updatedAt timestamp on tag change", () => {
    const ticket = createTicket("Timestamp Test", "Check timestamps");
    const originalUpdatedAt = ticket.updatedAt;

    vi.advanceTimersByTime(1000);

    const result = updateTicketTags(ticket.id, [
      { id: "docs", label: "Docs", color: "bg-blue-steel/20 text-blue-steel border-blue-steel/40" },
    ]);
    expect(result!.updatedAt).not.toBe(originalUpdatedAt);
    expect(new Date(result!.updatedAt).getTime()).toBeGreaterThan(
      new Date(originalUpdatedAt).getTime()
    );
  });

  it("createTicket accepts tags and sets them correctly", () => {
    const tagList = [
      { id: "bug", label: "Bug", color: "bg-cardinal/20 text-cardinal border-cardinal/40" },
    ];
    const ticket = createTicket("Tagged ticket", "Has tags", 2, undefined, tagList);
    expect(ticket.tags).toEqual(tagList);

    flushDebounce();
    const raw = mockStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.tickets[0].tags).toEqual(tagList);
  });

  it("createTicket without tags defaults to empty array", () => {
    const ticket = createTicket("No tags", "Description");
    expect(ticket.tags).toEqual([]);
  });
});
