import { PersonaId } from "./types";

const STORAGE_KEY = "concilium-prompt-templates";

// Default templates — kept in sync with hardcoded values in personas.ts
export const DEFAULT_TEMPLATES: Record<PersonaId, string> = {
  engineer: `You are weighing in as the Engineer on this feature ticket.

Consider:
- Is this technically feasible given our stack?
- What architecture approach would you recommend?
- Are there hidden complexity or scope concerns?
- What dependencies or prerequisites exist?

Provide your assessment:`,
  designer: `You are weighing in as the Designer on this feature ticket.

Consider:
- How should the user flow work?
- What interaction patterns make sense?
- Are there accessibility concerns to address?
- Does this fit with our design system?

Provide your assessment:`,
  "product-owner": `You are weighing in as the Product Owner on this feature ticket.

Consider:
- What is the business value and user impact?
- Is the scope appropriately defined?
- What is the priority relative to other work?
- Are there stakeholders we should consult?

Provide your assessment:`,
  qa: `You are weighing in as QA on this feature ticket.

Consider:
- What edge cases should we test?
- What are the acceptance criteria?
- Are there regression risks to consider?
- What test scenarios cover the critical paths?

Provide your assessment:`,
};

type TemplateStore = Partial<Record<PersonaId, string>>;

function loadOverrides(): TemplateStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as TemplateStore;
  } catch {
    return {};
  }
}

function saveOverrides(store: TemplateStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/**
 * Returns the template for a persona — customized if set, otherwise the default.
 */
export function getTemplate(personaId: PersonaId): string {
  const overrides = loadOverrides();
  return overrides[personaId] ?? DEFAULT_TEMPLATES[personaId];
}

/**
 * Saves a custom template override for a persona.
 */
export function updateTemplate(personaId: PersonaId, text: string): void {
  const overrides = loadOverrides();
  overrides[personaId] = text;
  saveOverrides(overrides);
}

/**
 * Removes the custom override for a persona, reverting to the default.
 */
export function resetToDefault(personaId: PersonaId): void {
  const overrides = loadOverrides();
  delete overrides[personaId];
  saveOverrides(overrides);
}

/**
 * Returns templates for all personas with a flag indicating if each is customized.
 */
export function getAllTemplates(): Record<
  PersonaId,
  { text: string; isCustomized: boolean }
> {
  const overrides = loadOverrides();
  const result = {} as Record<
    PersonaId,
    { text: string; isCustomized: boolean }
  >;
  for (const id of Object.keys(DEFAULT_TEMPLATES) as PersonaId[]) {
    result[id] = {
      text: overrides[id] ?? DEFAULT_TEMPLATES[id],
      isCustomized: id in overrides,
    };
  }
  return result;
}

/**
 * Removes all custom template overrides.
 */
export function resetAll(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
