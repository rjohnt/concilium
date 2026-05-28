import { Ticket, FeedbackEntry, PersonaId, TicketStatus, PriorityLevel, BuildReport, Tag } from "./types";
import { getAllPersonas } from "./personas";
import { checkConsensusThreshold, getBuildReadiness, buildBuildReport } from "./consensus-threshold";
import {
  saveTickets,
  loadTickets,
  clearStorage as clearPersistedStorage,
  STORAGE_KEY,
} from "./persistence";
import { broadcastTicketUpdate, broadcastFullSync, onTicketUpdate } from "./crossTabSync";
import {
  fetchAllTickets,
  fetchTicket as apiFetchTicket,
  createTicketOnServer,
  updateTicketOnServer,
  deleteTicketOnServer,
  addFeedbackOnServer,
  syncPullAll,
  syncPushAll,
} from "./api-client";
import {
  notifyFeedbackSubmitted,
  notifyConsensusReached,
  notifyBuildCompleted,
} from "./notifications";

// === In-memory store with localStorage persistence + server sync ===

// Track whether we've seeded from the server in this session
let serverSyncAttempted = false;

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

// --- Debounced persistence ---

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function generateId(prefix: string, counter: number): string {
  return `${prefix}-${String(counter).padStart(3, "0")}`;
}

function persistState(changedTicketId?: string): void {
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    saveTickets(tickets, nextTicketId, nextFeedbackId, nextBuildReportId);
    persistTimer = null;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tickets-changed"));
      // Broadcast via BroadcastChannel for immediate cross-tab sync
      if (changedTicketId) {
        broadcastTicketUpdate(changedTicketId, "updated");
      }
    }
  }, 50);
}

function cancelPendingPersist(): void {
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
}

function reloadFromStorage(): void {
  const state = loadTickets();
  tickets = state.tickets;
  nextTicketId = state.nextTicketId;
  nextFeedbackId = state.nextFeedbackId;
  nextBuildReportId = state.nextBuildReportId;
}

// --- Cross-tab sync via storage event and BroadcastChannel ---

if (typeof window !== "undefined") {
  // Storage event: fires in OTHER tabs when localStorage is modified
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      cancelPendingPersist();
      reloadFromStorage();
    }
  });

  // BroadcastChannel: immediate sync for same-origin tabs (including the
  // emitting tab, which doesn't receive the storage event above).
  onTicketUpdate(() => {
    cancelPendingPersist();
    reloadFromStorage();
    // Let in-tab listeners know state has changed without waiting for
    // the 50 ms debounce window that persistState() would have used.
    window.dispatchEvent(new CustomEvent("tickets-changed"));
  });
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
  description: string,
  priority: PriorityLevel = 2,
  dueDate?: string,
  tags: Tag[] = []
): Ticket {
  const id = generateId("TIX", nextTicketId++);
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id,
    title,
    description,
    status: "draft",
    priority,
    createdAt: now,
    updatedAt: now,
    dueDate,
    tags,
    feedback: [],
    approvals: [],
  };
  tickets.push(ticket);
  persistState(id);

  // Fire-and-forget server sync
  createTicketOnServer(title, description, priority, dueDate, tags)
    .catch(() => { /* server unreachable — fine */ });

  return ticket;
}

export function deleteTicket(ticketId: string): boolean {
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index === -1) return false;
  tickets.splice(index, 1);
  persistState(ticketId);

  // Fire-and-forget server sync
  deleteTicketOnServer(ticketId).catch(() => {});

  return true;
}

export function updateTicket(
  ticketId: string,
  updates: { title?: string; description?: string; dueDate?: string | null }
): Ticket | null {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return null;
  if (updates.title !== undefined) {
    ticket.title = updates.title;
  }
  if (updates.description !== undefined) {
    ticket.description = updates.description;
  }
  if (updates.dueDate !== undefined) {
    ticket.dueDate = updates.dueDate || undefined;
  }
  ticket.updatedAt = new Date().toISOString();
  persistState(ticketId);

  // Fire-and-forget server sync
  updateTicketOnServer(ticketId, updates as any).catch(() => {});

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
  persistState(ticketId);
  return ticket;
}

export function updateTicketPriority(
  ticketId: string,
  priority: PriorityLevel
): Ticket | null {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return null;
  ticket.priority = priority;
  ticket.updatedAt = new Date().toISOString();
  persistState(ticketId);
  return ticket;
}

export function updateTicketTags(
  ticketId: string,
  tags: Tag[]
): Ticket | null {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return null;
  ticket.tags = tags;
  ticket.updatedAt = new Date().toISOString();
  persistState(ticketId);
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

  persistState(ticketId);

  // Fire notification for feedback submission
  if (typeof window !== "undefined") {
    const persona = getAllPersonas().find((p) => p.id === personaId);
    if (persona) {
      notifyFeedbackSubmitted(ticketId, ticket.title, persona.label, approved);
    }
  }

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

    // Fire notification
    if (typeof window !== "undefined") {
      const allPersonas = getAllPersonas();
      notifyConsensusReached(
        ticketId,
        ticket.title,
        ticket.approvals.length,
        allPersonas.length,
      );
    }

    return true;
  }
  return false;
}

/**
 * Auto-transition from consensus/in-review to building when threshold is met.
 * Sets status + building stub immediately, fires background API call
 * to generate the full LLM-powered build report.
 */
async function autoTransitionToBuilding(ticketId: string): Promise<boolean> {
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

  // Set status + building stub immediately
  ticket.status = "building";
  ticket.updatedAt = new Date().toISOString();

  const buildId = generateId("BLD", nextBuildReportId++);
  ticket.buildReport = {
    id: buildId,
    ticketId,
    createdAt: new Date().toISOString(),
    status: "building",
    requirements: ["Generating build report from persona feedback..."],
    designDecisions: [],
    qaCriteria: [],
    implementationPlan: "## Building...\n\nThe build report is being generated from persona consensus feedback.",
    consensusSummary: `Generating... (${ticket.approvals.length}/${getAllPersonas().length} approved)`,
  };
  persistState();

  // Fire background API call to generate the real LLM-powered report,
  // then auto-complete the build when the report arrives.
  fetchBuildFromAPI(ticketId).then((report) => {
    if (report) {
      setBuildReport(ticketId, report);
      // Auto-transition to done — the full pipeline is complete.
      completeBuild(ticketId);
    }
  }).catch((err) => {
    console.error("Background build API call failed:", err);
  });

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
  persistState(ticketId);
  return report;
}

/**
 * Internal helper: call the POST /api/build endpoint and return the generated BuildReport.
 */
async function fetchBuildFromAPI(ticketId: string): Promise<BuildReport | null> {
  try {
    const baseUrl = typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "request failed" }));
      console.error(`fetchBuildFromAPI failed (${response.status}):`, err);
      return null;
    }

    const data = await response.json();
    return data.buildReport ?? null;
  } catch (err) {
    console.error("fetchBuildFromAPI error:", err);
    return null;
  }
}

/**
 * Manually trigger a build for a ticket.
 * Calls the LLM-powered build API and returns the generated report.
 */
export async function triggerBuild(ticketId: string): Promise<BuildReport | null> {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return null;

  const readiness = getBuildReadiness(ticket);
  if (!readiness.ready) return null;

  // Transition to building immediately with a stub
  ticket.status = "building";
  ticket.updatedAt = new Date().toISOString();

  const buildId = generateId("BLD", nextBuildReportId++);
  ticket.buildReport = {
    id: buildId,
    ticketId,
    createdAt: new Date().toISOString(),
    status: "building",
    requirements: ["Generating build report..."],
    designDecisions: [],
    qaCriteria: [],
    implementationPlan: "## Building...\n\nRequesting build report from API.",
    consensusSummary: `Pending... (${ticket.approvals.length}/${getAllPersonas().length} approved)`,
  };
  persistState(ticketId);

  // Call the API and await the full report
  const report = await fetchBuildFromAPI(ticketId);
  if (report) {
    setBuildReport(ticketId, report);
    // Auto-transition to done — the full pipeline is complete.
    completeBuild(ticketId);
    return report;
  }

  // Fallback: if API call fails, keep the stub
  return ticket.buildReport;
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
  persistState(ticketId);

  // Fire notification
  if (typeof window !== "undefined") {
    notifyBuildCompleted(ticketId, ticket.title);
  }

  return ticket;
}

// --- Seed Data ---

export function seedData(): void {
  if (tickets.length > 0 && serverSyncAttempted) return;

  // Only try server sync once per session
  if (!serverSyncAttempted) {
    serverSyncAttempted = true;
    // Fire-and-forget: try to pull from server, seed with local data if empty
    syncPullAll().then((serverTickets) => {
      if (serverTickets && serverTickets.length > 0) {
        // Server has data — overwrite localStorage with server state
        cancelPendingPersist();
        tickets = serverTickets;
        // Recalculate next IDs
        const maxTicketNum = tickets.reduce((max, t) => {
          const m = parseInt(t.id.replace("TIX-", ""), 10);
          return isNaN(m) ? max : Math.max(max, m);
        }, 0);
        nextTicketId = maxTicketNum + 1;
        const maxFeedbackNum = tickets.reduce((max, t) => {
          return t.feedback.reduce((fm, f) => {
            const n = parseInt(f.id.replace("FB-", ""), 10);
            return isNaN(n) ? fm : Math.max(fm, n);
          }, max);
        }, 0);
        nextFeedbackId = maxFeedbackNum + 1;
        persistState();
        window.dispatchEvent(new CustomEvent("tickets-changed"));
        return;
      }

      // Server is empty — push local seed data to server
      if (tickets.length > 0) {
        syncPushAll(tickets, nextTicketId, nextFeedbackId, nextBuildReportId);
      }
    }).catch(() => {
      // Server unreachable — continue with localStorage only
    });
  }

  // Local seed data (if empty)
  if (tickets.length > 0) return;

  const t1 = createTicket(
    "Dark mode toggle in user settings",
    "Users have been requesting dark mode for months. We need a toggle in the settings panel that switches between light and dark themes, persisting the preference in localStorage.",
    0, // Urgent
    undefined,
    [{ id: "design", label: "Design", color: "bg-purple-900/50 text-purple-400 border-purple-700" }, { id: "feature", label: "Feature", color: "bg-gold/20 text-gold-light border-gold/40" }]
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
    "When multiple users are on the whiteboard, show each user's cursor position in real-time with their name/color. This is critical for the remote design review workflow.",
    1, // High
    undefined,
    [{ id: "feature", label: "Feature", color: "bg-gold/20 text-gold-light border-gold/40" }, { id: "performance", label: "Performance", color: "bg-orange-900/50 text-orange-400 border-orange-800" }]
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
    "Product managers need to export the analytics dashboard as a branded PDF report for stakeholder presentations. Should include charts, KPIs, and a configurable date range.",
    2, // Medium
    undefined,
    [{ id: "feature", label: "Feature", color: "bg-gold/20 text-gold-light border-gold/40" }, { id: "docs", label: "Docs", color: "bg-blue-steel/20 text-blue-steel border-blue-steel/40" }]
  );

  const t4 = createTicket(
    "API rate limiting by tenant",
    "Implement per-tenant rate limiting on the public API to prevent abuse and ensure fair usage across customers. Configurable limits per tier (free, pro, enterprise).",
    3, // Low
    undefined,
    [{ id: "security", label: "Security", color: "bg-red-950/60 text-red-400 border-red-900" }, { id: "performance", label: "Performance", color: "bg-orange-900/50 text-orange-400 border-orange-800" }]
  );

  // Notify listeners after seeding so sidebar badge updates on initial load
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tickets-changed"));
  }
}

/**
 * Clear all in-memory data and localStorage persistence.
 */
export function clearStorage(): void {
  tickets = [];
  nextTicketId = 1;
  nextFeedbackId = 1;
  nextBuildReportId = 1;
  cancelPendingPersist();
  clearPersistedStorage();
  if (typeof window !== "undefined") {
    broadcastFullSync();
  }
}
