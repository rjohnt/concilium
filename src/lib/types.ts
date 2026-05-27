// === Core Types for Concilium ===

export type PersonaId = "engineer" | "designer" | "product-owner" | "qa";

export type TicketStatus = "draft" | "in-review" | "consensus" | "building" | "done";

export interface Persona {
  id: PersonaId;
  label: string;
  emoji: string;
  color: string; // tailwind bg color class
  expertise: string;
  promptTemplate: string; // used for AI-mediated sessions
}

export interface FeedbackEntry {
  id: string;
  ticketId: string;
  personaId: PersonaId;
  content: string;
  createdAt: string; // ISO string
  approved: boolean; // has this persona approved the current state?
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  feedback: FeedbackEntry[];
  // Derived: which personas have approved?
  approvals: PersonaId[];
}
