/**
 * notifications.ts — In-app and browser notification system.
 *
 * Provides a simple notification store that syncs across tabs via BroadcastChannel.
 * Tracks unread counts and supports browser Notification API.
 */

const NOTIFICATION_CHANNEL = "concilium-notifications";
const NOTIFICATION_STORAGE_KEY = "concilium-notifications";

// ── Types ──────────────────────────────────────────────────────────────────

import { isNotificationAllowed } from "./notification-preferences";

export type NotificationType =
  | "feedback-submitted"
  | "consensus-reached"
  | "build-completed"
  | "build-started"
  | "persona-joined"
  | "status-changed";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  ticketId: string;
  ticketTitle?: string;
  timestamp: string;
  read: boolean;
  actor?: string;
}

interface NotificationBroadcast {
  type: "notification";
  notification: AppNotification;
}

// ── Broadcast Channel ──────────────────────────────────────────────────────

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!channel) {
    try {
      channel = new BroadcastChannel(NOTIFICATION_CHANNEL);
    } catch {
      return null;
    }
  }
  return channel;
}

// ── In-memory + localStorage store ─────────────────────────────────────────

let notifications: AppNotification[] = [];
let listeners: Set<() => void> = new Set();

function load(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (raw) {
      notifications = JSON.parse(raw);
    }
  } catch {
    notifications = [];
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Storage full — silently fail
  }
}

function notifyListeners(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      // noop
    }
  }
}

// Initialize
load();

// Listen for cross-tab notifications
const ch = getChannel();
if (ch) {
  ch.addEventListener("message", (event: MessageEvent<NotificationBroadcast>) => {
    if (event.data?.type === "notification") {
      const n = event.data.notification;
      // Only add if not already present (dedup by id)
      if (!notifications.find((existing) => existing.id === n.id)) {
        notifications.unshift(n);
        persist();
        notifyListeners();
      }
    }
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

let idCounter = 0;

function generateId(): string {
  return `notif-${Date.now()}-${++idCounter}`;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Add a notification. Returns the notification object (or null if suppressed by preferences).
 * Broadcasts to other tabs and triggers browser notification if permitted.
 */
export function addNotification(
  type: NotificationType,
  title: string,
  message: string,
  ticketId: string,
  ticketTitle?: string,
  actor?: string,
): AppNotification | null {
  // Check notification preferences before creating
  const actorPersonaId = actor as string | undefined;
  const allowed = isNotificationAllowed(type, actorPersonaId);
  if (!allowed) return null;

  const notification: AppNotification = {
    id: generateId(),
    type,
    title,
    message,
    ticketId,
    ticketTitle,
    timestamp: new Date().toISOString(),
    read: false,
    actor,
  };

  notifications.unshift(notification);
  persist();
  notifyListeners();

  // Broadcast to other tabs
  const ch = getChannel();
  if (ch) {
    ch.postMessage({ type: "notification", notification } as NotificationBroadcast);
  }

  // Browser notification
  requestBrowserNotification(title, message);

  return notification;
}

/**
 * Get all notifications, newest first.
 */
export function getNotifications(): AppNotification[] {
  return [...notifications];
}

/**
 * Get unread notification count.
 */
export function getUnreadCount(): number {
  return notifications.filter((n) => !n.read).length;
}

/**
 * Mark a notification as read.
 */
export function markRead(id: string): void {
  const n = notifications.find((item) => item.id === id);
  if (n && !n.read) {
    n.read = true;
    persist();
    notifyListeners();
  }
}

/**
 * Mark all notifications as read.
 */
export function markAllRead(): void {
  let changed = false;
  for (const n of notifications) {
    if (!n.read) {
      n.read = true;
      changed = true;
    }
  }
  if (changed) {
    persist();
    notifyListeners();
  }
}

/**
 * Subscribe to notification changes.
 */
export function onNotificationsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Request browser notification permission and return whether granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Send a browser notification (silent if permission not granted).
 */
export function requestBrowserNotification(
  title: string,
  body: string,
): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "concilium",
    });
  } catch {
    // Fallback for older browsers
  }
}

/**
 * Create a notification from common Concilium events.
 */
export function notifyFeedbackSubmitted(
  ticketId: string,
  ticketTitle: string,
  personaLabel: string,
  approved: boolean,
): AppNotification | null {
  const type: NotificationType = "feedback-submitted";
  const status = approved ? "approved" : "raised concerns on";
  return addNotification(
    type,
    `${personaLabel} ${status}`,
    `${personaLabel} ${status} ${ticketTitle}`,
    ticketId,
    ticketTitle,
    personaLabel,
  );
}

export function notifyConsensusReached(
  ticketId: string,
  ticketTitle: string,
  approvedCount: number,
  totalCount: number,
): AppNotification | null {
  return addNotification(
    "consensus-reached",
    "🎯 Consensus Reached!",
    `${approvedCount}/${totalCount} personas approved "${ticketTitle}"`,
    ticketId,
    ticketTitle,
  );
}

export function notifyBuildCompleted(
  ticketId: string,
  ticketTitle: string,
): AppNotification | null {
  return addNotification(
    "build-completed",
    "✅ Build Complete!",
    `Build completed for "${ticketTitle}"`,
    ticketId,
    ticketTitle,
  );
}
