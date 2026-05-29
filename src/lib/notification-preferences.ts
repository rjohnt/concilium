/**
 * notification-preferences.ts — Granular control over notification delivery.
 *
 * Users can mute notifications by:
 *   - Notification type (feedback-submitted, consensus-reached, build-completed, etc.)
 *   - Persona (don't notify when Engineer submits feedback)
 *
 * Stored in localStorage, synced across tabs via BroadcastChannel.
 */

import { NotificationType } from "./notifications";
import { PersonaId } from "./types";
import { getAllPersonas } from "./personas";

const PREFS_STORAGE_KEY = "concilium-notification-prefs";
const PREFS_CHANNEL = "concilium-notification-prefs";

// ── Types ───────────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  /** Per-type mute — true means muted/suppressed */
  mutedTypes: Partial<Record<NotificationType, boolean>>;
  /** Per-persona mute — true means muted/suppressed */
  mutedPersonas: Partial<Record<PersonaId, boolean>>;
  /** Master toggle — false disables all notifications */
  enabled: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  mutedTypes: {},
  mutedPersonas: {},
  enabled: true,
};

// ── In-memory store ─────────────────────────────────────────────────────────

let cachedPrefs: NotificationPreferences | null = null;
type PrefsListener = (prefs: NotificationPreferences) => void;
const listeners = new Set<PrefsListener>();

// ── Broadcast Channel for cross-tab sync ────────────────────────────────────

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!channel) {
    try {
      channel = new BroadcastChannel(PREFS_CHANNEL);
      channel.addEventListener("message", (event: MessageEvent<{ type: string; prefs: NotificationPreferences }>) => {
        if (event.data?.type === "prefs-changed") {
          cachedPrefs = event.data.prefs;
          persistToStorage(cachedPrefs);
          notifyListeners();
        }
      });
    } catch {
      return null;
    }
  }
  return channel;
}

// ── Storage ─────────────────────────────────────────────────────────────────

function loadFromStorage(): NotificationPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      mutedTypes: parsed.mutedTypes || {},
      mutedPersonas: parsed.mutedPersonas || {},
      enabled: parsed.enabled !== false,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function persistToStorage(prefs: NotificationPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage full — silently fail
  }
}

function notifyListeners(): void {
  const snapshot = getPrefs();
  for (const fn of listeners) {
    try {
      fn(snapshot);
    } catch {
      // noop
    }
  }
}

// Initialize cache
cachedPrefs = loadFromStorage();

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the current notification preferences.
 */
export function getPrefs(): NotificationPreferences {
  if (cachedPrefs === null) {
    cachedPrefs = loadFromStorage();
  }
  return { ...cachedPrefs };
}

/**
 * Update notification preferences. Merges with existing preferences.
 * Persists to localStorage and broadcasts to other tabs.
 */
export function setPrefs(update: Partial<NotificationPreferences>): NotificationPreferences {
  const current = getPrefs();
  const merged: NotificationPreferences = {
    ...current,
    ...update,
    mutedTypes: { ...current.mutedTypes, ...(update.mutedTypes || {}) },
    mutedPersonas: { ...current.mutedPersonas, ...(update.mutedPersonas || {}) },
  };
  cachedPrefs = merged;
  persistToStorage(merged);

  // Broadcast to other tabs
  const ch = getChannel();
  if (ch) {
    try {
      ch.postMessage({ type: "prefs-changed", prefs: merged });
    } catch {
      // noop
    }
  }

  notifyListeners();
  return { ...merged };
}

/**
 * Toggle a notification type on/off. Returns updated preferences.
 */
export function toggleMutedType(type: NotificationType): NotificationPreferences {
  const current = getPrefs();
  const isCurrentlyMuted = current.mutedTypes[type] === true;
  return setPrefs({
    mutedTypes: { [type]: !isCurrentlyMuted },
  });
}

/**
 * Toggle a persona's notifications on/off. Returns updated preferences.
 */
export function toggleMutedPersona(personaId: PersonaId): NotificationPreferences {
  const current = getPrefs();
  const isCurrentlyMuted = current.mutedPersonas[personaId] === true;
  return setPrefs({
    mutedPersonas: { [personaId]: !isCurrentlyMuted },
  });
}

/**
 * Set master enabled state.
 */
export function setNotificationsEnabled(enabled: boolean): NotificationPreferences {
  return setPrefs({ enabled });
}

/**
 * Check whether a notification of the given type and persona should be shown.
 * This is the primary gate — all notification creation should call this first.
 */
export function isNotificationAllowed(
  type: NotificationType,
  personaId?: string,
): boolean {
  const prefs = getPrefs();

  // Master toggle
  if (!prefs.enabled) return false;

  // Type mute check
  if (prefs.mutedTypes[type] === true) return false;

  // Persona mute check — match both by ID and label
  if (personaId) {
    if (prefs.mutedPersonas[personaId as PersonaId] === true) return false;
    // Also check if it matches any persona label
    const allPersonas = getAllPersonas();
    for (const p of allPersonas) {
      if (p.label === personaId && prefs.mutedPersonas[p.id] === true) return false;
    }
  }

  return true;
}

/**
 * Reset all preferences to defaults.
 */
export function resetPrefs(): NotificationPreferences {
  const defaults = { ...DEFAULT_PREFS };
  cachedPrefs = defaults;
  persistToStorage(defaults);

  const ch = getChannel();
  if (ch) {
    try {
      ch.postMessage({ type: "prefs-changed", prefs: defaults });
    } catch {
      // noop
    }
  }

  notifyListeners();
  return { ...defaults };
}

/**
 * Subscribe to preference changes. Returns unsubscribe function.
 */
export function onPrefsChange(fn: PrefsListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Get human-readable label for notification types.
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  "feedback-submitted": "Feedback Submitted",
  "consensus-reached": "Consensus Reached",
  "build-completed": "Build Completed",
  "build-started": "Build Started",
  "persona-joined": "Persona Joined",
  "status-changed": "Status Changed",
};

/**
 * Get human-readable description for notification types.
 */
export const NOTIFICATION_TYPE_DESCRIPTIONS: Record<NotificationType, string> = {
  "feedback-submitted": "When a stakeholder submits feedback in a session",
  "consensus-reached": "When all personas reach consensus on a ticket",
  "build-completed": "When an automated build report finishes",
  "build-started": "When a build begins processing",
  "persona-joined": "When another user joins the session as a persona",
  "status-changed": "When a ticket transitions between statuses",
};
