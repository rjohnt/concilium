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
  0: "bg-red-100 text-red-700 border-red-200",
  1: "bg-orange-100 text-orange-700 border-orange-200",
  2: "bg-yellow-100 text-yellow-700 border-yellow-200",
  3: "bg-gray-100 text-gray-600 border-gray-200",
  4: "bg-gray-50/50 text-gray-400 border-gray-100", // None priority — subtle styling
};

export interface Tag {
  id: string;
  label: string;
  color: string;
}

export const PREDEFINED_TAGS: Tag[] = [
  { id: "bug",         label: "Bug",         color: "bg-red-100 text-red-700 border-red-200" },
  { id: "feature",     label: "Feature",     color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "docs",        label: "Docs",        color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "design",      label: "Design",      color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "performance", label: "Performance", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "security",    label: "Security",    color: "bg-red-50 text-red-600 border-red-200" },
];

export const TAG_COLORS: Record<string, string> = Object.fromEntries(
  PREDEFINED_TAGS.map((t) => [t.id, t.color])
);

export interface Persona {
  id: PersonaId;
  label: string;
  emoji: string;
  color: string; // tailwind bg color class
  textColor: string; // Tailwind text class for labels
  iconColor: string; // Tailwind text class for icons (darker)
  borderColor: string; // Tailwind border class
  ringColor: string; // Tailwind ring class
  glowColor: string; // Tailwind shadow class
  bgGlow: string; // Tailwind bg class for subtle glow
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
  dueDate?: string; // optional ISO date string
  tags: Tag[];
  feedback: FeedbackEntry[];
  // Derived: which personas have approved?
  approvals: PersonaId[];
  buildReport?: BuildReport;
}
