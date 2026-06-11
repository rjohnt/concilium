/**
 * council.ts — Council status model for the CouncilTable / consensus strip.
 *
 * Derives, from a ticket's existing data, where each persona seat stands:
 * who holds the seat (human vs AI stand-in) and their stance on the current
 * ticket state. Stances come straight from `approvals` + `feedback`:
 *   - approved  → persona is in ticket.approvals
 *   - concerns  → persona left feedback but hasn't approved (a blocker)
 *   - awaiting  → persona hasn't weighed in yet
 *
 * Pure helpers only; the components below render these.
 */

import { PersonaId, Ticket } from "./types";
import { getAllPersonas, getPersona } from "./personas";
import { getSeat } from "./seats";
import { checkConsensusThreshold } from "./consensus-threshold";

export type SeatStance = "approved" | "concerns" | "awaiting";

export interface SeatStatus {
  personaId: PersonaId;
  label: string;
  stance: SeatStance;
  occupant: "human" | "ai";
  /** "AI stand-in" or the human occupant's display name. */
  occupantLabel: string;
  /** Latest thing this seat said, if anything. */
  note?: string;
}

export interface CouncilStatus {
  seats: SeatStatus[];
  approved: number;
  total: number;
  reached: boolean;
  hasConcerns: boolean;
}

export function getSeatStance(ticket: Ticket, personaId: PersonaId): SeatStance {
  if (ticket.approvals.includes(personaId)) return "approved";
  const entries = ticket.feedback.filter((f) => f.personaId === personaId);
  if (entries.some((f) => !f.approved)) return "concerns";
  return "awaiting";
}

export function getSeatStatus(ticket: Ticket, personaId: PersonaId): SeatStatus {
  const persona = getPersona(personaId);
  const seat = getSeat(ticket, personaId);
  const entries = ticket.feedback.filter((f) => f.personaId === personaId);
  const latest = entries[entries.length - 1];
  return {
    personaId,
    label: persona?.label ?? personaId,
    stance: getSeatStance(ticket, personaId),
    occupant: seat.occupant,
    occupantLabel:
      seat.occupant === "human" ? seat.claimedByLabel ?? "you" : "AI stand-in",
    note: latest?.content,
  };
}

export function getCouncilStatus(ticket: Ticket): CouncilStatus {
  const seats = getAllPersonas().map((p) => getSeatStatus(ticket, p.id));
  const { reached } = checkConsensusThreshold(ticket);
  return {
    seats,
    approved: seats.filter((s) => s.stance === "approved").length,
    total: seats.length,
    reached,
    hasConcerns: seats.some((s) => s.stance === "concerns"),
  };
}

/**
 * Persona identity colors — the seat's permanent brand hue (CSS-var refs) plus
 * a darker shade for text sitting on the tint. Identity, never status.
 */
export const PERSONA_COUNCIL: Record<
  PersonaId,
  { colorVar: string; tintVar: string; textOnTint: string }
> = {
  engineer: {
    colorVar: "var(--persona-eng-500)",
    tintVar: "var(--persona-eng-100)",
    textOnTint: "#0F6E56",
  },
  designer: {
    colorVar: "var(--persona-des-500)",
    tintVar: "var(--persona-des-100)",
    textOnTint: "#3C3489",
  },
  "product-owner": {
    colorVar: "var(--persona-prod-500)",
    tintVar: "var(--persona-prod-100)",
    textOnTint: "#854F0B",
  },
  qa: {
    colorVar: "var(--persona-res-500)",
    tintVar: "var(--persona-res-100)",
    textOnTint: "#185FA5",
  },
};

/**
 * Stance status theme — semantic (success/warning/neutral), shared across all
 * seats. This is the second color channel: persona = who, stance = decision.
 */
export const STANCE_THEME: Record<
  SeatStance,
  { label: string; ring: string; tint: string; text: string }
> = {
  approved: {
    label: "approved",
    ring: "var(--success-500)",
    tint: "var(--success-100)",
    text: "#1B6B4A",
  },
  concerns: {
    label: "has concerns",
    ring: "var(--warning-500)",
    tint: "var(--warning-100)",
    text: "#8A5A12",
  },
  awaiting: {
    label: "awaiting",
    ring: "var(--warm-300)",
    tint: "#ffffff",
    text: "var(--ink-500)",
  },
};
