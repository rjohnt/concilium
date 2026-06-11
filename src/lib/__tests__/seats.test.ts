import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  normalizeSeats,
  defaultSeat,
  getSeat,
  getAiHeldPersonas,
  isSeatHeldByOtherHuman,
  summarizeSeatOccupancy,
  getPreferredRole,
  setPreferredRole,
} from "../seats";
import { createTicket, claimSeat, releaseSeat, getSeats, clearStorage } from "../store";
import { Ticket, Seat, PersonaId } from "../types";

// Server sync is fire-and-forget; stub fetch so it never hits the network
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));

// This jsdom setup doesn't provide localStorage — stub it (repo convention)
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

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "TIX-900",
    title: "Test",
    description: "",
    status: "in-review",
    priority: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [],
    feedback: [],
    approvals: [],
    ...overrides,
  };
}

const ALL_PERSONAS: PersonaId[] = ["engineer", "designer", "product-owner", "qa"];

describe("normalizeSeats", () => {
  it("defaults every persona seat to an AI stand-in", () => {
    const seats = normalizeSeats();
    for (const id of ALL_PERSONAS) {
      expect(seats[id]).toEqual({ personaId: id, occupant: "ai" });
    }
  });

  it("preserves existing seats and fills in missing ones", () => {
    const humanSeat: Seat = {
      personaId: "engineer",
      occupant: "human",
      claimedBy: "client-1",
      claimedByLabel: "ryan",
    };
    const seats = normalizeSeats({ engineer: humanSeat });
    expect(seats.engineer).toEqual(humanSeat);
    expect(seats.designer.occupant).toBe("ai");
    expect(seats.qa.occupant).toBe("ai");
  });
});

describe("seat queries", () => {
  it("getSeat falls back to the AI default for legacy tickets without seats", () => {
    const ticket = makeTicket();
    expect(getSeat(ticket, "designer")).toEqual(defaultSeat("designer"));
  });

  it("getAiHeldPersonas excludes human-held seats", () => {
    const ticket = makeTicket({
      seats: {
        engineer: { personaId: "engineer", occupant: "human", claimedBy: "c1" },
      },
    });
    expect(getAiHeldPersonas(ticket)).toEqual(["designer", "product-owner", "qa"]);
  });

  it("isSeatHeldByOtherHuman distinguishes own vs other claims", () => {
    const ticket = makeTicket({
      seats: {
        engineer: { personaId: "engineer", occupant: "human", claimedBy: "c1" },
      },
    });
    expect(isSeatHeldByOtherHuman(ticket, "engineer", "c1")).toBe(false);
    expect(isSeatHeldByOtherHuman(ticket, "engineer", "c2")).toBe(true);
    expect(isSeatHeldByOtherHuman(ticket, "designer", "c2")).toBe(false);
  });
});

describe("summarizeSeatOccupancy", () => {
  it("counts human and AI seats across active tickets only", () => {
    const t1 = makeTicket({
      id: "TIX-901",
      seats: {
        engineer: { personaId: "engineer", occupant: "human", claimedBy: "c1" },
      },
    });
    const t2 = makeTicket({ id: "TIX-902" });
    const done = makeTicket({ id: "TIX-903", status: "done" });

    const summary = summarizeSeatOccupancy([t1, t2, done]);
    expect(summary.ticketCount).toBe(2);
    expect(summary.totalSeats).toBe(8);
    expect(summary.humanSeats).toBe(1);
    expect(summary.aiSeats).toBe(7);
    expect(summary.perPersona.engineer).toEqual({ human: 1, ai: 1 });
    expect(summary.perPersona.designer).toEqual({ human: 0, ai: 2 });
  });

  it("returns zero seats for an empty ticket list", () => {
    const summary = summarizeSeatOccupancy([]);
    expect(summary.totalSeats).toBe(0);
    expect(summary.humanSeats).toBe(0);
  });
});

describe("preferred role persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a valid persona id", () => {
    expect(getPreferredRole()).toBeNull();
    setPreferredRole("designer");
    expect(getPreferredRole()).toBe("designer");
  });

  it("rejects garbage stored values", () => {
    localStorage.setItem("concilium-preferred-role", "not-a-persona");
    expect(getPreferredRole()).toBeNull();
  });
});

describe("store seat claims", () => {
  beforeEach(() => {
    clearStorage();
  });

  it("new tickets start with all seats AI-held", () => {
    const ticket = createTicket("Seats", "desc");
    const seats = getSeats(ticket.id);
    for (const id of ALL_PERSONAS) {
      expect(seats[id].occupant).toBe("ai");
    }
  });

  it("claims a seat for a human and records the claimant", () => {
    const ticket = createTicket("Seats", "desc");
    const seat = claimSeat(ticket.id, "engineer", "client-1", "ryan");
    expect(seat).not.toBeNull();
    expect(seat!.occupant).toBe("human");
    expect(seat!.claimedBy).toBe("client-1");
    expect(getSeats(ticket.id).engineer.claimedByLabel).toBe("ryan");
  });

  it("blocks claiming a seat held by another human", () => {
    const ticket = createTicket("Seats", "desc");
    claimSeat(ticket.id, "engineer", "client-1", "ryan");
    expect(claimSeat(ticket.id, "engineer", "client-2", "sam")).toBeNull();
  });

  it("re-claiming your own seat succeeds (idempotent for the same client)", () => {
    const ticket = createTicket("Seats", "desc");
    claimSeat(ticket.id, "engineer", "client-1", "ryan");
    expect(claimSeat(ticket.id, "engineer", "client-1", "ryan")).not.toBeNull();
  });

  it("releases a seat back to the AI stand-in, only for the claimant", () => {
    const ticket = createTicket("Seats", "desc");
    claimSeat(ticket.id, "engineer", "client-1", "ryan");

    expect(releaseSeat(ticket.id, "engineer", "client-2")).toBeNull();
    expect(getSeats(ticket.id).engineer.occupant).toBe("human");

    const released = releaseSeat(ticket.id, "engineer", "client-1");
    expect(released).not.toBeNull();
    expect(getSeats(ticket.id).engineer.occupant).toBe("ai");
  });

  it("releasing an AI-held seat is a no-op", () => {
    const ticket = createTicket("Seats", "desc");
    expect(releaseSeat(ticket.id, "qa", "client-1")).toBeNull();
  });
});
