import { Ticket, FeedbackEntry, PersonaId, TicketStatus, BuildReport } from "./types";
import { getAllPersonas } from "./personas";
import { checkConsensusThreshold, getBuildReadiness, buildBuildReport } from "./consensus-threshold";
import { saveTickets, loadTickets, clearStorage as clearPersistedStorage } from "./persistence";

// === In-memory store with localStorage persistence ===

const initial =
  typeof window !== "undefined"
    ? loadTickets()
    : {
        tickets: [] as Ticket[],
        nextTicketId: 1,
        nextFeedbackId: 1,
        nextBuildReportId: 1,
      };

let tickets: Ticket[] = initial.tickets;
let nextTicketId = initial.nextTicketId;
let nextFeedbackId = initial.nextFeedbackId;
let nextBuildReportId = initial.nextBuildReportId;

function generateId(prefix: string, counter: number): string {
  return `${prefix}-${String(counter).padStart(3, "0")}`;
}

function persistState(): void {
  saveTickets(tickets, nextTicketId, nextFeedbackId, nextBuildReportId);
}

// --- Ticket CRUD ---

export function getTickets(): Ticket[] {
  return tickets.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getTicket(id: string): Ticket | undefined {
  return tickets.find((t) => t.id === id);
}

export function createTicket(
  title: string,
  description: string
): Ticket {
  const id = generateId("TIX", nextTicketId++);
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id,
    title,
    description,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    feedback: [],
    approvals: [],
  };
  tickets.push(ticket);
  persistState();
  return ticket;
}

// Future scaffolding – exposed for API routes and external state management.
export function updateTicketStatus(
  ticketId: string,
  status: TicketStatus
): Ticket | null {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return null;
  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  persistState();
  return ticket;
}

// --- Feedback ---

export function addFeedback(
  ticketId: string,
  personaId: PersonaId,
  content: string,
  approved: boolean
): FeedbackEntry | null {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return null;

  const id = generateId("FB", nextFeedbackId++);
  const entry: FeedbackEntry = {
    id,
    ticketId,
    personaId,
    content,
    createdAt: new Date().toISOString(),
    approved,
  };

  ticket.feedback.push(entry);
  ticket.updatedAt = new Date().toISOString();

  // Update approvals
  if (approved && !ticket.approvals.includes(personaId)) {
    ticket.approvals.push(personaId);
  } else if (!approved) {
    ticket.approvals = ticket.approvals.filter((p) => p !== personaId);
  }

  // Auto-transition to in-review on first feedback
  if (ticket.status === "draft" && ticket.feedback.length > 0) {
    ticket.status = "in-review";
  }

  // Auto-transition to consensus when threshold met
  const justReachedConsensus = autoTransitionToConsensus(ticket.id);

  // Auto-transition to building if threshold met and in consensus,
  // but skip if consensus was just reached this tick — let the UI
  // show the "consensus" status before auto-advancing to building.
  if (!justReachedConsensus) {
    autoTransitionToBuilding(ticket.id);
  }

  persistState();
  return entry;
}

export function getFeedbackHistory(
  ticketId: string,
  personaId?: PersonaId
): FeedbackEntry[] {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return [];
  const entries = personaId
    ? ticket.feedback.filter((f) => f.personaId === personaId)
    : ticket.feedback;
  return entries.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

// --- Consensus ---

export function getConsensusProgress(ticketId: string): {
  total: number;
  approved: number;
  remaining: PersonaId[];
} {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return { total: 0, approved: 0, remaining: [] };

  const allPersonas = getAllPersonas().map((p) => p.id);
  const remaining = allPersonas.filter((p) => !ticket.approvals.includes(p));

  return {
    total: allPersonas.length,
    approved: ticket.approvals.length,
    remaining,
  };
}

/**
 * Auto-transition to consensus status when threshold is met
 */
function autoTransitionToConsensus(ticketId: string): boolean {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return false;
  if (ticket.status !== "in-review") return false;

  const threshold = checkConsensusThreshold(ticket);
  if (threshold.reached) {
    ticket.status = "consensus";
    ticket.updatedAt = new Date().toISOString();
    return true;
  }
  return false;
}

/**
 * Auto-transition from consensus/in-review to building when threshold is met
 */
function autoTransitionToBuilding(ticketId: string): boolean {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return false;

  // Only transition from consensus or in-review
  if (ticket.status !== "consensus" && ticket.status !== "in-review") {
    return false;
  }

  const threshold = checkConsensusThreshold(ticket);
  if (!threshold.reached) return false;

  // Check all feedback is approved before auto-building
  const hasDisapprovals = ticket.feedback.some((f) => !f.approved);
  if (hasDisapprovals) return false;

  // Transition and generate build report
  ticket.status = "building";
  ticket.updatedAt = new Date().toISOString();

  // Auto-generate a build report
  const buildId = generateId("BLD", nextBuildReportId++);
  ticket.buildReport = buildBuildReport(ticket, buildId);

  return true;
}

// --- Build Reports ---

// Future use – exposed for API routes and external report consumers.
export function getBuildReport(
  ticketId: string
): BuildReport | undefined {
  const ticket = tickets.find((t) => t.id === ticketId);
  return ticket?.buildReport;
}

export function setBuildReport(
  ticketId: string,
  report: BuildReport
): BuildReport | null {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return null;
  ticket.buildReport = report;
  ticket.updatedAt = new Date().toISOString();
  persistState();
  return report;
}

/**
 * Manually trigger a build for a ticket.
 * Generates a new build report and transitions to building.
 */
export function triggerBuild(ticketId: string): BuildReport | null {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return null;

  const readiness = getBuildReadiness(ticket);
  if (!readiness.ready) return null;

  const buildId = generateId("BLD", nextBuildReportId++);
  const report = buildBuildReport(ticket, buildId);

  ticket.buildReport = report;
  ticket.status = "building";
  ticket.updatedAt = new Date().toISOString();

  persistState();
  return report;
}

/**
 * Complete a build, transitioning to done.
 */
export function completeBuild(ticketId: string): Ticket | null {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return null;
  if (ticket.status !== "building") return null;

  ticket.status = "done";
  ticket.updatedAt = new Date().toISOString();
  if (ticket.buildReport) {
    ticket.buildReport.status = "completed";
    ticket.buildReport.completedAt = new Date().toISOString();
  }
  persistState();
  return ticket;
}

// --- Seed Data ---

export function seedData(): void {
  if (tickets.length > 0) return;

  const t1 = createTicket(
    "Dark mode toggle in user settings",
    "Users have been requesting dark mode for months. We need a toggle in the settings panel that switches between light and dark themes, persisting the preference in localStorage."
  );
  addFeedback(
    t1.id,
    "designer",
    "Dark mode should use a cool gray palette (#0f0f0f bg, not pure black). The toggle should be a sun/moon icon switch with a smooth transition. We already have the design tokens in Figma — will link them.",
    true
  );
  addFeedback(
    t1.id,
    "engineer",
    "Straightforward to implement. We can use CSS custom properties with a data-theme attribute on <html>. Need to handle system preference detection as a default. localStorage for override. Should also respect prefers-reduced-motion for the transition.",
    true
  );
  addFeedback(
    t1.id,
    "qa",
    "Test on all breakpoints, especially mobile where the toggle position matters. Verify persistence across sessions and tabs. Check contrast ratios for all text sizes. Regression: make sure existing components don't break with dark theme variables.",
    false
  );

  const t2 = createTicket(
    "Real-time collaborative cursors in the whiteboard",
    "When multiple users are on the whiteboard, show each user's cursor position in real-time with their name/color. This is critical for the remote design review workflow."
  );
  addFeedback(
    t2.id,
    "product-owner",
    "This is the #1 request from our enterprise design teams. Blocks adoption for remote teams. Should be P0 for this quarter — let's scope it tightly: cursor positions only, no chat bubbles yet.",
    true
  );
  addFeedback(
    t2.id,
    "engineer",
    "Need to evaluate WebSocket vs WebRTC for cursor streaming. WebSocket is simpler but more server load. Cursor updates should be throttled (60fps is overkill — 15fps feels smooth enough). Need a presence service regardless.",
    false
  );

  const t3 = createTicket(
    "Export dashboard as PDF report",
    "Product managers need to export the analytics dashboard as a branded PDF report for stakeholder presentations. Should include charts, KPIs, and a configurable date range."
  );

  const t4 = createTicket(
    "API rate limiting by tenant",
    "Implement per-tenant rate limiting on the public API to prevent abuse and ensure fair usage across customers. Configurable limits per tier (free, pro, enterprise)."
  );
}

/**
 * Clear all in-memory data and localStorage persistence.
 */
export function clearStorage(): void {
  tickets = [];
  nextTicketId = 1;
  nextFeedbackId = 1;
  nextBuildReportId = 1;
  clearPersistedStorage();
}
