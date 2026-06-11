/**
 * seats.ts — Seat occupancy model: humans + AI stand-ins.
 *
 * Every ticket has one seat per persona. A seat is held by an AI stand-in
 * by default; a human can claim it (taking over from the AI) and release it
 * back. Pure helpers live here; mutation happens in store.ts / server-db.ts.
 */

import { PersonaId, Seat, SeatMap, Ticket } from "./types";
import { getAllPersonas } from "./personas";

const PREFERRED_ROLE_KEY = "concilium-preferred-role";

// ── Normalization ───────────────────────────────────────────────────────────

export function defaultSeat(personaId: PersonaId): Seat {
  return { personaId, occupant: "ai" };
}

/**
 * Fill in missing seats so every persona has one. Legacy tickets persisted
 * before the seat model have no `seats` field — all their seats default to
 * AI stand-ins.
 */
export function normalizeSeats(seats?: SeatMap): Record<PersonaId, Seat> {
  const normalized = {} as Record<PersonaId, Seat>;
  for (const persona of getAllPersonas()) {
    normalized[persona.id] = seats?.[persona.id] ?? defaultSeat(persona.id);
  }
  return normalized;
}

export function getSeat(ticket: Ticket, personaId: PersonaId): Seat {
  return ticket.seats?.[personaId] ?? defaultSeat(personaId);
}

/** Personas whose seat is currently held by an AI stand-in. */
export function getAiHeldPersonas(ticket: Ticket): PersonaId[] {
  return getAllPersonas()
    .map((p) => p.id)
    .filter((id) => getSeat(ticket, id).occupant === "ai");
}

/** Is this seat held by a human other than the given client? */
export function isSeatHeldByOtherHuman(
  ticket: Ticket,
  personaId: PersonaId,
  clientId: string
): boolean {
  const seat = getSeat(ticket, personaId);
  return seat.occupant === "human" && seat.claimedBy !== clientId;
}

// ── Occupancy summary (dashboard) ───────────────────────────────────────────

export interface SeatOccupancySummary {
  /** Tickets considered (active = not done). */
  ticketCount: number;
  totalSeats: number;
  humanSeats: number;
  aiSeats: number;
  perPersona: Record<PersonaId, { human: number; ai: number }>;
}

/**
 * Aggregate seat occupancy across active (non-done) tickets — powers the
 * persistent "humans vs AI stand-ins" element on the dashboard.
 */
export function summarizeSeatOccupancy(tickets: Ticket[]): SeatOccupancySummary {
  const personas = getAllPersonas();
  const perPersona = {} as Record<PersonaId, { human: number; ai: number }>;
  for (const p of personas) {
    perPersona[p.id] = { human: 0, ai: 0 };
  }

  const active = tickets.filter((t) => t.status !== "done");
  let humanSeats = 0;

  for (const ticket of active) {
    for (const p of personas) {
      const seat = getSeat(ticket, p.id);
      if (seat.occupant === "human") {
        perPersona[p.id].human++;
        humanSeats++;
      } else {
        perPersona[p.id].ai++;
      }
    }
  }

  const totalSeats = active.length * personas.length;
  return {
    ticketCount: active.length,
    totalSeats,
    humanSeats,
    aiSeats: totalSeats - humanSeats,
    perPersona,
  };
}

// ── Preferred role (sticky role choice across sessions) ─────────────────────

export function getPreferredRole(): PersonaId | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(PREFERRED_ROLE_KEY);
  const valid = getAllPersonas().some((p) => p.id === value);
  return valid ? (value as PersonaId) : null;
}

export function setPreferredRole(personaId: PersonaId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFERRED_ROLE_KEY, personaId);
}
