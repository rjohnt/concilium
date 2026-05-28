import { Persona, PersonaId } from "./types";

export const PERSONAS: Record<PersonaId, Persona> = {
  engineer: {
    id: "engineer",
    label: "Engineer",
    emoji: "⚙️",
    color: "bg-blue-100",
    textColor: "text-blue-700",
    iconColor: "text-blue-600",
    borderColor: "border-blue-300",
    ringColor: "ring-blue-400",
    glowColor: "shadow-blue-300/30",
    bgGlow: "bg-blue-50",
    expertise:
      "Technical feasibility, architecture, implementation approach, and code quality.",
    promptTemplate: `You are weighing in as the Engineer on this feature ticket.

Consider:
- Is this technically feasible given our stack?
- What architecture approach would you recommend?
- Are there hidden complexity or scope concerns?
- What dependencies or prerequisites exist?

Provide your assessment:`,
  },
  designer: {
    id: "designer",
    label: "Designer",
    emoji: "🎨",
    color: "bg-purple-100",
    textColor: "text-purple-700",
    iconColor: "text-purple-600",
    borderColor: "border-purple-300",
    ringColor: "ring-purple-400",
    glowColor: "shadow-purple-300/30",
    bgGlow: "bg-purple-50",
    expertise:
      "User experience, visual design, interaction patterns, and accessibility.",
    promptTemplate: `You are weighing in as the Designer on this feature ticket.

Consider:
- How should the user flow work?
- What interaction patterns make sense?
- Are there accessibility concerns to address?
- Does this fit with our design system?

Provide your assessment:`,
  },
  "product-owner": {
    id: "product-owner",
    label: "Product Owner",
    emoji: "📋",
    color: "bg-emerald-100",
    textColor: "text-emerald-700",
    iconColor: "text-emerald-600",
    borderColor: "border-emerald-300",
    ringColor: "ring-emerald-400",
    glowColor: "shadow-emerald-300/30",
    bgGlow: "bg-emerald-50",
    expertise:
      "Business value, priority, scope definition, and stakeholder alignment.",
    promptTemplate: `You are weighing in as the Product Owner on this feature ticket.

Consider:
- What is the business value and user impact?
- Is the scope appropriately defined?
- What is the priority relative to other work?
- Are there stakeholders we should consult?

Provide your assessment:`,
  },
  qa: {
    id: "qa",
    label: "QA",
    emoji: "🧪",
    color: "bg-amber-100",
    textColor: "text-amber-700",
    iconColor: "text-amber-600",
    borderColor: "border-amber-300",
    ringColor: "ring-amber-400",
    glowColor: "shadow-amber-300/30",
    bgGlow: "bg-amber-50",
    expertise:
      "Edge cases, test scenarios, acceptance criteria, and quality gates.",
    promptTemplate: `You are weighing in as QA on this feature ticket.

Consider:
- What edge cases should we test?
- What are the acceptance criteria?
- Are there regression risks to consider?
- What test scenarios cover the critical paths?

Provide your assessment:`,
  },
};

export function getPersona(id: PersonaId): Persona {
  return PERSONAS[id];
}

export function getAllPersonas(): Persona[] {
  return Object.values(PERSONAS);
}
