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
  4: "bg-gray-900/30 text-gray-600 border-gray-800", // None priority — subtle styling
};

export interface Tag {
  id: string;
  label: string;
  color: string;
}

export const PREDEFINED_TAGS: Tag[] = [
  { id: "bug",         label: "Bug",         color: "bg-cardinal/20 text-cardinal border-cardinal/40" },
  { id: "feature",     label: "Feature",     color: "bg-gold/20 text-gold-light border-gold/40" },
  { id: "docs",        label: "Docs",        color: "bg-blue-steel/20 text-blue-steel border-blue-steel/40" },
  { id: "design",      label: "Design",      color: "bg-purple-900/50 text-purple-400 border-purple-700" },
  { id: "performance", label: "Performance", color: "bg-orange-900/50 text-orange-400 border-orange-800" },
  { id: "security",    label: "Security",    color: "bg-red-950/60 text-red-400 border-red-900" },
];

export const TAG_COLORS: Record<string, string> = Object.fromEntries(
  PREDEFINED_TAGS.map((t) => [t.id, t.color])
);

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

export interface RateLimitConfig {
  /** Sliding window duration in milliseconds */
  windowMs: number;
  /** Maximum requests allowed within the window */
  maxRequests: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in the current window (0 if blocked) */
  remaining: number;
  /** Unix timestamp in seconds when the window resets */
  reset: number;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: PriorityLevel;
  createdAt: string;
  updatedAt: string;
  dueDate?: string; // optional ISO date string
  tags: Tag[];
  feedback: FeedbackEntry[];
  // Derived: which personas have approved?
  approvals: PersonaId[];
  buildReport?: BuildReport;
}
