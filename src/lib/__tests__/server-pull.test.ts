import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTicket, pullFromServer, getTickets, getTicket, clearStorage } from "../store";
import { Ticket } from "../types";

// jsdom here doesn't provide localStorage — stub it (repo convention)
function getMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}
vi.stubGlobal("localStorage", getMockStorage());

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function serverTicket(id: string, title: string): Ticket {
  return {
    id,
    title,
    description: "",
    status: "draft",
    priority: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [],
    feedback: [],
    approvals: [],
    seats: {},
  };
}

// pullFromServer reads syncPullAll → GET /api/sync → { tickets }
function mockSyncReturns(tickets: Ticket[]) {
  fetchMock.mockImplementation(async (url: string) => {
    if (typeof url === "string" && url.includes("/api/sync")) {
      return { ok: true, json: async () => ({ tickets }) };
    }
    // createTicketOnServer POST etc. — pretend offline so it stays pending
    return { ok: false, json: async () => ({}) };
  });
}

beforeEach(() => {
  clearStorage();
  fetchMock.mockReset();
});

describe("pullFromServer", () => {
  it("replaces local state with the authoritative server snapshot", async () => {
    mockSyncReturns([serverTicket("TIX-100", "From server A"), serverTicket("TIX-101", "From server B")]);

    await pullFromServer();

    const ids = getTickets().map((t) => t.id).sort();
    expect(ids).toEqual(["TIX-100", "TIX-101"]);
  });

  it("drops a local ticket the server omits (treated as a peer deletion)", async () => {
    // A ticket that exists locally but is NOT pending (e.g. confirmed earlier)
    mockSyncReturns([serverTicket("TIX-100", "seed")]);
    await pullFromServer(); // local now = [TIX-100]
    expect(getTicket("TIX-100")).toBeDefined();

    // Server no longer returns TIX-100 → it should disappear locally
    mockSyncReturns([serverTicket("TIX-200", "new")]);
    await pullFromServer();

    expect(getTicket("TIX-100")).toBeUndefined();
    expect(getTicket("TIX-200")).toBeDefined();
  });

  it("preserves an optimistic local create the server hasn't confirmed yet", async () => {
    // createTicket fires a POST that we force offline → stays pending
    mockSyncReturns([]); // POST returns ok:false via the impl above
    const local = createTicket("My optimistic ticket", "desc");
    expect(getTicket(local.id)).toBeDefined();

    // A server pull arrives that doesn't include our pending ticket
    mockSyncReturns([serverTicket("TIX-300", "someone else")]);
    await pullFromServer();

    // Both survive: the pending local one and the server one
    expect(getTicket(local.id), "pending local create preserved").toBeDefined();
    expect(getTicket("TIX-300"), "server ticket applied").toBeDefined();
  });

  it("confirms a pending create once the server reports it, so a later omission deletes it", async () => {
    mockSyncReturns([]);
    const local = createTicket("Will be confirmed", "desc");

    // Server now includes it → confirmed (no longer pending)
    mockSyncReturns([serverTicket(local.id, "Will be confirmed")]);
    await pullFromServer();
    expect(getTicket(local.id)).toBeDefined();

    // Server later omits it → now treated as a deletion
    mockSyncReturns([serverTicket("TIX-400", "other")]);
    await pullFromServer();
    expect(getTicket(local.id)).toBeUndefined();
  });
});
