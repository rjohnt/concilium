import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

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

// Now import modules (store calls loadTickets() at module load time)
import { calculateConsensus, getBuildReadiness, generateConsensusSummary } from "../consensus-engine";
import { createTicket, getTicket, clearStorage } from "../store";
import { PersonaId, FeedbackEntry } from "../types";

// --- Helpers ---

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

// ========================================================================
// calculateConsensus
// ========================================================================

describe("calculateConsensus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage.clear();
    clearStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns not reached when no approvals", async () => {
    const ticket = createTicket("No Approvals", "No one has approved yet");
    getTicket(ticket.id)!.status = "in-review";

    const result = await calculateConsensus(ticket.id);

    expect(result.reached).toBe(false);
    expect(result.approved).toBe(0);
    expect(result.total).toBe(4);
    expect(result.percentage).toBe(0);
  });

  it("returns not reached with 1 of 4 approvals (25%)", async () => {
    const ticket = createTicket("One Approval", "Only one approved");
    const t = getTicket(ticket.id)!;
    t.status = "in-review";
    t.approvals = ["engineer"] as PersonaId[];

    const result = await calculateConsensus(ticket.id);

    expect(result.reached).toBe(false);
    expect(result.approved).toBe(1);
    expect(result.total).toBe(4);
    expect(result.percentage).toBe(0.25);
  });

  it("returns not reached with 2 of 4 approvals (50%)", async () => {
    const ticket = createTicket("Two Approvals", "Halfway there");
    const t = getTicket(ticket.id)!;
    t.status = "in-review";
    t.approvals = ["engineer", "designer"] as PersonaId[];

    const result = await calculateConsensus(ticket.id);

    expect(result.reached).toBe(false);
    expect(result.approved).toBe(2);
    expect(result.total).toBe(4);
    expect(result.percentage).toBe(0.5);
  });

  it("returns reached with 3 of 4 approvals (75%)", async () => {
    const ticket = createTicket("Three Approvals", "Threshold met");
    const t = getTicket(ticket.id)!;
    t.status = "consensus"; // block auto-transition for this return-value-only test
    t.approvals = ["engineer", "designer", "product-owner"] as PersonaId[];

    const result = await calculateConsensus(ticket.id);

    expect(result.reached).toBe(true);
    expect(result.approved).toBe(3);
    expect(result.total).toBe(4);
    expect(result.percentage).toBe(0.75);
  });

  it("returns reached with all 4 approvals (100%)", async () => {
    const ticket = createTicket("All Approved", "Everyone approved");
    const t = getTicket(ticket.id)!;
    t.status = "consensus"; // block auto-transition
    t.approvals = ["engineer", "designer", "product-owner", "qa"] as PersonaId[];

    const result = await calculateConsensus(ticket.id);

    expect(result.reached).toBe(true);
    expect(result.approved).toBe(4);
    expect(result.total).toBe(4);
    expect(result.percentage).toBe(1);
  });

  it("auto-transitions status to consensus when threshold met", async () => {
    const ticket = createTicket("Auto Transition", "Should go to consensus");
    const t = getTicket(ticket.id)!;
    t.status = "in-review";
    t.approvals = ["engineer", "designer", "product-owner"] as PersonaId[];

    await calculateConsensus(ticket.id);

    expect(getTicket(ticket.id)!.status).toBe("consensus");
  });

  it("does NOT re-transition when already consensus", async () => {
    const ticket = createTicket("Already Consensus", "Should stay consensus");
    const t = getTicket(ticket.id)!;
    t.approvals = ["engineer", "designer", "product-owner"] as PersonaId[];
    t.status = "consensus";

    await calculateConsensus(ticket.id);

    expect(getTicket(ticket.id)!.status).toBe("consensus");
  });

  it("does NOT transition when building", async () => {
    const ticket = createTicket("Building Status", "Should stay building");
    const t = getTicket(ticket.id)!;
    t.approvals = ["engineer", "designer", "product-owner"] as PersonaId[];
    t.status = "building";

    await calculateConsensus(ticket.id);

    expect(getTicket(ticket.id)!.status).toBe("building");
  });

  it("does NOT transition when done", async () => {
    const ticket = createTicket("Done Status", "Should stay done");
    const t = getTicket(ticket.id)!;
    t.approvals = ["engineer", "designer", "product-owner"] as PersonaId[];
    t.status = "done";

    await calculateConsensus(ticket.id);

    expect(getTicket(ticket.id)!.status).toBe("done");
  });

  it("returns safe defaults when ticket not found", async () => {
    const result = await calculateConsensus("NONEXISTENT-999");

    expect(result.reached).toBe(false);
    expect(result.approved).toBe(0);
    expect(result.total).toBe(0);
    expect(result.percentage).toBe(0);
  });
});

// ========================================================================
// getBuildReadiness
// ========================================================================

describe("getBuildReadiness", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage.clear();
    clearStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns score 0 and not ready when no feedback", () => {
    const ticket = createTicket("No Feedback", "No feedback at all");
    getTicket(ticket.id)!.status = "in-review";

    const result = getBuildReadiness(ticket.id);

    expect(result.score).toBe(0);
    expect(result.readyToBuild).toBe(false);
    expect(result.consensusMet).toBe(false);
    expect(result.feedbackCount).toBe(0);
  });

  it("returns readyToBuild:true when consensus met and score >= 70", () => {
    const ticket = createTicket("Ready Ticket", "Should be ready");
    const t = getTicket(ticket.id)!;
    t.status = "in-review";
    t.approvals = ["engineer", "designer", "product-owner"] as PersonaId[];
    // Need 5 feedback entries for score >= 70 (3/4*70 + 5/8*30 ≈ 71)
    for (let i = 0; i < 5; i++) {
      t.feedback.push(
        feedbackEntry({
          id: `FB-00${i}`,
          ticketId: ticket.id,
          personaId: "engineer",
          approved: true,
        })
      );
    }

    const result = getBuildReadiness(ticket.id);

    expect(result.consensusMet).toBe(true);
    expect(result.readyToBuild).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("returns not ready with only 2 approvals", () => {
    const ticket = createTicket("Only Two", "Not enough approvals");
    const t = getTicket(ticket.id)!;
    t.status = "in-review";
    t.approvals = ["engineer", "designer"] as PersonaId[];
    for (let i = 0; i < 8; i++) {
      t.feedback.push(
        feedbackEntry({
          id: `FB-0${i}`,
          ticketId: ticket.id,
          personaId: "engineer",
        })
      );
    }

    const result = getBuildReadiness(ticket.id);

    expect(result.consensusMet).toBe(false);
    expect(result.readyToBuild).toBe(false);
  });

  it("returns not ready when consensus met but score < 70", () => {
    const ticket = createTicket("Low Score", "Consensus but low score");
    const t = getTicket(ticket.id)!;
    t.status = "in-review";
    t.approvals = ["engineer", "designer", "product-owner"] as PersonaId[];
    // Only 1 feedback → score ≈ 56
    t.feedback.push(
      feedbackEntry({ id: "FB-001", ticketId: ticket.id, personaId: "engineer" })
    );

    const result = getBuildReadiness(ticket.id);

    expect(result.consensusMet).toBe(true);
    expect(result.readyToBuild).toBe(false);
    expect(result.score).toBeLessThan(70);
  });

  it("includes all 4 personas in missingPersonas when no approvals", () => {
    const ticket = createTicket("All Missing", "No one approved");
    getTicket(ticket.id)!.status = "in-review";

    const result = getBuildReadiness(ticket.id);

    expect(result.missingPersonas).toEqual([
      "engineer",
      "designer",
      "product-owner",
      "qa",
    ]);
  });

  it('includes ["product-owner","qa"] in missingPersonas when 2 approved', () => {
    const ticket = createTicket("Half Missing", "Two approved");
    const t = getTicket(ticket.id)!;
    t.status = "in-review";
    t.approvals = ["engineer", "designer"] as PersonaId[];

    const result = getBuildReadiness(ticket.id);

    expect(result.missingPersonas).toEqual(["product-owner", "qa"]);
  });

  it("includes guidance in nextSteps when not ready", () => {
    const ticket = createTicket("Needs Guidance", "Not ready yet");
    getTicket(ticket.id)!.status = "in-review";

    const result = getBuildReadiness(ticket.id);

    expect(result.nextSteps.length).toBeGreaterThan(0);
    expect(result.nextSteps.some((s) => s.includes("Need approvals from"))).toBe(true);
  });

  it("includes rejection warning when disapprovals exist", () => {
    const ticket = createTicket("Has Disapproval", "Someone said no");
    const t = getTicket(ticket.id)!;
    t.status = "in-review";
    t.approvals = ["engineer", "designer", "product-owner"] as PersonaId[];
    t.feedback.push(
      feedbackEntry({
        id: "FB-001",
        ticketId: ticket.id,
        personaId: "engineer",
        approved: true,
      })
    );
    t.feedback.push(
      feedbackEntry({
        id: "FB-002",
        ticketId: ticket.id,
        personaId: "designer",
        content: "Needs UX rework",
        approved: false,
      })
    );

    const result = getBuildReadiness(ticket.id);

    expect(
      result.nextSteps.some((s) =>
        s.includes("review rejection reasons before building")
      )
    ).toBe(true);
  });

  it('includes "Ready to move to building!" in nextSteps at score >= 80', () => {
    const ticket = createTicket("High Score", "All clear and ready");
    const t = getTicket(ticket.id)!;
    t.status = "in-review";
    // 4 approvals + 4 feedbacks → score = round(70 + 15) = 85
    t.approvals = ["engineer", "designer", "product-owner", "qa"] as PersonaId[];
    for (let i = 0; i < 4; i++) {
      t.feedback.push(
        feedbackEntry({
          id: `FB-0${i}`,
          ticketId: ticket.id,
          personaId: "engineer",
          approved: true,
        })
      );
    }

    const result = getBuildReadiness(ticket.id);

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(
      result.nextSteps.some((s) => s.includes("Ready to move to building!"))
    ).toBe(true);
  });

  it('includes "All checks passed" when all clear', () => {
    const ticket = createTicket("All Clear", "No issues");
    const t = getTicket(ticket.id)!;
    t.status = "in-review";
    // 3 approvals + 4 feedbacks all approved → score 68 (< 80),
    // consensusMet true, no disapprovals, enough feedback
    t.approvals = ["engineer", "designer", "product-owner"] as PersonaId[];
    for (let i = 0; i < 4; i++) {
      t.feedback.push(
        feedbackEntry({
          id: `FB-0${i}`,
          ticketId: ticket.id,
          personaId: "engineer",
          approved: true,
        })
      );
    }

    const result = getBuildReadiness(ticket.id);

    expect(result.consensusMet).toBe(true);
    expect(result.score).toBeLessThan(80);
    expect(
      result.nextSteps.some((s) => s.includes("All checks passed"))
    ).toBe(true);
  });

  it("returns safe defaults when ticket not found", () => {
    const result = getBuildReadiness("NONEXISTENT-999");

    expect(result.score).toBe(0);
    expect(result.consensusMet).toBe(false);
    expect(result.feedbackCount).toBe(0);
    expect(result.missingPersonas).toEqual([
      "engineer",
      "designer",
      "product-owner",
      "qa",
    ]);
    expect(result.nextSteps).toEqual(["Ticket not found"]);
    expect(result.readyToBuild).toBe(false);
  });

  it("computes score with 70% consensus + 30% feedback weighting", () => {
    const ticket = createTicket("Weighted Score", "Test weighting");
    const t = getTicket(ticket.id)!;
    t.status = "in-review";
    // 2 approvals → consensusScore = 2/4 * 70 = 35
    t.approvals = ["engineer", "designer"] as PersonaId[];
    // 4 feedbacks → feedbackScore = 4/8 * 30 = 15
    for (let i = 0; i < 4; i++) {
      t.feedback.push(
        feedbackEntry({
          id: `FB-0${i}`,
          ticketId: ticket.id,
          personaId: "engineer",
        })
      );
    }

    const result = getBuildReadiness(ticket.id);

    // 35 + 15 = 50
    expect(result.score).toBe(50);
  });
});

// ========================================================================
// generateConsensusSummary
// ========================================================================

describe("generateConsensusSummary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage.clear();
    clearStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns descriptive summary with ticket title when no feedback", () => {
    const ticket = createTicket("My Feature Ticket", "A feature description");

    const result = generateConsensusSummary(ticket.id);

    expect(result.summary).toContain('No feedback has been submitted for "My Feature Ticket"');
    expect(result.summary).toContain("All 4 persona reviews are pending");
    expect(result.approvals).toEqual([]);
    expect(result.rejections).toEqual([
      "engineer",
      "designer",
      "product-owner",
      "qa",
    ]);
    expect(result.keyConcerns).toEqual([]);
    expect(result.keyHighlights).toEqual([]);
  });

  it('includes approval counts "3/4" and "75%"', () => {
    const ticket = createTicket("Approval Counts", "Testing counts");
    const t = getTicket(ticket.id)!;
    t.approvals = ["engineer", "designer", "product-owner"] as PersonaId[];
    t.feedback.push(
      feedbackEntry({ id: "FB-001", ticketId: ticket.id, personaId: "engineer" })
    );

    const result = generateConsensusSummary(ticket.id);

    expect(result.summary).toContain("3/4");
    expect(result.summary).toContain("75%");
  });

  it("returns 3 approvals and 1 rejection when 3 of 4 approved", () => {
    const ticket = createTicket("Three of Four", "3/4 approved");
    const t = getTicket(ticket.id)!;
    t.approvals = ["engineer", "designer", "product-owner"] as PersonaId[];
    t.feedback.push(
      feedbackEntry({ id: "FB-001", ticketId: ticket.id, personaId: "engineer" })
    );

    const result = generateConsensusSummary(ticket.id);

    expect(result.approvals).toHaveLength(3);
    expect(result.approvals).toEqual(["engineer", "designer", "product-owner"]);
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections).toEqual(["qa"]);
  });

  it("extracts keyConcerns from disapproved feedback", () => {
    const ticket = createTicket("Key Concerns", "Has disapproval");
    const t = getTicket(ticket.id)!;
    t.approvals = ["engineer"] as PersonaId[];
    t.feedback.push(
      feedbackEntry({
        id: "FB-001",
        ticketId: ticket.id,
        personaId: "engineer",
        content: "Technical approach is solid.",
        approved: true,
      })
    );
    t.feedback.push(
      feedbackEntry({
        id: "FB-002",
        ticketId: ticket.id,
        personaId: "designer",
        content: "UX is confusing — needs a complete redesign.",
        approved: false,
      })
    );

    const result = generateConsensusSummary(ticket.id);

    expect(result.keyConcerns).toHaveLength(1);
    expect(result.keyConcerns[0]).toContain("Designer");
    expect(result.keyConcerns[0]).toContain("UX is confusing");
  });

  it("extracts keyHighlights from approved feedback", () => {
    const ticket = createTicket("Key Highlights", "Has approval");
    const t = getTicket(ticket.id)!;
    t.approvals = ["engineer"] as PersonaId[];
    t.feedback.push(
      feedbackEntry({
        id: "FB-001",
        ticketId: ticket.id,
        personaId: "engineer",
        content: "Great implementation approach — straightforward and elegant.",
        approved: true,
      })
    );

    const result = generateConsensusSummary(ticket.id);

    expect(result.keyHighlights).toHaveLength(1);
    expect(result.keyHighlights[0]).toContain("Engineer");
    expect(result.keyHighlights[0]).toContain("Great implementation approach");
  });

  it("truncates feedback content at 120 characters", () => {
    const ticket = createTicket("Truncation Test", "Long feedback");
    const t = getTicket(ticket.id)!;
    const longContent = "a".repeat(200);
    t.approvals = ["engineer"] as PersonaId[];
    t.feedback.push(
      feedbackEntry({
        id: "FB-001",
        ticketId: ticket.id,
        personaId: "engineer",
        content: longContent,
        approved: true,
      })
    );

    const result = generateConsensusSummary(ticket.id);

    expect(result.keyHighlights).toHaveLength(1);
    // Content should be truncated with "..."
    expect(result.keyHighlights[0]).toContain("...");
    // "[Engineer] " prefix is 11 chars + 120 content chars + "..." = 134 max
    expect(result.keyHighlights[0].length).toBeLessThanOrEqual(135);
  });

  it('includes "All personas have weighed in!" when all 4 approved', () => {
    const ticket = createTicket("All In", "Everyone weighed in");
    const t = getTicket(ticket.id)!;
    t.approvals = ["engineer", "designer", "product-owner", "qa"] as PersonaId[];
    t.feedback.push(
      feedbackEntry({ id: "FB-001", ticketId: ticket.id, personaId: "engineer" })
    );

    const result = generateConsensusSummary(ticket.id);

    expect(result.summary).toContain("All personas have weighed in!");
  });

  it('includes "Still awaiting input from:" when some missing', () => {
    const ticket = createTicket("Awaiting Input", "Still waiting");
    const t = getTicket(ticket.id)!;
    t.approvals = ["engineer"] as PersonaId[];
    t.feedback.push(
      feedbackEntry({ id: "FB-001", ticketId: ticket.id, personaId: "engineer" })
    );

    const result = generateConsensusSummary(ticket.id);

    expect(result.summary).toContain("Still awaiting input from:");
  });

  it("returns safe defaults when ticket not found", () => {
    const result = generateConsensusSummary("NONEXISTENT-999");

    expect(result.summary).toBe("No feedback available.");
    expect(result.approvals).toEqual([]);
    expect(result.rejections).toEqual([]);
    expect(result.keyConcerns).toEqual([]);
    expect(result.keyHighlights).toEqual([]);
    expect(result.generatedAt).toBeTruthy();
  });
});
