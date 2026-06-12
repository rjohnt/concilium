/**
 * supabase-db.ts — Supabase Postgres persistence for Concilium.
 *
 * Server-side implementation of the data layer, mirroring sqlite-db.ts
 * function-for-function but backed by the Concilium Supabase project.
 * Selected by server-db.ts when SUPABASE_SERVICE_ROLE_KEY is configured.
 *
 * Uses the service-role key (bypasses RLS) — server-only; this module must
 * never be imported from client components.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  Ticket,
  FeedbackEntry,
  FeedbackSource,
  BuildReport,
  BuildArtifact,
  BuildChangeRequest,
  PersonaId,
  TicketStatus,
  PriorityLevel,
  Tag,
  SeatMap,
  Project,
  SandboxProvider,
} from "../types";
import { checkConsensusThreshold } from "../consensus-threshold";

// ─── Client ──────────────────────────────────────────────────────────────────

let client: SupabaseClient | null = null;

export function isSupabaseDbConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return client;
}

// ─── Row Types ───────────────────────────────────────────────────────────────

interface TicketRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  tags: Tag[];
  seats: SeatMap;
  project_id: string | null;
  branch_override: string | null;
}

interface ProjectRow {
  id: string;
  name: string;
  repo_url: string | null;
  default_branch: string;
  sandbox_provider: string;
  create_pr: boolean;
  created_at: string;
}

interface FeedbackRow {
  id: string;
  ticket_id: string;
  persona_id: string;
  content: string;
  approved: boolean;
  source: string;
  created_at: string;
}

interface BuildReportRow {
  id: string;
  ticket_id: string;
  created_at: string;
  completed_at: string | null;
  status: string;
  requirements: string[];
  design_decisions: string[];
  qa_criteria: string[];
  implementation_plan: string;
  consensus_summary: string;
  executor: string | null;
  artifacts: BuildArtifact[];
  change_requests: BuildChangeRequest[];
  error_message: string | null;
}

// ─── Conversion ──────────────────────────────────────────────────────────────

function rowToFeedback(row: FeedbackRow): FeedbackEntry {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    personaId: row.persona_id as PersonaId,
    content: row.content,
    createdAt: row.created_at,
    approved: row.approved,
    source: (row.source || "human") as FeedbackSource,
  };
}

function rowToBuildReport(row: BuildReportRow): BuildReport {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    createdAt: row.created_at,
    completedAt: row.completed_at || undefined,
    status: row.status as BuildReport["status"],
    requirements: row.requirements ?? [],
    designDecisions: row.design_decisions ?? [],
    qaCriteria: row.qa_criteria ?? [],
    implementationPlan: row.implementation_plan,
    consensusSummary: row.consensus_summary,
    executor: row.executor || undefined,
    artifacts: row.artifacts ?? [],
    changeRequests: row.change_requests ?? [],
    errorMessage: row.error_message || undefined,
  };
}

function assembleTicket(
  row: TicketRow,
  feedback: FeedbackEntry[],
  buildReport?: BuildReport
): Ticket {
  // Same derivation as sqlite-db: any approved feedback row marks the persona
  const approvals: PersonaId[] = Array.from(
    new Set(feedback.filter((f) => f.approved).map((f) => f.personaId))
  );

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as TicketStatus,
    priority: row.priority as PriorityLevel,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dueDate: row.due_date || undefined,
    tags: row.tags ?? [],
    seats: row.seats ?? {},
    projectId: row.project_id ?? null,
    branchOverride: row.branch_override ?? null,
    feedback,
    approvals,
    buildReport,
  };
}

function throwOnError<T>(result: { data: T; error: { message: string } | null }, op: string): T {
  if (result.error) {
    throw new Error(`Supabase ${op} failed: ${result.error.message}`);
  }
  return result.data;
}

// ─── Tickets ─────────────────────────────────────────────────────────────────

async function feedbackForTicket(ticketId: string): Promise<FeedbackEntry[]> {
  const db = getClient();
  const rows = throwOnError(
    await db
      .from("feedback")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
    "feedback select"
  ) as FeedbackRow[];
  return rows.map(rowToFeedback);
}

async function latestBuildReport(ticketId: string): Promise<BuildReport | undefined> {
  const db = getClient();
  const rows = throwOnError(
    await db
      .from("build_reports")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false })
      .limit(1),
    "build_reports select"
  ) as BuildReportRow[];
  return rows.length > 0 ? rowToBuildReport(rows[0]) : undefined;
}

export async function getTickets(): Promise<Ticket[]> {
  const db = getClient();
  const [ticketRows, feedbackRows, reportRows] = await Promise.all([
    db.from("tickets").select("*").order("updated_at", { ascending: false }),
    db.from("feedback").select("*").order("created_at", { ascending: true }),
    db.from("build_reports").select("*").order("created_at", { ascending: false }),
  ]);

  const tickets = throwOnError(ticketRows, "tickets select") as TicketRow[];
  const feedback = throwOnError(feedbackRows, "feedback select") as FeedbackRow[];
  const reports = throwOnError(reportRows, "build_reports select") as BuildReportRow[];

  const feedbackByTicket = new Map<string, FeedbackEntry[]>();
  for (const row of feedback) {
    const list = feedbackByTicket.get(row.ticket_id) ?? [];
    list.push(rowToFeedback(row));
    feedbackByTicket.set(row.ticket_id, list);
  }

  // reports are ordered newest-first; first seen per ticket is the latest
  const latestReportByTicket = new Map<string, BuildReport>();
  for (const row of reports) {
    if (!latestReportByTicket.has(row.ticket_id)) {
      latestReportByTicket.set(row.ticket_id, rowToBuildReport(row));
    }
  }

  return tickets.map((row) =>
    assembleTicket(row, feedbackByTicket.get(row.id) ?? [], latestReportByTicket.get(row.id))
  );
}

export async function getTicket(id: string): Promise<Ticket | undefined> {
  const db = getClient();
  const rows = throwOnError(
    await db.from("tickets").select("*").eq("id", id).limit(1),
    "tickets select"
  ) as TicketRow[];
  if (rows.length === 0) return undefined;

  const [feedback, buildReport] = await Promise.all([
    feedbackForTicket(id),
    latestBuildReport(id),
  ]);
  return assembleTicket(rows[0], feedback, buildReport);
}

async function nextId(table: "tickets" | "feedback" | "projects", prefix: string): Promise<string> {
  const db = getClient();
  const result = await db.from(table).select("*", { count: "exact", head: true });
  if (result.error) throw new Error(`Supabase count failed: ${result.error.message}`);
  return `${prefix}-${String((result.count ?? 0) + 1).padStart(3, "0")}`;
}

export async function createTicket(
  title: string,
  description: string,
  priority: PriorityLevel = 2,
  dueDate?: string,
  tags: Tag[] = [],
  id?: string
): Promise<Ticket> {
  const db = getClient();
  const ticketId = id || (await nextId("tickets", "TIX"));
  const now = new Date().toISOString();

  throwOnError(
    await db.from("tickets").insert({
      id: ticketId,
      title,
      description,
      status: "draft",
      priority,
      created_at: now,
      updated_at: now,
      due_date: dueDate || null,
      tags,
      seats: {},
    }),
    "tickets insert"
  );

  return (await getTicket(ticketId))!;
}

export async function deleteTicket(id: string): Promise<boolean> {
  const db = getClient();
  const existing = throwOnError(
    await db.from("tickets").select("id").eq("id", id).limit(1),
    "tickets select"
  ) as { id: string }[];
  if (existing.length === 0) return false;

  // FK cascade removes feedback + build_reports
  throwOnError(await db.from("tickets").delete().eq("id", id), "tickets delete");
  return true;
}

export async function updateTicket(
  ticketId: string,
  updates: {
    title?: string;
    description?: string;
    dueDate?: string | null;
    priority?: PriorityLevel;
    status?: TicketStatus;
    tags?: Tag[];
    seats?: SeatMap;
    projectId?: string | null;
    branchOverride?: string | null;
  }
): Promise<Ticket | undefined> {
  const db = getClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.dueDate !== undefined) patch.due_date = updates.dueDate || null;
  if (updates.priority !== undefined) patch.priority = updates.priority;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.tags !== undefined) patch.tags = updates.tags;
  if (updates.seats !== undefined) patch.seats = updates.seats;
  if (updates.projectId !== undefined) patch.project_id = updates.projectId || null;
  if (updates.branchOverride !== undefined) patch.branch_override = updates.branchOverride || null;

  const result = await db.from("tickets").update(patch).eq("id", ticketId).select("id");
  if (result.error) throw new Error(`Supabase tickets update failed: ${result.error.message}`);
  if (!result.data || result.data.length === 0) return undefined;

  return getTicket(ticketId);
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus
): Promise<Ticket | undefined> {
  return updateTicket(ticketId, { status });
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export async function addFeedback(
  ticketId: string,
  personaId: PersonaId,
  content: string,
  approved: boolean,
  source: FeedbackSource = "human"
): Promise<FeedbackEntry | null> {
  const db = getClient();
  const ticketRows = throwOnError(
    await db.from("tickets").select("id, status").eq("id", ticketId).limit(1),
    "tickets select"
  ) as { id: string; status: string }[];
  if (ticketRows.length === 0) return null;

  const feedbackId = await nextId("feedback", "FB");
  const now = new Date().toISOString();

  throwOnError(
    await db.from("feedback").insert({
      id: feedbackId,
      ticket_id: ticketId,
      persona_id: personaId,
      content,
      approved,
      source,
      created_at: now,
    }),
    "feedback insert"
  );

  // Auto-transition to in-review on first feedback
  if (ticketRows[0].status === "draft") {
    await db.from("tickets").update({ status: "in-review", updated_at: now }).eq("id", ticketId);
  }

  // Check consensus and auto-transition
  const updatedTicket = await getTicket(ticketId);
  if (updatedTicket) {
    const threshold = checkConsensusThreshold(updatedTicket);
    if (threshold.reached && updatedTicket.status === "in-review") {
      await db.from("tickets").update({ status: "consensus", updated_at: now }).eq("id", ticketId);
    }
  }

  const rows = throwOnError(
    await db.from("feedback").select("*").eq("id", feedbackId).limit(1),
    "feedback select"
  ) as FeedbackRow[];
  return rows.length > 0 ? rowToFeedback(rows[0]) : null;
}

export async function getFeedbackHistory(ticketId: string): Promise<FeedbackEntry[]> {
  return feedbackForTicket(ticketId);
}

// ─── Build Reports ───────────────────────────────────────────────────────────

export async function setBuildReport(
  ticketId: string,
  report: BuildReport
): Promise<BuildReport | undefined> {
  const db = getClient();
  const existing = throwOnError(
    await db.from("tickets").select("id").eq("id", ticketId).limit(1),
    "tickets select"
  ) as { id: string }[];
  if (existing.length === 0) return undefined;

  const now = new Date().toISOString();

  throwOnError(
    await db.from("build_reports").upsert({
      id: report.id,
      ticket_id: ticketId,
      created_at: report.createdAt,
      completed_at: report.completedAt || null,
      status: report.status,
      requirements: report.requirements,
      design_decisions: report.designDecisions,
      qa_criteria: report.qaCriteria,
      implementation_plan: report.implementationPlan,
      consensus_summary: report.consensusSummary,
      executor: report.executor || null,
      artifacts: report.artifacts ?? [],
      change_requests: report.changeRequests ?? [],
      error_message: report.errorMessage || null,
    }),
    "build_reports upsert"
  );

  // Mark ticket as done if build is completed
  if (report.status === "completed") {
    await db.from("tickets").update({ status: "done", updated_at: now }).eq("id", ticketId);
  }

  return getBuildReport(ticketId);
}

export async function getBuildReport(ticketId: string): Promise<BuildReport | undefined> {
  return latestBuildReport(ticketId);
}

export async function completeBuild(ticketId: string): Promise<Ticket | undefined> {
  const db = getClient();
  const rows = throwOnError(
    await db.from("tickets").select("id, status").eq("id", ticketId).limit(1),
    "tickets select"
  ) as { id: string; status: string }[];
  if (rows.length === 0 || rows[0].status !== "building") return undefined;

  const now = new Date().toISOString();
  await db.from("tickets").update({ status: "done", updated_at: now }).eq("id", ticketId);
  await db
    .from("build_reports")
    .update({ status: "completed", completed_at: now })
    .eq("ticket_id", ticketId);

  return getTicket(ticketId);
}

// ─── Projects ────────────────────────────────────────────────────────────────

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    repoUrl: row.repo_url || null,
    defaultBranch: row.default_branch || "main",
    sandboxProvider: (row.sandbox_provider || "local") as SandboxProvider,
    createPr: !!row.create_pr,
    createdAt: row.created_at,
  };
}

export async function getProjects(): Promise<Project[]> {
  const db = getClient();
  const rows = throwOnError(
    await db.from("projects").select("*").order("created_at", { ascending: true }),
    "projects select"
  ) as ProjectRow[];
  return rows.map(rowToProject);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = getClient();
  const rows = throwOnError(
    await db.from("projects").select("*").eq("id", id).limit(1),
    "projects select"
  ) as ProjectRow[];
  return rows.length > 0 ? rowToProject(rows[0]) : undefined;
}

export async function createProject(
  name: string,
  options: {
    repoUrl?: string | null;
    defaultBranch?: string;
    sandboxProvider?: SandboxProvider;
    createPr?: boolean;
  } = {},
  id?: string
): Promise<Project> {
  const db = getClient();
  const projectId = id || (await nextId("projects", "PRJ"));
  const now = new Date().toISOString();

  throwOnError(
    await db.from("projects").insert({
      id: projectId,
      name,
      repo_url: options.repoUrl || null,
      default_branch: options.defaultBranch || "main",
      sandbox_provider: options.sandboxProvider || "local",
      create_pr: options.createPr ?? false,
      created_at: now,
    }),
    "projects insert"
  );

  return (await getProject(projectId))!;
}

export async function updateProject(
  projectId: string,
  updates: {
    name?: string;
    repoUrl?: string | null;
    defaultBranch?: string;
    sandboxProvider?: SandboxProvider;
    createPr?: boolean;
  }
): Promise<Project | undefined> {
  const db = getClient();
  const patch: Record<string, unknown> = {};

  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.repoUrl !== undefined) patch.repo_url = updates.repoUrl || null;
  if (updates.defaultBranch !== undefined) patch.default_branch = updates.defaultBranch || "main";
  if (updates.sandboxProvider !== undefined) patch.sandbox_provider = updates.sandboxProvider;
  if (updates.createPr !== undefined) patch.create_pr = updates.createPr;

  if (Object.keys(patch).length === 0) return getProject(projectId);

  const result = await db.from("projects").update(patch).eq("id", projectId).select("id");
  if (result.error) throw new Error(`Supabase projects update failed: ${result.error.message}`);
  if (!result.data || result.data.length === 0) return undefined;

  return getProject(projectId);
}

// ─── Sync ────────────────────────────────────────────────────────────────────

export async function seedFromClientData(clientData: {
  tickets: Ticket[];
  nextTicketId: number;
  nextFeedbackId: number;
  nextBuildReportId: number;
}): Promise<{ imported: number }> {
  const db = getClient();
  let imported = 0;

  for (const ticket of clientData.tickets) {
    const existing = throwOnError(
      await db.from("tickets").select("id").eq("id", ticket.id).limit(1),
      "tickets select"
    ) as { id: string }[];
    if (existing.length > 0) continue;

    // Restore the project link only when that project row exists — the
    // tickets.project_id FK would reject a dangling reference otherwise.
    let projectId: string | null = null;
    if (ticket.projectId) {
      const projectRows = throwOnError(
        await db.from("projects").select("id").eq("id", ticket.projectId).limit(1),
        "projects select"
      ) as { id: string }[];
      if (projectRows.length > 0) projectId = ticket.projectId;
    }

    throwOnError(
      await db.from("tickets").insert({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        created_at: ticket.createdAt,
        updated_at: ticket.updatedAt,
        due_date: ticket.dueDate || null,
        tags: ticket.tags ?? [],
        seats: ticket.seats ?? {},
        project_id: projectId,
        branch_override: ticket.branchOverride ?? null,
      }),
      "tickets insert"
    );

    if (ticket.feedback.length > 0) {
      throwOnError(
        await db.from("feedback").upsert(
          ticket.feedback.map((fb) => ({
            id: fb.id,
            ticket_id: ticket.id,
            persona_id: fb.personaId,
            content: fb.content,
            approved: fb.approved,
            source: fb.source ?? "human",
            created_at: fb.createdAt,
          })),
          { ignoreDuplicates: true }
        ),
        "feedback upsert"
      );
    }

    if (ticket.buildReport) {
      const br = ticket.buildReport;
      throwOnError(
        await db.from("build_reports").upsert({
          id: br.id,
          ticket_id: ticket.id,
          created_at: br.createdAt,
          completed_at: br.completedAt || null,
          status: br.status,
          requirements: br.requirements,
          design_decisions: br.designDecisions,
          qa_criteria: br.qaCriteria,
          implementation_plan: br.implementationPlan,
          consensus_summary: br.consensusSummary,
          executor: br.executor || null,
          artifacts: br.artifacts ?? [],
          change_requests: br.changeRequests ?? [],
          error_message: br.errorMessage || null,
        }),
        "build_reports upsert"
      );
    }

    imported++;
  }

  return { imported };
}

export function closeDb(): void {
  // supabase-js clients hold no persistent connection to close
  client = null;
}
