import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createTicket,
  setBuildReport,
  updateTicketStatus,
  requestBuildChanges,
  getOpenChangeRequests,
  rebuildWithChanges,
  getTicket,
  clearStorage,
} from "../store";
import { BuildReport } from "../types";

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

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function makeCompletedReport(ticketId: string): BuildReport {
  return {
    id: "BLD-001",
    ticketId,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: "completed",
    requirements: ["req"],
    designDecisions: ["dd"],
    qaCriteria: ["qa"],
    implementationPlan: "plan",
    consensusSummary: "summary",
  };
}

/** Walk a ticket to done with a completed build report. */
function setupDoneTicket(): string {
  const ticket = createTicket("Loop ticket", "desc");
  setBuildReport(ticket.id, makeCompletedReport(ticket.id));
  updateTicketStatus(ticket.id, "in-review");
  updateTicketStatus(ticket.id, "consensus");
  updateTicketStatus(ticket.id, "building");
  updateTicketStatus(ticket.id, "done");
  return ticket.id;
}

beforeEach(() => {
  clearStorage();
  fetchMock.mockReset();
  // Default: server unreachable so requests fall back to local-only
  fetchMock.mockRejectedValue(new Error("offline"));
});

describe("requestBuildChanges", () => {
  it("files a role-scoped change request on the completed build (offline fallback)", async () => {
    const ticketId = setupDoneTicket();

    const cr = await requestBuildChanges(ticketId, "designer", "Increase contrast on the toolbar");
    expect(cr).not.toBeNull();
    expect(cr!.personaId).toBe("designer");
    expect(getOpenChangeRequests(ticketId)).toHaveLength(1);
  });

  it("uses the server-issued change request when the API responds", async () => {
    const ticketId = setupDoneTicket();
    const serverCr = {
      id: "CR-server",
      personaId: "qa",
      content: "Add regression tests",
      createdAt: new Date().toISOString(),
    };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ changeRequest: serverCr }),
    });

    const cr = await requestBuildChanges(ticketId, "qa", "Add regression tests");
    expect(cr!.id).toBe("CR-server");
  });

  it("rejects empty content and tickets without a build report", async () => {
    const ticketId = setupDoneTicket();
    expect(await requestBuildChanges(ticketId, "qa", "   ")).toBeNull();

    const bare = createTicket("No report", "desc");
    expect(await requestBuildChanges(bare.id, "qa", "do something")).toBeNull();
  });
});

describe("rebuildWithChanges", () => {
  it("requires open change requests", async () => {
    const ticketId = setupDoneTicket();
    expect(await rebuildWithChanges(ticketId)).toBeNull();
    expect(getTicket(ticketId)!.status).toBe("done");
  });

  it("re-kicks the build and completes with the new report", async () => {
    const ticketId = setupDoneTicket();
    await requestBuildChanges(ticketId, "designer", "Tighten spacing");

    const newReport: BuildReport = {
      ...makeCompletedReport(ticketId),
      id: "BLD-002",
      status: "completed",
      changeRequests: [
        {
          id: "CR-1",
          personaId: "designer",
          content: "Tighten spacing",
          createdAt: new Date().toISOString(),
          resolvedByBuildId: "BLD-002",
        },
      ],
    };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ buildReport: newReport }),
    });

    const result = await rebuildWithChanges(ticketId);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("BLD-002");

    const ticket = getTicket(ticketId)!;
    expect(ticket.status).toBe("done");
    expect(getOpenChangeRequests(ticketId)).toHaveLength(0);
  });

  it("restores done state when the rebuild API fails", async () => {
    const ticketId = setupDoneTicket();
    await requestBuildChanges(ticketId, "engineer", "Use the existing client");

    fetchMock.mockRejectedValue(new Error("offline"));
    const result = await rebuildWithChanges(ticketId);
    expect(result).toBeNull();

    const ticket = getTicket(ticketId)!;
    expect(ticket.status).toBe("done");
    expect(ticket.buildReport!.status).toBe("completed");
    // The change request survives for the next attempt
    expect(getOpenChangeRequests(ticketId)).toHaveLength(1);
  });
});
