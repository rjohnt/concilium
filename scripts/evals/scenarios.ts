/**
 * Eval scenario fixtures — realistic tickets with seeded properties the
 * judges look for (e.g. a deliberate engineer/designer conflict).
 */

import { FeedbackEntry, Ticket } from "@/lib/types";

function ticket(overrides: Partial<Ticket>): Ticket {
  return {
    id: "TIX-001",
    title: "",
    description: "",
    status: "in-review",
    priority: 1,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    tags: [],
    feedback: [],
    approvals: [],
    ...overrides,
  };
}

function fb(partial: Partial<FeedbackEntry> & Pick<FeedbackEntry, "personaId" | "content">): FeedbackEntry {
  return {
    id: `FB-${Math.random().toString(36).slice(2, 8)}`,
    ticketId: "TIX-001",
    createdAt: "2026-06-01T01:00:00.000Z",
    approved: false,
    ...partial,
  };
}

export interface EvalScenario {
  name: string;
  ticket: Ticket;
  history: FeedbackEntry[];
  /** Properties the judge checks the response against. */
  expectations: string[];
}

/** Fresh ticket with no feedback — stand-in must produce a grounded first review. */
export const coldStartScenario: EvalScenario = {
  name: "cold-start",
  ticket: ticket({
    title: "CSV export for the billing dashboard",
    description:
      "Finance team needs to export the billing dashboard (invoices, credits, usage line items) as CSV for reconciliation in their ERP. Needs to respect the currently applied date-range and customer filters. Some exports could span 100k+ rows.",
  }),
  history: [],
  expectations: [
    "References concrete details from THIS ticket (CSV, billing, filters, or the 100k+ row scale) rather than generic advice",
    "Raises at least one domain-specific concern a competent reviewer in that role would raise",
    "Recommendations are actionable next steps, not platitudes",
  ],
};

/** Ticket with a seeded engineer/designer conflict the mediator should find. */
export const conflictScenario: EvalScenario = {
  name: "seeded-conflict",
  ticket: ticket({
    id: "TIX-002",
    title: "Inline editing for ticket descriptions",
    description:
      "Allow users to edit ticket descriptions directly on the detail page instead of a separate edit screen.",
  }),
  history: [
    fb({
      ticketId: "TIX-002",
      personaId: "engineer",
      content:
        "Simplest robust approach: a modal editor with explicit save/cancel. Autosave on blur creates conflict-resolution headaches with our optimistic sync — we'd need operational transforms or last-write-wins, both risky. Modal keeps the data flow simple.",
      approved: true,
    }),
    fb({
      ticketId: "TIX-002",
      personaId: "designer",
      content:
        "A modal completely defeats the purpose of inline editing. Users expect click-to-edit with autosave like Notion or Linear. Opening a modal is the exact context-switch we're trying to remove. Strongly against the modal.",
      approved: false,
    }),
  ],
  expectations: [
    "Identifies the engineer-vs-designer disagreement about modal vs inline autosave editing",
    "Proposes a concrete compromise (e.g. inline editing with explicit save, debounced saves, or scoped conflict handling)",
    "Does not invent conflicts that aren't in the feedback",
  ],
};

export const allScenarios: EvalScenario[] = [coldStartScenario, conflictScenario];
