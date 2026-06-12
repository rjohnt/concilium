/**
 * server-db.ts — SQLite backend persistence for Concilium.
 *
 * This is the server-side source of truth. API routes use this module
 * instead of the client-side store (store.ts) which only works in the browser.
 *
 * Database: data/concilium.db (relative to project root)
 * Created automatically on first access with proper schema.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { Ticket, FeedbackEntry, FeedbackSource, BuildReport, BuildArtifact, BuildChangeRequest, PersonaId, TicketStatus, PriorityLevel, Tag, SeatMap, Project, SandboxProvider } from "../types";
import { checkConsensusThreshold } from "../consensus-threshold";

// ─── Database Path ───────────────────────────────────────────────────────────

const DB_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "concilium.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema();
    maybeSeedData();
  }
  return db;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

function initSchema(): void {
  const d = getDb();

  d.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'draft',
      priority    INTEGER NOT NULL DEFAULT 2,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      due_date    TEXT,
      tags_json   TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id          TEXT PRIMARY KEY,
      ticket_id   TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      persona_id  TEXT NOT NULL,
      content     TEXT NOT NULL,
      approved    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS build_reports (
      id                   TEXT PRIMARY KEY,
      ticket_id            TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      created_at           TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at         TEXT,
      status               TEXT NOT NULL DEFAULT 'building',
      requirements_json    TEXT NOT NULL DEFAULT '[]',
      design_decisions_json TEXT NOT NULL DEFAULT '[]',
      qa_criteria_json     TEXT NOT NULL DEFAULT '[]',
      implementation_plan  TEXT NOT NULL DEFAULT '',
      consensus_summary    TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS projects (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      repo_url         TEXT,
      default_branch   TEXT NOT NULL DEFAULT 'main',
      sandbox_provider TEXT NOT NULL DEFAULT 'local',
      create_pr        INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_feedback_ticket ON feedback(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_build_reports_ticket ON build_reports(ticket_id);
  `);

  migrateSchema(d);
}

/**
 * Additive column migrations for databases created before these features.
 * SQLite has no IF NOT EXISTS for columns, so probe the table info first.
 */
function migrateSchema(d: Database.Database): void {
  const addColumnIfMissing = (table: string, column: string, ddl: string) => {
    const columns = d.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!columns.some((c) => c.name === column)) {
      d.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    }
  };

  addColumnIfMissing("tickets", "seats_json", "seats_json TEXT NOT NULL DEFAULT '{}'");
  addColumnIfMissing("feedback", "source", "source TEXT NOT NULL DEFAULT 'human'");
  addColumnIfMissing("build_reports", "executor", "executor TEXT");
  addColumnIfMissing("build_reports", "artifacts_json", "artifacts_json TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing("build_reports", "change_requests_json", "change_requests_json TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing("build_reports", "error_message", "error_message TEXT");
  addColumnIfMissing("tickets", "project_id", "project_id TEXT REFERENCES projects(id) ON DELETE SET NULL");
  addColumnIfMissing("tickets", "branch_override", "branch_override TEXT");
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

function maybeSeedData(): void {
  const d = getDb();
  const row = d.prepare("SELECT value FROM meta WHERE key = 'seeded'").get() as { value: string } | undefined;
  if (row) return;

  const now = new Date().toISOString();

  // Seed tickets
  const tickets = [
    {
      id: "TIX-001",
      title: "Dark mode toggle in user settings",
      description: "Users have been requesting dark mode for months. We need a toggle in the settings panel that switches between light and dark themes, persisting the preference in localStorage.",
      status: "in-review",
      priority: 0,
      created_at: now,
      updated_at: now,
      tags_json: JSON.stringify([
        { id: "design", label: "Design", color: "bg-purple-900/50 text-purple-400 border-purple-700" },
        { id: "feature", label: "Feature", color: "bg-gold/20 text-gold-light border-gold/40" },
      ]),
    },
    {
      id: "TIX-002",
      title: "Real-time collaborative cursors in the whiteboard",
      description: "When multiple users are on the whiteboard, show each user's cursor position in real-time with their name/color. This is critical for the remote design review workflow.",
      status: "draft",
      priority: 1,
      created_at: now,
      updated_at: now,
      tags_json: JSON.stringify([
        { id: "feature", label: "Feature", color: "bg-gold/20 text-gold-light border-gold/40" },
        { id: "performance", label: "Performance", color: "bg-orange-900/50 text-orange-400 border-orange-800" },
      ]),
    },
  ];

  const insertTicket = d.prepare(`
    INSERT OR IGNORE INTO tickets (id, title, description, status, priority, created_at, updated_at, tags_json)
    VALUES (@id, @title, @description, @status, @priority, @created_at, @updated_at, @tags_json)
  `);

  const insertFeedback = d.prepare(`
    INSERT OR IGNORE INTO feedback (id, ticket_id, persona_id, content, approved, created_at)
    VALUES (@id, @ticket_id, @persona_id, @content, @approved, @created_at)
  `);

  const transaction = d.transaction(() => {
    for (const t of tickets) {
      insertTicket.run(t);
    }

    // Seed feedback for TIX-001
    insertFeedback.run({
      id: "FB-001",
      ticket_id: "TIX-001",
      persona_id: "designer",
      content: "Dark mode should use a cool gray palette (#0f0f0f bg, not pure black). The toggle should be a sun/moon icon switch with a smooth transition. We already have the design tokens in Figma — will link them.",
      approved: 1,
      created_at: now,
    });
    insertFeedback.run({
      id: "FB-002",
      ticket_id: "TIX-001",
      persona_id: "engineer",
      content: "Straightforward to implement. We can use CSS custom properties with a data-theme attribute on <html>. Need to handle system preference detection as a default. localStorage for override. Should also respect prefers-reduced-motion for the transition.",
      approved: 1,
      created_at: now,
    });
    insertFeedback.run({
      id: "FB-003",
      ticket_id: "TIX-001",
      persona_id: "qa",
      content: "Test on all breakpoints, especially mobile where the toggle position matters. Verify persistence across sessions and tabs. Check contrast ratios for all text sizes. Regression: make sure existing components don't break with dark theme variables.",
      approved: 0,
      created_at: now,
    });

    // Seed feedback for TIX-002
    insertFeedback.run({
      id: "FB-004",
      ticket_id: "TIX-002",
      persona_id: "product-owner",
      content: "This is a high-value feature that differentiates us from competitors. The initial scope should focus on cursor position + name labels only. We can add presence indicators and avatars in v2.",
      approved: 1,
      created_at: now,
    });
    insertFeedback.run({
      id: "FB-005",
      ticket_id: "TIX-002",
      persona_id: "designer",
      content: "Cursor colors should be auto-assigned from a curated palette. Each user gets a unique color. Cursors should fade out after 3 seconds of inactivity. Name labels should appear below the cursor with a subtle background.",
      approved: 1,
      created_at: now,
    });

    d.prepare("INSERT INTO meta (key, value) VALUES ('seeded', '1')").run();
  });

  transaction();
}

// ─── Conversion Helpers ──────────────────────────────────────────────────────

interface TicketRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  tags_json: string;
  seats_json: string;
  project_id: string | null;
  branch_override: string | null;
}

interface ProjectRow {
  id: string;
  name: string;
  repo_url: string | null;
  default_branch: string;
  sandbox_provider: string;
  create_pr: number;
  created_at: string;
}

interface FeedbackRow {
  id: string;
  ticket_id: string;
  persona_id: string;
  content: string;
  approved: number;
  created_at: string;
  source: string;
}

interface BuildReportRow {
  id: string;
  ticket_id: string;
  created_at: string;
  completed_at: string | null;
  status: string;
  requirements_json: string;
  design_decisions_json: string;
  qa_criteria_json: string;
  implementation_plan: string;
  consensus_summary: string;
  executor: string | null;
  artifacts_json: string;
  change_requests_json: string;
  error_message: string | null;
}

function rowToTicket(row: TicketRow): Ticket {
  const feedback = getDb().prepare(
    "SELECT * FROM feedback WHERE ticket_id = ? ORDER BY created_at ASC"
  ).all(row.id) as FeedbackRow[];

  const approvals: PersonaId[] = feedback
    .filter((f) => f.approved === 1)
    .map((f) => f.persona_id as PersonaId)
    .filter((v, i, a) => a.indexOf(v) === i); // unique

  const buildReportRow = getDb().prepare(
    "SELECT * FROM build_reports WHERE ticket_id = ? ORDER BY created_at DESC LIMIT 1"
  ).get(row.id) as BuildReportRow | undefined;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as TicketStatus,
    priority: row.priority as PriorityLevel,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dueDate: row.due_date || undefined,
    tags: JSON.parse(row.tags_json || "[]") as Tag[],
    seats: JSON.parse(row.seats_json || "{}") as SeatMap,
    projectId: row.project_id || null,
    branchOverride: row.branch_override || null,
    feedback: feedback.map(rowToFeedback),
    approvals,
    buildReport: buildReportRow ? rowToBuildReport(buildReportRow) : undefined,
  };
}

function rowToFeedback(row: FeedbackRow): FeedbackEntry {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    personaId: row.persona_id as PersonaId,
    content: row.content,
    createdAt: row.created_at,
    approved: row.approved === 1,
    source: (row.source || "human") as FeedbackSource,
  };
}

function rowToBuildReport(row: BuildReportRow): BuildReport {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    createdAt: row.created_at,
    completedAt: row.completed_at || undefined,
    status: row.status as "building" | "completed" | "failed",
    requirements: JSON.parse(row.requirements_json || "[]"),
    designDecisions: JSON.parse(row.design_decisions_json || "[]"),
    qaCriteria: JSON.parse(row.qa_criteria_json || "[]"),
    implementationPlan: row.implementation_plan,
    consensusSummary: row.consensus_summary,
    executor: row.executor || undefined,
    artifacts: JSON.parse(row.artifacts_json || "[]") as BuildArtifact[],
    changeRequests: JSON.parse(row.change_requests_json || "[]") as BuildChangeRequest[],
    errorMessage: row.error_message || undefined,
  };
}

// ─── Public API: Tickets ─────────────────────────────────────────────────────

export function getTickets(): Ticket[] {
  const rows = getDb().prepare("SELECT * FROM tickets ORDER BY updated_at DESC").all() as TicketRow[];
  return rows.map(rowToTicket);
}

export function getTicket(id: string): Ticket | undefined {
  const row = getDb().prepare("SELECT * FROM tickets WHERE id = ?").get(id) as TicketRow | undefined;
  if (!row) return undefined;
  return rowToTicket(row);
}

export function createTicket(
  title: string,
  description: string,
  priority: PriorityLevel = 2,
  dueDate?: string,
  tags: Tag[] = [],
  id?: string
): Ticket {
  const d = getDb();
  const ticketId = id || `TIX-${String(nextTicketId()).padStart(3, "0")}`;
  const now = new Date().toISOString();
  const tagsJson = JSON.stringify(tags);

  d.prepare(`
    INSERT INTO tickets (id, title, description, status, priority, created_at, updated_at, due_date, tags_json)
    VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?)
  `).run(ticketId, title, description, priority, now, now, dueDate || null, tagsJson);

  return getTicket(ticketId)!;
}

function nextTicketId(): number {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM tickets").get() as { count: number };
  return row.count + 1;
}

export function deleteTicket(id: string): boolean {
  const d = getDb();
  const existing = d.prepare("SELECT id FROM tickets WHERE id = ?").get(id);
  if (!existing) return false;
  d.prepare("DELETE FROM build_reports WHERE ticket_id = ?").run(id);
  d.prepare("DELETE FROM feedback WHERE ticket_id = ?").run(id);
  d.prepare("DELETE FROM tickets WHERE id = ?").run(id);
  return true;
}

export function updateTicket(
  ticketId: string,
  updates: { title?: string; description?: string; dueDate?: string | null; priority?: PriorityLevel; status?: TicketStatus; tags?: Tag[]; seats?: SeatMap; projectId?: string | null; branchOverride?: string | null }
): Ticket | undefined {
  const d = getDb();
  const existing = d.prepare("SELECT * FROM tickets WHERE id = ?").get(ticketId) as TicketRow | undefined;
  if (!existing) return undefined;

  const now = new Date().toISOString();
  const setClauses: string[] = ["updated_at = ?"];
  const params: unknown[] = [now];

  if (updates.title !== undefined) {
    setClauses.push("title = ?");
    params.push(updates.title);
  }
  if (updates.description !== undefined) {
    setClauses.push("description = ?");
    params.push(updates.description);
  }
  if (updates.dueDate !== undefined) {
    setClauses.push("due_date = ?");
    params.push(updates.dueDate || null);
  }
  if (updates.priority !== undefined) {
    setClauses.push("priority = ?");
    params.push(updates.priority);
  }
  if (updates.status !== undefined) {
    setClauses.push("status = ?");
    params.push(updates.status);
  }
  if (updates.tags !== undefined) {
    setClauses.push("tags_json = ?");
    params.push(JSON.stringify(updates.tags));
  }
  if (updates.seats !== undefined) {
    setClauses.push("seats_json = ?");
    params.push(JSON.stringify(updates.seats));
  }
  if (updates.projectId !== undefined) {
    setClauses.push("project_id = ?");
    params.push(updates.projectId || null);
  }
  if (updates.branchOverride !== undefined) {
    setClauses.push("branch_override = ?");
    params.push(updates.branchOverride || null);
  }

  params.push(ticketId);
  d.prepare(`UPDATE tickets SET ${setClauses.join(", ")} WHERE id = ?`).run(...params);
  return getTicket(ticketId);
}

// ─── Public API: Feedback ────────────────────────────────────────────────────

export function addFeedback(
  ticketId: string,
  personaId: PersonaId,
  content: string,
  approved: boolean,
  source: FeedbackSource = "human"
): FeedbackEntry | null {
  const d = getDb();
  const ticket = d.prepare("SELECT id, status FROM tickets WHERE id = ?").get(ticketId) as { id: string; status: string } | undefined;
  if (!ticket) return null;

  const feedbackId = `FB-${String(nextFeedbackId()).padStart(3, "0")}`;
  const now = new Date().toISOString();

  d.prepare(`
    INSERT INTO feedback (id, ticket_id, persona_id, content, approved, created_at, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(feedbackId, ticketId, personaId, content, approved ? 1 : 0, now, source);

  // Auto-transition to in-review on first feedback
  if (ticket.status === "draft") {
    d.prepare("UPDATE tickets SET status = 'in-review', updated_at = ? WHERE id = ?").run(now, ticketId);
  }

  // Check consensus and auto-transition
  const updatedTicket = getTicket(ticketId);
  if (updatedTicket) {
    const threshold = checkConsensusThreshold(updatedTicket);
    if (threshold.reached && updatedTicket.status === "in-review") {
      d.prepare("UPDATE tickets SET status = 'consensus', updated_at = ? WHERE id = ?").run(now, ticketId);
    }
  }

  return getFeedbackById(feedbackId);
}

function getFeedbackById(id: string): FeedbackEntry | null {
  const row = getDb().prepare("SELECT * FROM feedback WHERE id = ?").get(id) as FeedbackRow | undefined;
  if (!row) return null;
  return rowToFeedback(row);
}

function nextFeedbackId(): number {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM feedback").get() as { count: number };
  return row.count + 1;
}

export function getFeedbackHistory(ticketId: string): FeedbackEntry[] {
  const rows = getDb().prepare(
    "SELECT * FROM feedback WHERE ticket_id = ? ORDER BY created_at ASC"
  ).all(ticketId) as FeedbackRow[];
  return rows.map(rowToFeedback);
}

// ─── Public API: Build Reports ───────────────────────────────────────────────

export function setBuildReport(ticketId: string, report: BuildReport): BuildReport | undefined {
  const d = getDb();
  const existing = d.prepare("SELECT id FROM tickets WHERE id = ?").get(ticketId);
  if (!existing) return undefined;

  const now = new Date().toISOString();

  d.prepare(`
    INSERT OR REPLACE INTO build_reports (id, ticket_id, created_at, completed_at, status, requirements_json, design_decisions_json, qa_criteria_json, implementation_plan, consensus_summary, executor, artifacts_json, change_requests_json, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    report.id,
    ticketId,
    report.createdAt,
    report.completedAt || null,
    report.status,
    JSON.stringify(report.requirements),
    JSON.stringify(report.designDecisions),
    JSON.stringify(report.qaCriteria),
    report.implementationPlan,
    report.consensusSummary,
    report.executor || null,
    JSON.stringify(report.artifacts ?? []),
    JSON.stringify(report.changeRequests ?? []),
    report.errorMessage || null,
  );

  // Mark ticket as done if build is completed
  if (report.status === "completed") {
    d.prepare("UPDATE tickets SET status = 'done', updated_at = ? WHERE id = ?").run(now, ticketId);
  }

  return getBuildReport(ticketId);
}

export function getBuildReport(ticketId: string): BuildReport | undefined {
  const row = getDb().prepare(
    "SELECT * FROM build_reports WHERE ticket_id = ? ORDER BY created_at DESC LIMIT 1"
  ).get(ticketId) as BuildReportRow | undefined;
  if (!row) return undefined;
  return rowToBuildReport(row);
}

export function completeBuild(ticketId: string): Ticket | undefined {
  const d = getDb();
  const ticket = d.prepare("SELECT id, status FROM tickets WHERE id = ?").get(ticketId) as { id: string; status: string } | undefined;
  if (!ticket) return undefined;
  if (ticket.status !== "building") return undefined;

  const now = new Date().toISOString();
  d.prepare("UPDATE tickets SET status = 'done', updated_at = ? WHERE id = ?").run(now, ticketId);
  d.prepare("UPDATE build_reports SET status = 'completed', completed_at = ? WHERE ticket_id = ?").run(now, ticketId);

  return getTicket(ticketId);
}

export function updateTicketStatus(ticketId: string, status: TicketStatus): Ticket | undefined {
  return updateTicket(ticketId, { status });
}

// ─── Public API: Projects ────────────────────────────────────────────────────

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    repoUrl: row.repo_url || null,
    defaultBranch: row.default_branch || "main",
    sandboxProvider: (row.sandbox_provider || "local") as SandboxProvider,
    createPr: row.create_pr === 1,
    createdAt: row.created_at,
  };
}

function nextProjectId(): number {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM projects").get() as { count: number };
  return row.count + 1;
}

export function getProjects(): Project[] {
  const rows = getDb().prepare("SELECT * FROM projects ORDER BY created_at ASC").all() as ProjectRow[];
  return rows.map(rowToProject);
}

export function getProject(id: string): Project | undefined {
  const row = getDb().prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
  return row ? rowToProject(row) : undefined;
}

export function createProject(
  name: string,
  options: {
    repoUrl?: string | null;
    defaultBranch?: string;
    sandboxProvider?: SandboxProvider;
    createPr?: boolean;
  } = {},
  id?: string
): Project {
  const d = getDb();
  const projectId = id || `PRJ-${String(nextProjectId()).padStart(3, "0")}`;
  const now = new Date().toISOString();

  d.prepare(`
    INSERT INTO projects (id, name, repo_url, default_branch, sandbox_provider, create_pr, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId,
    name,
    options.repoUrl || null,
    options.defaultBranch || "main",
    options.sandboxProvider || "local",
    options.createPr ? 1 : 0,
    now,
  );

  return getProject(projectId)!;
}

export function updateProject(
  projectId: string,
  updates: {
    name?: string;
    repoUrl?: string | null;
    defaultBranch?: string;
    sandboxProvider?: SandboxProvider;
    createPr?: boolean;
  }
): Project | undefined {
  const d = getDb();
  const existing = d.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!existing) return undefined;

  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (updates.name !== undefined) {
    setClauses.push("name = ?");
    params.push(updates.name);
  }
  if (updates.repoUrl !== undefined) {
    setClauses.push("repo_url = ?");
    params.push(updates.repoUrl || null);
  }
  if (updates.defaultBranch !== undefined) {
    setClauses.push("default_branch = ?");
    params.push(updates.defaultBranch || "main");
  }
  if (updates.sandboxProvider !== undefined) {
    setClauses.push("sandbox_provider = ?");
    params.push(updates.sandboxProvider);
  }
  if (updates.createPr !== undefined) {
    setClauses.push("create_pr = ?");
    params.push(updates.createPr ? 1 : 0);
  }

  if (setClauses.length > 0) {
    params.push(projectId);
    d.prepare(`UPDATE projects SET ${setClauses.join(", ")} WHERE id = ?`).run(...params);
  }
  return getProject(projectId);
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ─── Sync: Seed from localStorage data (one-time migration helper) ───────────

export function seedFromClientData(clientData: {
  tickets: Ticket[];
  nextTicketId: number;
  nextFeedbackId: number;
  nextBuildReportId: number;
}): { imported: number } {
  const d = getDb();
  let imported = 0;

  const transaction = d.transaction(() => {
    for (const ticket of clientData.tickets) {
      const existing = d.prepare("SELECT id FROM tickets WHERE id = ?").get(ticket.id);
      if (existing) continue;

      createTicket(
        ticket.title,
        ticket.description,
        ticket.priority,
        ticket.dueDate,
        ticket.tags,
        ticket.id,
      );

      // Restore status, dates, and seats
      d.prepare("UPDATE tickets SET status = ?, created_at = ?, updated_at = ?, seats_json = ? WHERE id = ?")
        .run(ticket.status, ticket.createdAt, ticket.updatedAt, JSON.stringify(ticket.seats ?? {}), ticket.id);

      // Restore feedback
      for (const fb of ticket.feedback) {
        d.prepare(`
          INSERT OR IGNORE INTO feedback (id, ticket_id, persona_id, content, approved, created_at, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(fb.id, ticket.id, fb.personaId, fb.content, fb.approved ? 1 : 0, fb.createdAt, fb.source ?? "human");
      }

      // Restore build report
      if (ticket.buildReport) {
        const br = ticket.buildReport;
        d.prepare(`
          INSERT OR REPLACE INTO build_reports (id, ticket_id, created_at, completed_at, status, requirements_json, design_decisions_json, qa_criteria_json, implementation_plan, consensus_summary)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          br.id, ticket.id, br.createdAt, br.completedAt || null, br.status,
          JSON.stringify(br.requirements), JSON.stringify(br.designDecisions),
          JSON.stringify(br.qaCriteria), br.implementationPlan, br.consensusSummary,
        );
      }

      imported++;
    }
  });

  transaction();
  return { imported };
}
