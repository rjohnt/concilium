/**
 * api-client.ts — Client-side API wrapper for communicating with server routes.
 *
 * The store.ts module uses this to sync localStorage changes to the server DB.
 * Falls back gracefully if the server is unreachable (offline/reset).
 */

import { Ticket, FeedbackEntry, FeedbackSource, PersonaId, PriorityLevel, SeatMap, Tag, TicketStatus } from "./types";

const API_BASE = "/api";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!response.ok) {
      console.warn(`API ${options?.method || "GET"} ${url} returned ${response.status}`);
      return null;
    }
    return await response.json() as T;
  } catch (err) {
    console.warn(`API ${options?.method || "GET"} ${url} failed:`, err);
    return null;
  }
}

// ─── Tickets ────────────────────────────────────────────────────────────────

export async function fetchAllTickets(): Promise<Ticket[]> {
  const data = await fetchJson<{ tickets: Ticket[] }>(`${API_BASE}/tickets`);
  return data?.tickets ?? [];
}

export async function fetchTicket(id: string): Promise<Ticket | null> {
  const data = await fetchJson<{ ticket: Ticket }>(`${API_BASE}/tickets?id=${encodeURIComponent(id)}`);
  return data?.ticket ?? null;
}

export async function createTicketOnServer(
  title: string,
  description: string,
  priority: PriorityLevel = 2,
  dueDate?: string,
  tags?: Tag[],
  id?: string,
): Promise<Ticket | null> {
  const data = await fetchJson<{ ticket: Ticket }>(`${API_BASE}/tickets`, {
    method: "POST",
    // Pass the client-assigned id so client and server agree on it — keeps
    // optimistic local tickets reconcilable with authoritative server pulls.
    body: JSON.stringify({ id, title, description, priority, dueDate, tags }),
  });
  return data?.ticket ?? null;
}

export async function updateTicketOnServer(
  id: string,
  updates: { title?: string; description?: string; dueDate?: string | null; priority?: PriorityLevel; status?: TicketStatus; tags?: Tag[]; seats?: SeatMap; projectId?: string | null; branchOverride?: string | null },
): Promise<Ticket | null> {
  const data = await fetchJson<{ ticket: Ticket }>(`${API_BASE}/tickets?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return data?.ticket ?? null;
}

export async function deleteTicketOnServer(id: string): Promise<boolean> {
  const data = await fetchJson<{ success: boolean }>(`${API_BASE}/tickets?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return data?.success ?? false;
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export async function addFeedbackOnServer(
  ticketId: string,
  personaId: PersonaId,
  content: string,
  approved: boolean,
  source: FeedbackSource = "human",
): Promise<{ feedback: FeedbackEntry; ticket: { id: string; status: string; approvals: string[]; feedback: FeedbackEntry[] } | null } | null> {
  const data = await fetchJson<any>(`${API_BASE}/feedback`, {
    method: "POST",
    body: JSON.stringify({ ticketId, personaId, content, approved, source }),
  });
  return data ?? null;
}

export async function fetchFeedback(ticketId: string): Promise<FeedbackEntry[]> {
  const data = await fetchJson<{ feedback: FeedbackEntry[] }>(`${API_BASE}/feedback?ticketId=${encodeURIComponent(ticketId)}`);
  return data?.feedback ?? [];
}

// ─── Sync ────────────────────────────────────────────────────────────────────

export async function syncPullAll(): Promise<Ticket[]> {
  const data = await fetchJson<{ tickets: Ticket[] }>(`${API_BASE}/sync`);
  return data?.tickets ?? [];
}

export async function syncPushAll(
  tickets: Ticket[],
  nextTicketId: number,
  nextFeedbackId: number,
  nextBuildReportId: number,
): Promise<{ imported: number; total: number } | null> {
  return fetchJson<{ imported: number; total: number }>(`${API_BASE}/sync`, {
    method: "POST",
    body: JSON.stringify({ tickets, nextTicketId, nextFeedbackId, nextBuildReportId }),
  });
}
