import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkConsensusThreshold, getBuildReadiness, DEFAULT_THRESHOLD } from "../consensus-threshold";
import { Ticket } from "../types";

// Create a minimal ticket stub for testing
function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "TIX-001",
    title: "Test Ticket",
    description: "A test ticket for consensus testing",
    status: "in-review",
    priority: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    tags: [],
    feedback: [],
    approvals: [],
    ...overrides,
  };
}

// ========================================================================
// checkConsensusThreshold
// ========================================================================

describe("checkConsensusThreshold", () => {
  it("returns not reached when no approvals", () => {
    const ticket = makeTicket({ approvals: [] });
    const result = checkConsensusThreshold(ticket);
    expect(result.reached).toBe(false);
    expect(result.progress).toBe(0);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("returns not reached with 1 of 4 approvals (25%)", () => {
    const ticket = makeTicket({ approvals: ["engineer"] });
    const result = checkConsensusThreshold(ticket);
    expect(result.reached).toBe(false);
    expect(result.progress).toBe(0.25);
  });

  it("returns not reached with 2 of 4 approvals (50%)", () => {
    const ticket = makeTicket({ approvals: ["engineer", "designer"] });
    const result = checkConsensusThreshold(ticket);
    expect(result.reached).toBe(false);
    expect(result.progress).toBe(0.5);
  });

  it("returns reached with 3 of 4 approvals (75% — threshold)", () => {
    const ticket = makeTicket({ approvals: ["engineer", "designer", "product-owner"] });
    const result = checkConsensusThreshold(ticket);
    expect(result.reached).toBe(true);
    expect(result.progress).toBe(0.75);
    expect(result.threshold).toBe(0.75);
  });

  it("returns reached with all 4 approvals (100%)", () => {
    const ticket = makeTicket({ approvals: ["engineer", "designer", "product-owner", "qa"] });
    const result = checkConsensusThreshold(ticket);
    expect(result.reached).toBe(true);
    expect(result.progress).toBe(1);
  });

  it("calculates progress correctly with duplicates (should not happen in practice)", () => {
    // approvals array should be deduplicated by the store, but checkConsensusThreshold
    // just counts length — tests robustness
    const ticket = makeTicket({ approvals: ["engineer", "engineer", "engineer"] });
    const result = checkConsensusThreshold(ticket);
    expect(result.progress).toBe(0.75); // 3 out of 4, reaches threshold
    expect(result.reached).toBe(true);
  });
});

// ========================================================================
// getBuildReadiness
// ========================================================================

describe("getBuildReadiness", () => {
  it("marks as not ready when no feedback exists", () => {
    const ticket = makeTicket({ approvals: [], feedback: [] });
    const readiness = getBuildReadiness(ticket);
    expect(readiness.ready).toBe(false);
    expect(readiness.blockers).toContainEqual(
      expect.stringContaining("No feedback has been collected")
    );
  });

  it("marks as not ready when consensus not reached", () => {
    const ticket = makeTicket({
      approvals: ["engineer"],
      feedback: [
        {
          id: "FB-001",
          ticketId: "TIX-001",
          personaId: "engineer",
          content: "Looks good to me.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: true,
        },
      ],
    });
    const readiness = getBuildReadiness(ticket);
    expect(readiness.ready).toBe(false);
    expect(readiness.blockers).toContainEqual(
      expect.stringContaining("Consensus not reached")
    );
  });

  it("marks as not ready when there are disapprovals", () => {
    const ticket = makeTicket({
      approvals: ["engineer", "designer", "product-owner"], // 3 of 4 = 75%
      feedback: [
        {
          id: "FB-001",
          ticketId: "TIX-001",
          personaId: "engineer",
          content: "Looks good.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: true,
        },
        {
          id: "FB-002",
          ticketId: "TIX-001",
          personaId: "designer",
          content: "Concerns about UX.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: false, // disapproval
        },
        {
          id: "FB-003",
          ticketId: "TIX-001",
          personaId: "product-owner",
          content: "Good business value.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: true,
        },
      ],
    });
    const readiness = getBuildReadiness(ticket);
    expect(readiness.ready).toBe(false);
    expect(readiness.blockers).toContainEqual(
      expect.stringContaining("Outstanding concerns from")
    );
  });

  it("marks as ready when consensus reached and all feedback approved", () => {
    const ticket = makeTicket({
      approvals: ["engineer", "designer", "product-owner"],
      feedback: [
        {
          id: "FB-001",
          ticketId: "TIX-001",
          personaId: "engineer",
          content: "Technically feasible.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: true,
        },
        {
          id: "FB-002",
          ticketId: "TIX-001",
          personaId: "designer",
          content: "Design is sound.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: true,
        },
        {
          id: "FB-003",
          ticketId: "TIX-001",
          personaId: "product-owner",
          content: "High priority.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: true,
        },
      ],
    });
    const readiness = getBuildReadiness(ticket);
    expect(readiness.ready).toBe(true);
    expect(readiness.blockers).toHaveLength(0);
    expect(readiness.score).toBeGreaterThanOrEqual(75);
  });

  it("caps score when consensus met but disapprovals exist", () => {
    const ticket = makeTicket({
      approvals: ["engineer", "designer", "product-owner"], // consensus met
      feedback: [
        {
          id: "FB-001",
          ticketId: "TIX-001",
          personaId: "engineer",
          content: "Looks good.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: true,
        },
        {
          id: "FB-002",
          ticketId: "TIX-001",
          personaId: "qa",
          content: "Need more tests.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: false,
        },
      ],
    });
    const readiness = getBuildReadiness(ticket);
    expect(readiness.ready).toBe(false);
    expect(readiness.score).toBeLessThanOrEqual(80);
  });

  it("provides next steps when blocked", () => {
    const ticket = makeTicket({ approvals: [], feedback: [] });
    const readiness = getBuildReadiness(ticket);
    expect(readiness.nextSteps.length).toBeGreaterThan(0);
    expect(readiness.nextSteps.some((s) => s.length > 0)).toBe(true);
  });

  it("provides all-clear next step when ready", () => {
    const ticket = makeTicket({
      approvals: ["engineer", "designer", "product-owner"],
      feedback: [
        {
          id: "FB-001",
          ticketId: "TIX-001",
          personaId: "engineer",
          content: "Good.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: true,
        },
        {
          id: "FB-002",
          ticketId: "TIX-001",
          personaId: "designer",
          content: "Good.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: true,
        },
        {
          id: "FB-003",
          ticketId: "TIX-001",
          personaId: "product-owner",
          content: "Good.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: true,
        },
      ],
    });
    const readiness = getBuildReadiness(ticket);
    expect(readiness.ready).toBe(true);
    expect(readiness.nextSteps).toContain("All clear — ready to build!");
  });
});
