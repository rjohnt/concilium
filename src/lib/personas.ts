import { Persona, PersonaId } from "./types";
import { getTemplate } from "./templateStore";

export const PERSONAS: Record<PersonaId, Persona> = {
  engineer: {
    id: "engineer",
    label: "Engineer",
    emoji: "⚙️",
    color: "bg-[#7ec8e3]",
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
    color: "bg-[#c5a3cf]",
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
    color: "bg-[#a3d9a5]",
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
    color: "bg-[#f5cba7]",
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
  const persona = PERSONAS[id];
  return {
    ...persona,
    promptTemplate: getTemplate(id),
  };
}

export function getAllPersonas(): Persona[] {
  return Object.values(PERSONAS);
}
