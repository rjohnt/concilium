import { PersonaId } from "./types";
import { PERSONAS } from "./personas";

const STORAGE_KEY = "concilium-templates";

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

/** Get the effective template for a persona — custom override or hardcoded default. */
export function getTemplate(personaId: PersonaId): string {
  const overrides = loadOverrides();
  return overrides[personaId] ?? PERSONAS[personaId]?.promptTemplate ?? "";
}

/** Save a custom template override for a persona. */
export function setTemplate(personaId: PersonaId, template: string): void {
  const overrides = loadOverrides();
  overrides[personaId] = template;
  saveOverrides(overrides);
}

/** Remove the custom override for a persona, reverting to the default. */
export function resetTemplate(personaId: PersonaId): void {
  const overrides = loadOverrides();
  delete overrides[personaId];
  saveOverrides(overrides);
}

/** Returns templates for all personas — custom if set, otherwise defaults. */
export function getAllTemplates(): Record<PersonaId, string> {
  const overrides = loadOverrides();
  const result = {} as Record<PersonaId, string>;
  for (const id of Object.keys(PERSONAS) as PersonaId[]) {
    result[id] = overrides[id] ?? PERSONAS[id].promptTemplate;
  }
  return result;
}

/** Remove all custom template overrides. */
export function resetAll(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
