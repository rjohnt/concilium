import { Ticket } from "./types";

export const STORAGE_KEY = "concilium_tickets";
const CURRENT_VERSION = 1;

export interface PersistedState {
  version: number;
  tickets: Ticket[];
  nextTicketId: number;
  nextFeedbackId: number;
  nextBuildReportId: number;
}

export interface StoreState {
  tickets: Ticket[];
  nextTicketId: number;
  nextFeedbackId: number;
  nextBuildReportId: number;
}

export const DEFAULT_STORE_STATE: StoreState = {
  tickets: [],
  nextTicketId: 1,
  nextFeedbackId: 1,
  nextBuildReportId: 1,
};

/**
 * Per-element validation: checks that a ticket has the required fields
 * (id, title, feedback as array) before accepting it.
 */
function isValidTicket(item: unknown): item is Ticket {
  if (!item || typeof item !== "object") return false;
  const t = item as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.title === "string" &&
    Array.isArray(t.feedback)
  );
}

export function saveTickets(
  tickets: Ticket[],
  nextTicketId: number,
  nextFeedbackId: number,
  nextBuildReportId: number
): void {
  if (typeof window === "undefined") return;
  try {
    const state: PersistedState = {
      version: CURRENT_VERSION,
      tickets,
      nextTicketId,
      nextFeedbackId,
      nextBuildReportId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save tickets to localStorage:", e);
  }
}

export function loadTickets(): StoreState {
  if (typeof window === "undefined") {
    return { ...DEFAULT_STORE_STATE };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_STORE_STATE };
    }
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.tickets)) {
      throw new Error("Invalid stored data: tickets is not an array");
    }

    // Per-element validation: filter out malformed tickets
    const validTickets: Ticket[] = parsed.tickets.filter(isValidTicket);

    return {
      tickets: validTickets,
      nextTicketId:
        typeof parsed.nextTicketId === "number" ? parsed.nextTicketId : 1,
      nextFeedbackId:
        typeof parsed.nextFeedbackId === "number" ? parsed.nextFeedbackId : 1,
      nextBuildReportId:
        typeof parsed.nextBuildReportId === "number"
          ? parsed.nextBuildReportId
          : 1,
    };
  } catch (e) {
    console.error("Failed to load tickets from localStorage:", e);
    return { ...DEFAULT_STORE_STATE };
  }
}

export function clearStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear localStorage:", e);
  }
}
