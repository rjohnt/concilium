// === Core Types for Concilium ===

export type PersonaId = "engineer" | "designer" | "product-owner" | "qa";

export type TicketStatus = "draft" | "in-review" | "consensus" | "building" | "done";

export type BuildPhase = "queued" | "analyzing" | "scaffolding" | "implementing" | "testing" | "deploying" | "complete" | "failed";

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
  source: "human" | "ai"; // who generated this feedback?
}

export interface SessionEvent {
  id: string;
  ticketId: string;
  type: "feedback" | "consensus" | "build_start" | "build_phase" | "build_complete" | "persona_joined";
  personaId?: PersonaId;
  message: string;
  timestamp: string; // ISO string
  metadata?: Record<string, string>;
}

export interface BuildState {
  phase: BuildPhase;
  startedAt: string;
  completedAt?: string;
  log: string[];
}

export interface AIPromptResponse {
  personaId: PersonaId;
  feedback: string;
  recommendedApproval: boolean;
  reasoning: string;
  confidence: number;
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
  // Session & build state
  sessionEvents: SessionEvent[];
  buildState: BuildState | null;
}
