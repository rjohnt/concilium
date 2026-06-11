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

// ── Targeted-catch scenarios ─────────────────────────────────────────────────
// Each ticket hides a problem that ONE role is uniquely responsible for
// catching. The trap is chosen so the OTHER roles would plausibly wave it
// through — proving the role's lens is doing real work, not generic review.

import { PersonaId } from "@/lib/types";

export interface CatchScenario {
  name: string;
  /** The role under test — the one that must catch the seeded problem. */
  role: PersonaId;
  ticket: Ticket;
  history: FeedbackEntry[];
  /** The specific issue this role must surface, in plain language. */
  mustCatch: string;
  /** Short ticket summary for the judge. */
  summary: string;
}

/** Designer must catch: a destructive bulk action with no confirmation/undo. */
export const designerUxTrap: CatchScenario = {
  name: "designer-destructive-no-confirm",
  role: "designer",
  ticket: ticket({
    id: "TIX-010",
    title: "'Clear completed' button on the task list",
    description:
      "Add a 'Clear completed' button to the task list header. When clicked it removes all tasks marked complete from the list so the view stays tidy. Backend already supports bulk delete by status; this is just wiring the button to that endpoint.",
  }),
  history: [],
  mustCatch:
    "The action is destructive and irreversible but has no confirmation step, no undo, and no warning about how many items will be deleted.",
  summary: "A header button that immediately bulk-deletes all completed tasks.",
};

/** Product Owner must catch: gold-plating with no clear user need or metric. */
export const poScopeTrap: CatchScenario = {
  name: "po-gold-plating-no-metric",
  role: "product-owner",
  ticket: ticket({
    id: "TIX-011",
    title: "Fully customizable dashboard with draggable widgets",
    description:
      "Let users build their own dashboard: drag and drop from 25 widget types, resize and rearrange freely, save multiple named layouts, share layouts with teammates, and theme each widget's colors. This will make the product feel powerful and enterprise-ready.",
  }),
  history: [],
  mustCatch:
    "The scope is enormous and speculative — there is no stated user need, no success metric, and no MVP; it should be cut down and validated before building.",
  summary:
    "A large, fully-customizable drag-and-drop dashboard builder justified by 'feeling powerful', with no metric or validated need.",
};

/** Engineer must catch: an unbounded query / scale landmine in a 'simple' ask. */
export const engineerScaleTrap: CatchScenario = {
  name: "engineer-unbounded-query",
  role: "engineer",
  ticket: ticket({
    id: "TIX-012",
    title: "'Related items' panel on the record detail page",
    description:
      "On each record's detail page, show a 'Related items' panel listing every other record that shares at least one tag with this one. Simple win — users keep asking how to find similar records. Just query by overlapping tags and render the list.",
  }),
  history: [],
  mustCatch:
    "Querying every record sharing any tag is unbounded and will not scale — popular tags match huge numbers of rows; it needs pagination/limits, indexing, and a defined cap, or it will be a performance/N+1 problem on hot pages.",
  summary:
    "A detail-page panel that lists every record sharing any tag with the current one, with no limit or pagination.",
};

/** QA must catch: timezone/locale/edge correctness in a 'cosmetic' feature. */
export const qaEdgeTrap: CatchScenario = {
  name: "qa-relative-time-edges",
  role: "qa",
  ticket: ticket({
    id: "TIX-013",
    title: "Relative timestamps on comments",
    description:
      "Replace the absolute timestamp on each comment with a friendly relative time like '3 hours ago' or '2 days ago'. Purely cosmetic polish — compute the difference between now and the comment's created time and format it.",
  }),
  history: [],
  mustCatch:
    "There are real correctness edge cases: timezone handling and client/server clock skew, timestamps in the future (negative differences), very old dates, locale/pluralization, and what to show at boundaries (just now / 1 minute) — these need defined, testable behavior.",
  summary:
    "Render comment timestamps as relative 'time ago' strings, described as purely cosmetic.",
};

export const catchScenarios: CatchScenario[] = [
  designerUxTrap,
  poScopeTrap,
  engineerScaleTrap,
  qaEdgeTrap,
];

// ── Multi-trap differentiation ticket ────────────────────────────────────────
// One ticket that simultaneously contains a UX trap, a scope trap, a scale
// trap, and a correctness trap. Running all four personas against it should
// produce four DIFFERENT reviews, each gravitating to its own trap.

export interface DifferentiationScenario {
  name: string;
  ticket: Ticket;
  summary: string;
  /** What each role should home in on. */
  perRole: Record<PersonaId, string>;
}

export const multiTrapShareReport: DifferentiationScenario = {
  name: "share-report-multitrap",
  ticket: ticket({
    id: "TIX-020",
    title: "'Share report' public link for the analytics dashboard",
    description:
      "Add a 'Share report' button to the analytics dashboard. Clicking it generates a public link that anyone (no login) can open to see a snapshot of the current dashboard — all charts plus the full underlying data table. This will help users show results to clients. Generate the link on click and copy it to the clipboard.",
  }),
  summary:
    "A button that turns the analytics dashboard (charts + full underlying data) into a public, no-login link, to share results with clients.",
  perRole: {
    designer:
      "the interaction/UX: no confirmation that this exposes data publicly, and missing empty/loading/error states and feedback for the share flow",
    "product-owner":
      "whether public, no-login sharing is the validated need, who it's for, and what success metric justifies it, plus MVP scoping",
    engineer:
      "the technical surface: snapshotting the full underlying dataset could be huge, and a public no-auth endpoint is a security/access-control concern",
    qa: "correctness/risk: stale vs live snapshot, what exactly is exposed (permission leakage), link lifetime/expiry/revocation, and access-control edge cases",
  },
};

