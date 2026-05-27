// === Core Types for Concilium ===

export type PersonaId = "engineer" | "designer" | "product-owner" | "qa";

export type TicketStatus = "draft" | "in-review" | "consensus" | "building" | "done";

// Priority uses Linear's 0-4 scale
// 0 = Urgent, 1 = High, 2 = Medium, 3 = Low, 4 = None
export type PriorityLevel = 0 | 1 | 2 | 3 | 4;

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  0: "Urgent",
  1: "High",
  2: "Medium",
  3: "Low",
  4: "None",
};

export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  0: "bg-red-900/50 text-red-400 border-red-800",
  1: "bg-orange-900/50 text-orange-400 border-orange-800",
  2: "bg-yellow-900/50 text-yellow-400 border-yellow-800",
  3: "bg-gray-800 text-gray-400 border-gray-700",
  4: "hidden", // None priority — badge is hidden
};

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

export interface BuildReport {
  id: string;
  ticketId: string;
  createdAt: string;
  completedAt?: string;
  status: "building" | "completed" | "failed";
  requirements: string[];
  designDecisions: string[];
  qaCriteria: string[];
  implementationPlan: string;
  consensusSummary: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: PriorityLevel;
  createdAt: string;
  updatedAt: string;
  feedback: FeedbackEntry[];
  // Derived: which personas have approved?
  approvals: PersonaId[];
  buildReport?: BuildReport;
}
