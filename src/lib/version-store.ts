import { PersonaId } from "./types";

// Version snapshot of persona prompt/feedback text at a point in time
export interface PromptVersion {
  id: string; // FB-XXX format
  ticketId: string;
  personaId: PersonaId;
  text: string;
  createdAt: string; // ISO string
  versionNumber: number;
}

const VERSIONS_KEY = "concilium-versions";
const TICKETS_KEY = "concilium_tickets";

// --- Helpers ---

function loadVersions(): PromptVersion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VERSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveVersions(versions: PromptVersion[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions));
  } catch (e) {
    console.error("Failed to save versions to localStorage:", e);
  }
}

/**
 * Read the nextFeedbackId from the main ticket store's localStorage so
 * our version IDs use the same counter namespace (FB-XXX).
 */
function getNextFeedbackId(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = localStorage.getItem(TICKETS_KEY);
    if (!raw) return 1;
    const parsed = JSON.parse(raw);
    return typeof parsed.nextFeedbackId === "number" ? parsed.nextFeedbackId : 1;
  } catch {
    return 1;
  }
}

function generateVersionId(counter: number): string {
  return `FB-${String(counter).padStart(3, "0")}`;
}

function getNextVersionNumber(ticketId: string, existing: PromptVersion[]): number {
  const ticketVersions = existing.filter((v) => v.ticketId === ticketId);
  if (ticketVersions.length === 0) return 1;
  return Math.max(...ticketVersions.map((v) => v.versionNumber)) + 1;
}

// --- In-memory cache ---

let versionsCache: PromptVersion[] | null = null;

function getCachedVersions(): PromptVersion[] {
  if (versionsCache === null) {
    versionsCache = loadVersions();
  }
  return versionsCache;
}

function persistAndCache(versions: PromptVersion[]): void {
  versionsCache = versions;
  saveVersions(versions);
}

/**
 * Invalidate the in-memory cache so the next read re-loads from localStorage.
 * Call this after the main ticket store has written new feedback IDs.
 */
export function invalidateVersionCache(): void {
  versionsCache = null;
}

// --- Public API ---

/**
 * Create a new version snapshot for a ticket's prompt/feedback text.
 * Returns the created version or null if ticketId or personaId is missing.
 */
export function addVersion(
  ticketId: string,
  personaId: PersonaId,
  text: string
): PromptVersion {
  const versions = getCachedVersions();
  const nextId = getNextFeedbackId();

  const version: PromptVersion = {
    id: generateVersionId(nextId),
    ticketId,
    personaId,
    text,
    createdAt: new Date().toISOString(),
    versionNumber: getNextVersionNumber(ticketId, versions),
  };

  persistAndCache([...versions, version]);
  return version;
}

/**
 * Get all versions for a ticket, most recent first.
 */
export function getVersions(ticketId: string): PromptVersion[] {
  const versions = getCachedVersions();
  return versions
    .filter((v) => v.ticketId === ticketId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

/**
 * Get a single version by its ID.
 */
export function getVersion(id: string): PromptVersion | undefined {
  const versions = getCachedVersions();
  return versions.find((v) => v.id === id);
}

/**
 * Return a version's data so the caller can restore its text.
 * Does NOT mutate state — the caller is responsible for applying
 * the restored text as a new feedback entry or update.
 */
export function restoreVersion(
  ticketId: string,
  versionId: string
): PromptVersion | null {
  const version = getVersion(versionId);
  if (!version || version.ticketId !== ticketId) return null;
  return version;
}

/**
 * Clear all versions from memory and localStorage.
 */
export function clearVersions(): void {
  versionsCache = [];
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(VERSIONS_KEY);
    } catch {
      // ignore
    }
  }
}
