/**
 * Acceptance Tests — DEV-71: Unit tests for consensus-engine.ts core logic
 *
 * Tests the consensus-engine from a user's journey perspective:
 * the user creates a ticket, gathers persona feedback, checks consensus,
 * evaluates build readiness, and reviews summaries.
 *
 * Uses @testing-library/react (renderHook, act) for React-aware test patterns
 * with direct async calls for the consensus engine functions.
 *
 * Rule: NEVER modify backend or frontend code. Report failures as-is.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "@testing-library/react";

// ============================================================================
// localStorage + window stubs (must come before store imports)
// ============================================================================

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

const mockStorage = getMockStorage();
vi.stubGlobal("localStorage", mockStorage);
vi.stubGlobal("window", { addEventListener: vi.fn(), dispatchEvent: vi.fn() });

// ============================================================================
// Imports (after stubs so store init doesn't crash)
// ============================================================================

import { calculateConsensus, getBuildReadiness, generateConsensusSummary } from "@/lib/consensus-engine";
import { createTicket, getTicket, clearStorage } from "@/lib/store";
import type { PersonaId, FeedbackEntry, TicketStatus } from "@/lib/types";

// ============================================================================
// Helpers
// ============================================================================

function feedbackEntry(overrides: Partial<FeedbackEntry> = {}): FeedbackEntry {
  return {
    id: "FB-001",
    ticketId: "TIX-001",
    personaId: "engineer",
    content: "Looks good.",
    createdAt: "2026-01-01T00:00:00.000Z",
    approved: true,
    ...overrides,
  };
}

/**
 * Seed a ticket with approvals and feedback for scenario testing.
 * Returns the ticket object after mutations.
 */
function seedScenario(opts: {
  approvals?: PersonaId[];
  feedbacks?: Partial<FeedbackEntry>[];
  status?: string;
}) {
  const ticket = createTicket("Test Feature", "A user-facing feature for testing.");
  const t = getTicket(ticket.id)!;
  if (opts.status) t.status = opts.status as TicketStatus;
  if (opts.approvals) t.approvals = opts.approvals;
  if (opts.feedbacks) {
    t.feedback = opts.feedbacks.map((fb, i) =>
      feedbackEntry({
        ...fb,
        ticketId: ticket.id,
        id: `FB-${String(i).padStart(3, "0")}`,
        personaId: fb.personaId ?? "engineer",
      })
    );
  }
  return ticket;
}

/**
 * Wrap an async consensus-engine call in React's act() for
 * @testing-library/react compliance. Returns the resolved value.
 */
async function actConsensus(ticketId: string) {
  let result: Awaited<ReturnType<typeof calculateConsensus>>;
  await act(async () => {
    result = await calculateConsensus(ticketId);
  });
  return result!;
}

// ============================================================================
// beforeEach / afterEach — clean state between tests
// ============================================================================

describe("DEV-71 Acceptance Tests — consensus-engine.ts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage.clear();
    clearStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ========================================================================
  // AC1 — User submits 3 approvals → consensus reached → ready to build
  // ========================================================================

  describe("AC1: User submits 3 approvals → consensus reached → ready to build", () => {
    it("calculateConsensus reaches threshold at 3/4 (75%)", async () => {
      const ticket = seedScenario({
        approvals: ["engineer", "designer", "product-owner"],
        status: "in-review",
      });

      const result = await actConsensus(ticket.id);

      expect(result.reached).toBe(true);
      expect(result.approved).toBe(3);
      expect(result.total).toBe(4);
      expect(result.percentage).toBe(0.75);
    });

    it("auto-transitions ticket status to 'consensus' when threshold met", async () => {
      const ticket = seedScenario({
        approvals: ["engineer", "designer", "product-owner"],
        status: "in-review",
      });

      await actConsensus(ticket.id);

      // Side-effect: ticket status should now be "consensus"
      const refreshed = getTicket(ticket.id);
      expect(refreshed!.status).toBe("consensus");
    });

    it("getBuildReadiness reports readyToBuild:true with sufficient feedback", () => {
      const ticket = seedScenario({
        approvals: ["engineer", "designer", "product-owner"],
        status: "in-review",
        feedbacks: [
          { personaId: "engineer", approved: true, content: "Approved by engineer" },
          { personaId: "designer", approved: true, content: "Approved by designer" },
          { personaId: "product-owner", approved: true, content: "Approved by PO" },
          { personaId: "qa", approved: true, content: "Approved by QA" },
          { personaId: "engineer", approved: true, content: "Second note from engineer" },
        ],
      });

      const readiness = getBuildReadiness(ticket.id);

      expect(readiness.consensusMet).toBe(true);
      expect(readiness.readyToBuild).toBe(true);
      expect(readiness.score).toBeGreaterThanOrEqual(70);
    });
  });

  // ========================================================================
  // AC2 — User submits feedback with concerns → nextSteps includes warning
  // ========================================================================

  describe("AC2: User submits feedback with concerns → nextSteps includes warning", () => {
    it("disapproval feedback triggers rejection warning in nextSteps", () => {
      const ticket = seedScenario({
        approvals: ["engineer", "designer", "product-owner"],
        status: "in-review",
        feedbacks: [
          { personaId: "engineer", approved: true, content: "Looks good" },
          { personaId: "designer", approved: false, content: "UX needs complete redesign" },
        ],
      });

      const readiness = getBuildReadiness(ticket.id);

      expect(readiness.consensusMet).toBe(true);
      expect(
        readiness.nextSteps.some((s) =>
          s.includes("review rejection reasons before building")
        )
      ).toBe(true);
    });

    it("generateConsensusSummary extracts keyConcerns from disapprovals", () => {
      const ticket = seedScenario({
        approvals: ["engineer"],
        status: "in-review",
        feedbacks: [
          { personaId: "engineer", approved: true, content: "Solid approach" },
          {
            personaId: "designer",
            approved: false,
            content: "UX is confusing — needs a complete redesign.",
          },
        ],
      });

      const summary = generateConsensusSummary(ticket.id);

      expect(summary.keyConcerns.length).toBeGreaterThan(0);
      expect(summary.keyConcerns[0]).toContain("Designer");
      expect(summary.keyConcerns[0]).toContain("UX is confusing");
    });

    it("getBuildReadiness does NOT say 'Ready to move to building!' when concerns exist", () => {
      const ticket = seedScenario({
        approvals: ["engineer", "designer", "product-owner", "qa"],
        status: "in-review",
        feedbacks: [
          { personaId: "engineer", approved: true, content: "Good" },
          { personaId: "designer", approved: false, content: "Needs work" },
        ],
      });

      const readiness = getBuildReadiness(ticket.id);
      expect(
        readiness.nextSteps.some((s) => s.includes("Ready to move to building!"))
      ).toBe(false);
    });
  });

  // ========================================================================
  // AC3 — User views ticket with no feedback → summary shows pending state
  // ========================================================================

  describe("AC3: User views ticket with no feedback → summary shows pending state", () => {
    it("summary indicates no feedback and all reviews pending", () => {
      const ticket = createTicket("Unreviewed Feature", "No one has reviewed this yet.");

      const summary = generateConsensusSummary(ticket.id);

      expect(summary.summary).toContain(
        'No feedback has been submitted for "Unreviewed Feature"'
      );
      expect(summary.summary).toContain("All 4 persona reviews are pending");
      expect(summary.approvals).toEqual([]);
      expect(summary.rejections).toEqual([
        "engineer",
        "designer",
        "product-owner",
        "qa",
      ]);
      expect(summary.keyConcerns).toEqual([]);
      expect(summary.keyHighlights).toEqual([]);
    });

    it("getBuildReadiness returns score 0 and not ready with no feedback", () => {
      const ticket = createTicket("Empty Ticket", "No feedback yet");

      const readiness = getBuildReadiness(ticket.id);

      expect(readiness.score).toBe(0);
      expect(readiness.readyToBuild).toBe(false);
      expect(readiness.consensusMet).toBe(false);
      expect(readiness.feedbackCount).toBe(0);
    });

    it("calculateConsensus returns 0% and not reached with no approvals", async () => {
      const ticket = createTicket("No Approvals", "Still waiting");

      const result = await actConsensus(ticket.id);

      expect(result.reached).toBe(false);
      expect(result.approved).toBe(0);
      expect(result.total).toBe(4);
      expect(result.percentage).toBe(0);
    });
  });

  // ========================================================================
  // AC4 — Edge case: invalid ticket shows safe fallback
  // ========================================================================

  describe("AC4: Edge case — invalid ticket shows safe fallback", () => {
    it("calculateConsensus on nonexistent ticket returns safe defaults", async () => {
      const result = await actConsensus("NONEXISTENT-TICKET-999");

      expect(result.reached).toBe(false);
      expect(result.approved).toBe(0);
      expect(result.total).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it("getBuildReadiness on nonexistent ticket returns safe defaults", () => {
      const readiness = getBuildReadiness("GHOST-TICKET");

      expect(readiness.score).toBe(0);
      expect(readiness.consensusMet).toBe(false);
      expect(readiness.feedbackCount).toBe(0);
      expect(readiness.missingPersonas).toEqual([
        "engineer",
        "designer",
        "product-owner",
        "qa",
      ]);
      expect(readiness.nextSteps).toEqual(["Ticket not found"]);
      expect(readiness.readyToBuild).toBe(false);
    });

    it("generateConsensusSummary on nonexistent ticket returns generic message", () => {
      const summary = generateConsensusSummary("INVALID-ID");

      expect(summary.summary).toBe("No feedback available.");
      expect(summary.approvals).toEqual([]);
      expect(summary.rejections).toEqual([]);
      expect(summary.keyConcerns).toEqual([]);
      expect(summary.keyHighlights).toEqual([]);
      expect(summary.generatedAt).toBeTruthy();
    });
  });

  // ========================================================================
  // AC5 — Full user journey: from submission to consensus to build readiness
  // ========================================================================

  describe("AC5: Full user journey — submission → consensus → build readiness", () => {
    it("end-to-end: create ticket → add approvals → check consensus → verify readiness", async () => {
      // 1. User creates a ticket
      const ticket = createTicket(
        "End-to-End Feature",
        "Testing the full flow"
      );
      const t = getTicket(ticket.id)!;
      t.status = "in-review";

      // 2. Initially no consensus
      const initialConsensus = getBuildReadiness(ticket.id);
      expect(initialConsensus.consensusMet).toBe(false);
      expect(initialConsensus.readyToBuild).toBe(false);

      // 3. User gathers 3/4 approvals (75% threshold met)
      t.approvals = ["engineer", "designer", "product-owner"];

      // Add feedback from those who approved
      t.feedback = [
        feedbackEntry({
          id: "FB-000", ticketId: ticket.id, personaId: "engineer",
          approved: true, content: "Solid tech approach",
        }),
        feedbackEntry({
          id: "FB-001", ticketId: ticket.id, personaId: "designer",
          approved: true, content: "Clean UX",
        }),
        feedbackEntry({
          id: "FB-002", ticketId: ticket.id, personaId: "product-owner",
          approved: true, content: "High business value",
        }),
        feedbackEntry({
          id: "FB-003", ticketId: ticket.id, personaId: "qa",
          approved: true, content: "QA criteria clear",
        }),
        feedbackEntry({
          id: "FB-004", ticketId: ticket.id, personaId: "engineer",
          approved: true, content: "Second review pass",
        }),
      ];

      // 4. calculateConsensus auto-transitions to consensus
      const consensusResult = await actConsensus(ticket.id);
      expect(consensusResult.reached).toBe(true);

      const afterConsensus = getTicket(ticket.id)!;
      expect(afterConsensus.status).toBe("consensus");

      // 5. Build readiness should be ready
      const readiness = getBuildReadiness(ticket.id);
      expect(readiness.consensusMet).toBe(true);
      expect(readiness.readyToBuild).toBe(true);
      expect(readiness.score).toBeGreaterThanOrEqual(70);

      // 6. Summary should reflect consensus state
      const summary = generateConsensusSummary(ticket.id);
      expect(summary.summary).toContain("3/4");
      expect(summary.summary).toContain("75%");
    });

    it("user journey with 100% consensus and high score shows celebratory message", () => {
      const ticket = seedScenario({
        approvals: ["engineer", "designer", "product-owner", "qa"],
        status: "in-review",
        feedbacks: [
          { personaId: "engineer", approved: true, content: "Great" },
          { personaId: "designer", approved: true, content: "Excellent" },
          { personaId: "product-owner", approved: true, content: "Perfect" },
          { personaId: "qa", approved: true, content: "All clear" },
        ],
      });

      const readiness = getBuildReadiness(ticket.id);

      expect(readiness.consensusMet).toBe(true);
      expect(readiness.readyToBuild).toBe(true);
      expect(readiness.score).toBeGreaterThanOrEqual(80);
      expect(
        readiness.nextSteps.some((s) =>
          s.includes("Ready to move to building!")
        )
      ).toBe(true);

      // Summary should show all personas have weighed in
      const summary = generateConsensusSummary(ticket.id);
      expect(summary.summary).toContain("All personas have weighed in!");
    });
  });

  // ========================================================================
  // AC6 — Summary shows correct counts and persona breakdown
  // ========================================================================

  describe("AC6: Summary displays correct counts and persona breakdown", () => {
    it("includes approval counts like '3/4' and percentage '75%'", () => {
      const ticket = seedScenario({
        approvals: ["engineer", "designer", "product-owner"],
        feedbacks: [{ personaId: "engineer", approved: true, content: "OK" }],
      });

      const summary = generateConsensusSummary(ticket.id);
      expect(summary.summary).toContain("3/4");
      expect(summary.summary).toContain("75%");
      expect(summary.approvals).toEqual([
        "engineer",
        "designer",
        "product-owner",
      ]);
      expect(summary.rejections).toEqual(["qa"]);
    });

    it("shows keyHighlights from approved feedback", () => {
      const ticket = seedScenario({
        approvals: ["engineer"],
        feedbacks: [
          {
            personaId: "engineer",
            approved: true,
            content: "Great implementation plan — clear and concise.",
          },
        ],
      });

      const summary = generateConsensusSummary(ticket.id);
      expect(summary.keyHighlights.length).toBeGreaterThan(0);
      expect(summary.keyHighlights[0]).toContain("Engineer");
      expect(summary.keyHighlights[0]).toContain("Great implementation plan");
    });

    it("shows 'Still awaiting input from' when personas are missing", () => {
      const ticket = seedScenario({
        approvals: ["engineer"],
        feedbacks: [{ personaId: "engineer", approved: true, content: "Good" }],
      });

      const summary = generateConsensusSummary(ticket.id);
      expect(summary.summary).toContain("Still awaiting input from:");
    });
  });
});
