import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  saveTickets,
  loadTickets,
  clearStorage,
  DEFAULT_STORE_STATE,
  STORAGE_KEY,
} from "../persistence";
import { Ticket } from "../types";

// --- localStorage mock for test environments that don't provide it ---

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

function setupLocalStorage() {
  const mock = getMockStorage();
  vi.stubGlobal("localStorage", mock);
}

// --- Helpers ---

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "TIX-001",
    title: "Test ticket",
    description: "A test",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    feedback: [],
    approvals: [],
    ...overrides,
  };
}

describe("persistence", () => {
  beforeEach(() => {
    setupLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("saveTickets → loadTickets round-trip", () => {
    it("persists and restores tickets correctly", () => {
      const tickets = [
        makeTicket({ id: "TIX-001", title: "First" }),
        makeTicket({ id: "TIX-002", title: "Second" }),
      ];
      saveTickets(tickets, 5, 10, 3);

      const state = loadTickets();
      expect(state.tickets).toHaveLength(2);
      expect(state.tickets[0].id).toBe("TIX-001");
      expect(state.tickets[1].id).toBe("TIX-002");
      expect(state.nextTicketId).toBe(5);
      expect(state.nextFeedbackId).toBe(10);
      expect(state.nextBuildReportId).toBe(3);
    });

    it("stores the version field in the persisted state", () => {
      saveTickets([], 1, 1, 1);
      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.version).toBe(1);
    });
  });

  describe("loadTickets", () => {
    it("returns defaults when localStorage is empty", () => {
      const state = loadTickets();
      expect(state).toEqual(DEFAULT_STORE_STATE);
    });

    it("returns defaults when localStorage has corrupt JSON", () => {
      localStorage.setItem(STORAGE_KEY, "{not valid json");
      const state = loadTickets();
      expect(state).toEqual(DEFAULT_STORE_STATE);
    });

    it("returns defaults when tickets is not an array", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          tickets: "not-an-array",
          nextTicketId: 1,
          nextFeedbackId: 1,
          nextBuildReportId: 1,
        })
      );
      const state = loadTickets();
      expect(state).toEqual(DEFAULT_STORE_STATE);
    });

    it("falls back to 1 for non-numeric counter fields", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          tickets: [],
          nextTicketId: "abc",
          nextFeedbackId: null,
          nextBuildReportId: undefined,
        })
      );
      const state = loadTickets();
      expect(state.nextTicketId).toBe(1);
      expect(state.nextFeedbackId).toBe(1);
      expect(state.nextBuildReportId).toBe(1);
    });

    it("returns defaults when window is undefined (SSR path)", () => {
      vi.stubGlobal("window", undefined);
      const state = loadTickets();
      expect(state).toEqual(DEFAULT_STORE_STATE);
    });

    it("filters out invalid tickets (per-element validation)", () => {
      const validTicket = makeTicket();
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          tickets: [
            validTicket,
            { notATicket: true },
            { id: "no-title", feedback: [] },
            { id: "no-feedback", title: "title-only" },
          ],
          nextTicketId: 1,
          nextFeedbackId: 1,
          nextBuildReportId: 1,
        })
      );
      const state = loadTickets();
      expect(state.tickets).toHaveLength(1);
      expect(state.tickets[0].id).toBe("TIX-001");
    });

    it("accepts tickets with extra fields beyond the required minimum", () => {
      const ticket = makeTicket({ status: "in-review" } as Partial<Ticket>);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          tickets: [ticket],
          nextTicketId: 2,
          nextFeedbackId: 1,
          nextBuildReportId: 1,
        })
      );
      const state = loadTickets();
      expect(state.tickets).toHaveLength(1);
      expect(state.tickets[0].status).toBe("in-review");
    });
  });

  describe("clearStorage", () => {
    it("removes the key from localStorage", () => {
      saveTickets([makeTicket()], 1, 1, 1);
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

      clearStorage();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("is a no-op when the key does not exist", () => {
      expect(() => clearStorage()).not.toThrow();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe("saveTickets error handling", () => {
    it("handles QuotaExceededError gracefully", () => {
      const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementationOnce(() => {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        });

      // Should not throw
      expect(() => saveTickets([makeTicket()], 1, 1, 1)).not.toThrow();

      setItemSpy.mockRestore();
    });
  });
});
