import { describe, it, expect } from "vitest";
import { generateAgentPrompt } from "../agent-prompt";
import { Ticket, FeedbackEntry } from "../types";

function fb(personaId: FeedbackEntry["personaId"], content: string, approved = false): FeedbackEntry {
  return {
    id: `${personaId}-${Math.random()}`,
    ticketId: "TIX-001",
    personaId,
    content,
    createdAt: new Date().toISOString(),
    approved,
    source: "human",
  };
}

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "TIX-001",
    title: "Add a dark mode toggle",
    description: "Users want a dark theme that persists.",
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

describe("generateAgentPrompt", () => {
  it("leads with the ticket title and description", () => {
    const out = generateAgentPrompt(ticket());
    expect(out.startsWith("# Add a dark mode toggle")).toBe(true);
    expect(out).toContain("Users want a dark theme that persists.");
  });

  it("includes only roles that actually weighed in", () => {
    const out = generateAgentPrompt(
      ticket({
        feedback: [fb("engineer", "Use CSS variables, no FOUC.")],
        approvals: ["engineer"],
      })
    );
    expect(out).toContain("## Engineering notes ✓ approved");
    expect(out).toContain("- Use CSS variables, no FOUC.");
    // No QA/Design/Product sections when they didn't comment.
    expect(out).not.toContain("## QA / acceptance criteria");
    expect(out).not.toContain("## Design notes");
  });

  it("reports the consensus tally", () => {
    const out = generateAgentPrompt(
      ticket({ feedback: [fb("qa", "Cover OS-preference on first load.")], approvals: ["qa"] })
    );
    expect(out).toContain("1 of 4 approved");
  });

  it("orders Product before Engineering before Design before QA", () => {
    const out = generateAgentPrompt(
      ticket({
        feedback: [fb("qa", "Q"), fb("designer", "D"), fb("engineer", "E"), fb("product-owner", "P")],
      })
    );
    const order = ["Product notes", "Engineering notes", "Design notes", "QA / acceptance criteria"].map((h) =>
      out.indexOf(h)
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((i) => i >= 0)).toBe(true);
  });

  it("still produces a usable prompt with no feedback", () => {
    const out = generateAgentPrompt(ticket());
    expect(out).toContain("0 of 4 approved");
    expect(out).toContain("Build the feature to satisfy the notes above");
  });
});
