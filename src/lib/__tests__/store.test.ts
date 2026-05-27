import { describe, it, expect, beforeEach } from "vitest";
import {
  deleteTicket,
  createTicket,
  getTickets,
  loadPersistedState,
} from "../store";

const STORAGE_KEY = "concilium-tickets";

/**
 * Helper: reset in-memory state and localStorage for test isolation.
 */
function resetStore() {
  localStorage.removeItem(STORAGE_KEY);
  const all = getTickets();
  for (const t of all) {
    deleteTicket(t.id);
  }
  localStorage.removeItem(STORAGE_KEY);
}

beforeEach(() => {
  resetStore();
});

describe("deleteTicket", () => {
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

  it("persists deletion to localStorage", () => {
    const ticket = createTicket("Persist Test", "Should persist");
    const id = ticket.id;

    expect(getTickets()).toHaveLength(1);

    // Delete — this calls persistState internally
    deleteTicket(id);

    // Verify localStorage was updated
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(0);
  });

  it("reloads from localStorage showing ticket is gone (persistence test)", () => {
    const ticket = createTicket("Cross-reload Test", "Should be gone after reload");
    const id = ticket.id;

    // Delete and persist
    deleteTicket(id);

    // Clear in-memory (simulate reload)
    const allBefore = getTickets();
    for (const t of allBefore) {
      if (t.id !== id) {
        deleteTicket(t.id);
      }
    }

    // Load from persisted state
    loadPersistedState();

    // The ticket should still be gone
    const tickets = getTickets();
    const found = tickets.find((t) => t.id === id);
    expect(found).toBeUndefined();
  });

  it("handles cross-tab sync pattern: deletion in one tab is visible after reload in another", () => {
    // Tab A: create and delete
    const ticket = createTicket("Cross-tab Ticket", "Tab A deletes this");
    deleteTicket(ticket.id);

    // Verify localStorage has no tickets
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(0);

    // Tab B: load from localStorage (simulating another tab)
    loadPersistedState();
    const ticketsInTabB = getTickets();
    expect(ticketsInTabB).toHaveLength(0);
  });
});
