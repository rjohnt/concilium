import { Ticket } from "./types";

const STORAGE_KEY = "concilium_tickets";

export interface StoreState {
  tickets: Ticket[];
  nextTicketId: number;
  nextFeedbackId: number;
  nextBuildReportId: number;
}

export function saveTickets(
  tickets: Ticket[],
  nextTicketId: number,
  nextFeedbackId: number,
  nextBuildReportId: number
): void {
  if (typeof window === "undefined") return;
  try {
    const state: StoreState = {
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
    return {
      tickets: [],
      nextTicketId: 1,
      nextFeedbackId: 1,
      nextBuildReportId: 1,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        tickets: [],
        nextTicketId: 1,
        nextFeedbackId: 1,
        nextBuildReportId: 1,
      };
    }
    const parsed: StoreState = JSON.parse(raw);
    if (!Array.isArray(parsed.tickets)) {
      throw new Error("Invalid stored data: tickets is not an array");
    }
    return {
      tickets: parsed.tickets,
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
    return {
      tickets: [],
      nextTicketId: 1,
      nextFeedbackId: 1,
      nextBuildReportId: 1,
    };
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
