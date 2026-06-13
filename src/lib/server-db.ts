/**
 * server-db.ts — Server-side data layer facade.
 *
 * The server's source of truth is Supabase Postgres when configured
 * (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY); otherwise it falls
 * back to local SQLite (data/concilium.db) so dev environments and CI work
 * with zero setup.
 *
 * Every function is async regardless of backend — callers must await.
 * API routes use this module; it must never be imported from client code.
 */

import {
  Ticket,
  FeedbackEntry,
  FeedbackSource,
  BuildReport,
  PersonaId,
  TicketStatus,
  PriorityLevel,
  Tag,
  SeatMap,
  Project,
  SandboxProvider,
} from "./types";
import * as sqliteDb from "./db/sqlite-db";
import * as supabaseDb from "./db/supabase-db";

export function isPostgresBacked(): boolean {
  return supabaseDb.isSupabaseDbConfigured();
}

type TicketUpdates = {
  title?: string;
  description?: string;
  dueDate?: string | null;
  priority?: PriorityLevel;
  status?: TicketStatus;
  tags?: Tag[];
  seats?: SeatMap;
  projectId?: string | null;
  branchOverride?: string | null;
};

export type ProjectUpdates = {
  name?: string;
  repoUrl?: string | null;
  defaultBranch?: string;
  sandboxProvider?: SandboxProvider;
  createPr?: boolean;
};

export async function getTickets(): Promise<Ticket[]> {
  return isPostgresBacked() ? supabaseDb.getTickets() : sqliteDb.getTickets();
}

export async function getTicket(id: string): Promise<Ticket | undefined> {
  return isPostgresBacked() ? supabaseDb.getTicket(id) : sqliteDb.getTicket(id);
}

export async function createTicket(
  title: string,
  description: string,
  priority: PriorityLevel = 2,
  dueDate?: string,
  tags: Tag[] = [],
  id?: string
): Promise<Ticket> {
  return isPostgresBacked()
    ? supabaseDb.createTicket(title, description, priority, dueDate, tags, id)
    : sqliteDb.createTicket(title, description, priority, dueDate, tags, id);
}

export async function deleteTicket(id: string): Promise<boolean> {
  return isPostgresBacked() ? supabaseDb.deleteTicket(id) : sqliteDb.deleteTicket(id);
}

export async function updateTicket(
  ticketId: string,
  updates: TicketUpdates
): Promise<Ticket | undefined> {
  return isPostgresBacked()
    ? supabaseDb.updateTicket(ticketId, updates)
    : sqliteDb.updateTicket(ticketId, updates);
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus
): Promise<Ticket | undefined> {
  return isPostgresBacked()
    ? supabaseDb.updateTicketStatus(ticketId, status)
    : sqliteDb.updateTicketStatus(ticketId, status);
}

export async function getProjects(): Promise<Project[]> {
  return isPostgresBacked() ? supabaseDb.getProjects() : sqliteDb.getProjects();
}

export async function getProject(id: string): Promise<Project | undefined> {
  return isPostgresBacked() ? supabaseDb.getProject(id) : sqliteDb.getProject(id);
}

export async function createProject(
  name: string,
  options: ProjectUpdates = {},
  id?: string
): Promise<Project> {
  return isPostgresBacked()
    ? supabaseDb.createProject(name, options, id)
    : sqliteDb.createProject(name, options, id);
}

export async function updateProject(
  projectId: string,
  updates: ProjectUpdates
): Promise<Project | undefined> {
  return isPostgresBacked()
    ? supabaseDb.updateProject(projectId, updates)
    : sqliteDb.updateProject(projectId, updates);
}

export async function addFeedback(
  ticketId: string,
  personaId: PersonaId,
  content: string,
  approved: boolean,
  source: FeedbackSource = "human"
): Promise<FeedbackEntry | null> {
  return isPostgresBacked()
    ? supabaseDb.addFeedback(ticketId, personaId, content, approved, source)
    : sqliteDb.addFeedback(ticketId, personaId, content, approved, source);
}

export async function getFeedbackHistory(ticketId: string): Promise<FeedbackEntry[]> {
  return isPostgresBacked()
    ? supabaseDb.getFeedbackHistory(ticketId)
    : sqliteDb.getFeedbackHistory(ticketId);
}

export async function setBuildReport(
  ticketId: string,
  report: BuildReport
): Promise<BuildReport | undefined> {
  return isPostgresBacked()
    ? supabaseDb.setBuildReport(ticketId, report)
    : sqliteDb.setBuildReport(ticketId, report);
}

export async function getBuildReport(ticketId: string): Promise<BuildReport | undefined> {
  return isPostgresBacked()
    ? supabaseDb.getBuildReport(ticketId)
    : sqliteDb.getBuildReport(ticketId);
}

export async function completeBuild(ticketId: string): Promise<Ticket | undefined> {
  return isPostgresBacked() ? supabaseDb.completeBuild(ticketId) : sqliteDb.completeBuild(ticketId);
}

export async function seedFromClientData(clientData: {
  tickets: Ticket[];
  nextTicketId: number;
  nextFeedbackId: number;
  nextBuildReportId: number;
}): Promise<{ imported: number }> {
  return isPostgresBacked()
    ? supabaseDb.seedFromClientData(clientData)
    : sqliteDb.seedFromClientData(clientData);
}

export function closeDb(): void {
  if (isPostgresBacked()) {
    supabaseDb.closeDb();
  } else {
    sqliteDb.closeDb();
  }
}
