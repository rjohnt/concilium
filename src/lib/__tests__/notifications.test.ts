/**
 * notifications.test.ts — Unit tests for the notifications system (DEV-89).
 *
 * Covers:
 *   1. addNotification creates notification with correct shape
 *   2. markRead updates read status
 *   3. getUnreadCount returns accurate count
 *   4. markAllRead clears all unread
 *   5. getNotifications returns stored notifications
 *   6. Notification type variants (all 6 types)
 *   7. onNotificationsChange listener registration and cleanup
 *   8. BroadcastChannel cross-tab sync (mocked)
 *   9. requestNotificationPermission
 *  10. requestBrowserNotification
 *  11. notifyFeedbackSubmitted
 *  12. notifyConsensusReached
 *  13. notifyBuildCompleted
 *
 * Module-level state is reset before each test via vi.resetModules().
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { AppNotification, NotificationType } from "../notifications";

// ── localStorage mock ──────────────────────────────────────────────────────

function getMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

// ── BroadcastChannel mock ──────────────────────────────────────────────────

type MessageHandler = (event: MessageEvent) => void;

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  name: string;
  private listeners: Map<string, Set<MessageHandler>> = new Map();

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  postMessage(data: unknown): void {
    // Deliver to all OTHER channels with the same name
    for (const other of MockBroadcastChannel.instances) {
      if (other !== this && other.name === this.name) {
        const handlers = other.listeners.get("message");
        if (handlers) {
          const event = new MessageEvent("message", { data });
          for (const handler of handlers) {
            try {
              handler(event);
            } catch {
              // noop
            }
          }
        }
      }
    }
  }

  addEventListener(type: string, listener: MessageHandler): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  removeEventListener(type: string, listener: MessageHandler): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    const idx = MockBroadcastChannel.instances.indexOf(this);
    if (idx !== -1) MockBroadcastChannel.instances.splice(idx, 1);
    this.listeners.clear();
  }

  static reset(): void {
    MockBroadcastChannel.instances = [];
  }
}

// ── Notification API mock ──────────────────────────────────────────────────

interface MockNotification {
  title: string;
  options: NotificationOptions;
}

const mockNotifications: MockNotification[] = [];

function resetMockNotifications(): void {
  mockNotifications.length = 0;
}

function createMockNotification(
  title: string,
  options?: NotificationOptions
): MockNotification {
  const n = { title, options: options ?? {} };
  mockNotifications.push(n);
  return n;
}

// ── Test suite ─────────────────────────────────────────────────────────────

/**
 * addNotification / notify* return `AppNotification | null` (null when muted
 * by preferences). These tests never mute, so bind them with the null
 * stripped from the return type to keep assertions clean.
 */
type NonNullReturn<F extends (...args: never[]) => unknown> = (
  ...args: Parameters<F>
) => NonNullable<ReturnType<F>>;

describe("notifications", () => {
  let addNotification: NonNullReturn<typeof import("../notifications").addNotification>;
  let getNotifications: typeof import("../notifications").getNotifications;
  let getUnreadCount: typeof import("../notifications").getUnreadCount;
  let markRead: typeof import("../notifications").markRead;
  let markAllRead: typeof import("../notifications").markAllRead;
  let onNotificationsChange: typeof import("../notifications").onNotificationsChange;
  let requestNotificationPermission: typeof import("../notifications").requestNotificationPermission;
  let requestBrowserNotification: typeof import("../notifications").requestBrowserNotification;
  let notifyFeedbackSubmitted: NonNullReturn<
    typeof import("../notifications").notifyFeedbackSubmitted
  >;
  let notifyConsensusReached: NonNullReturn<
    typeof import("../notifications").notifyConsensusReached
  >;
  let notifyBuildCompleted: NonNullReturn<typeof import("../notifications").notifyBuildCompleted>;

  /**
   * Helper: re-import the notifications module fresh (each test).
   * This ensures module-level state (notifications[], listeners, idCounter, channel)
   * starts clean for every test.
   */
  async function resetModule(): Promise<void> {
    vi.resetModules();

    // Set up globals BEFORE importing the module (module init runs on import)
    const mock = getMockStorage();
    vi.stubGlobal("localStorage", mock);
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    MockBroadcastChannel.reset();
    resetMockNotifications();

    const mod = await import("../notifications");
    addNotification = mod.addNotification as typeof addNotification;
    getNotifications = mod.getNotifications;
    getUnreadCount = mod.getUnreadCount;
    markRead = mod.markRead;
    markAllRead = mod.markAllRead;
    onNotificationsChange = mod.onNotificationsChange;
    requestNotificationPermission = mod.requestNotificationPermission;
    requestBrowserNotification = mod.requestBrowserNotification;
    notifyFeedbackSubmitted = mod.notifyFeedbackSubmitted as typeof notifyFeedbackSubmitted;
    notifyConsensusReached = mod.notifyConsensusReached as typeof notifyConsensusReached;
    notifyBuildCompleted = mod.notifyBuildCompleted as typeof notifyBuildCompleted;
  }

  beforeEach(async () => {
    // Ensure window.Notification is reset to jsdom default (undefined).
    // Some tests mock it directly on window and vi.unstubAllGlobals won't restore it.
    if ("Notification" in window) {
      delete (window as any).Notification;
    }
    await resetModule();
  });

  afterEach(() => {
    if ("Notification" in window) {
      delete (window as any).Notification;
    }
    vi.unstubAllGlobals();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. addNotification — creates notification with correct shape
  // ═══════════════════════════════════════════════════════════════════════════

  describe("addNotification", () => {
    it("creates a notification with all fields populated", () => {
      const n = addNotification(
        "status-changed",
        "Status Update",
        "Ticket moved to in-review",
        "TIX-001",
        "Fix login bug",
        "alice",
      );

      expect(n.id).toBeDefined();
      expect(typeof n.id).toBe("string");
      expect(n.id.startsWith("notif-")).toBe(true);
      expect(n.type).toBe("status-changed");
      expect(n.title).toBe("Status Update");
      expect(n.message).toBe("Ticket moved to in-review");
      expect(n.ticketId).toBe("TIX-001");
      expect(n.ticketTitle).toBe("Fix login bug");
      expect(n.timestamp).toBeDefined();
      expect(new Date(n.timestamp).getTime()).not.toBeNaN();
      expect(n.read).toBe(false);
      expect(n.actor).toBe("alice");
    });

    it("generates unique IDs for each notification", () => {
      const n1 = addNotification("status-changed", "A", "msg", "TIX-001");
      const n2 = addNotification("status-changed", "B", "msg", "TIX-002");
      const n3 = addNotification("status-changed", "C", "msg", "TIX-003");

      expect(n1.id).not.toBe(n2.id);
      expect(n2.id).not.toBe(n3.id);
      expect(n1.id).not.toBe(n3.id);
    });

    it("allows optional fields to be undefined", () => {
      const n = addNotification(
        "status-changed",
        "No extras",
        "Just a message",
        "TIX-001",
      );

      expect(n.ticketTitle).toBeUndefined();
      expect(n.actor).toBeUndefined();
    });

    it("returns new notifications as unread", () => {
      const n = addNotification("status-changed", "T", "M", "TIX-001");
      expect(n.read).toBe(false);
    });

    it("adds notification to the store (prepended, newest first)", () => {
      addNotification("status-changed", "First", "msg", "TIX-001");
      addNotification("status-changed", "Second", "msg", "TIX-002");

      const all = getNotifications();
      expect(all).toHaveLength(2);
      expect(all[0].title).toBe("Second"); // newest first
      expect(all[1].title).toBe("First");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. markRead — updates read status
  // ═══════════════════════════════════════════════════════════════════════════

  describe("markRead", () => {
    it("marks a notification as read by ID", () => {
      const n = addNotification("status-changed", "T", "M", "TIX-001");
      expect(n.read).toBe(false);

      markRead(n.id);

      const all = getNotifications();
      expect(all[0].read).toBe(true);
    });

    it("does nothing when marking an already-read notification", () => {
      const n = addNotification("status-changed", "T", "M", "TIX-001");
      markRead(n.id);
      markRead(n.id); // second call should not throw

      const all = getNotifications();
      expect(all[0].read).toBe(true);
      expect(all).toHaveLength(1);
    });

    it("does nothing for a non-existent ID", () => {
      expect(() => markRead("notif-nonexistent")).not.toThrow();

      const all = getNotifications();
      expect(all).toHaveLength(0);
    });

    it("does not affect other notifications when marking one read", () => {
      const n1 = addNotification("status-changed", "T1", "M1", "TIX-001");
      const n2 = addNotification("status-changed", "T2", "M2", "TIX-002");

      markRead(n1.id);

      const all = getNotifications();
      expect(all.find((n) => n.id === n1.id)!.read).toBe(true);
      expect(all.find((n) => n.id === n2.id)!.read).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. getUnreadCount — returns accurate count
  // ═══════════════════════════════════════════════════════════════════════════

  describe("getUnreadCount", () => {
    it("returns 0 when there are no notifications", () => {
      expect(getUnreadCount()).toBe(0);
    });

    it("returns total count when all are unread", () => {
      addNotification("status-changed", "A", "M", "TIX-001");
      addNotification("status-changed", "B", "M", "TIX-002");
      addNotification("status-changed", "C", "M", "TIX-003");

      expect(getUnreadCount()).toBe(3);
    });

    it("returns 0 when all are read", () => {
      const n1 = addNotification("status-changed", "A", "M", "TIX-001");
      const n2 = addNotification("status-changed", "B", "M", "TIX-002");

      markRead(n1.id);
      markRead(n2.id);

      expect(getUnreadCount()).toBe(0);
    });

    it("returns correct count when some are read and some are not", () => {
      const n1 = addNotification("status-changed", "A", "M", "TIX-001");
      addNotification("status-changed", "B", "M", "TIX-002");
      const n3 = addNotification("status-changed", "C", "M", "TIX-003");

      markRead(n1.id);
      markRead(n3.id);

      expect(getUnreadCount()).toBe(1); // only B is unread
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. markAllRead — clears all unread
  // ═══════════════════════════════════════════════════════════════════════════

  describe("markAllRead", () => {
    it("marks all notifications as read", () => {
      addNotification("status-changed", "A", "M", "TIX-001");
      addNotification("status-changed", "B", "M", "TIX-002");
      addNotification("status-changed", "C", "M", "TIX-003");

      markAllRead();

      const all = getNotifications();
      for (const n of all) {
        expect(n.read).toBe(true);
      }
      expect(getUnreadCount()).toBe(0);
    });

    it("does nothing when there are no notifications", () => {
      expect(() => markAllRead()).not.toThrow();
      expect(getUnreadCount()).toBe(0);
    });

    it("does nothing when all notifications are already read", () => {
      addNotification("status-changed", "A", "M", "TIX-001");
      markAllRead();
      expect(getUnreadCount()).toBe(0);

      // Second markAllRead should be a no-op
      expect(() => markAllRead()).not.toThrow();
      expect(getUnreadCount()).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. getNotifications — returns stored notifications
  // ═══════════════════════════════════════════════════════════════════════════

  describe("getNotifications", () => {
    it("returns a defensive copy (mutating does not affect store)", () => {
      addNotification("status-changed", "A", "M", "TIX-001");
      const copy = getNotifications();
      copy.pop(); // mutate the copy

      expect(getNotifications()).toHaveLength(1); // store unchanged
    });

    it("returns notifications newest first", () => {
      addNotification("status-changed", "First", "1", "TIX-001");
      addNotification("status-changed", "Second", "2", "TIX-002");
      addNotification("status-changed", "Third", "3", "TIX-003");

      const all = getNotifications();
      expect(all[0].title).toBe("Third");
      expect(all[1].title).toBe("Second");
      expect(all[2].title).toBe("First");
    });

    it("returns an empty array when there are no notifications", () => {
      expect(getNotifications()).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Notification type variants (all 6 types)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("notification type variants", () => {
    const types: NotificationType[] = [
      "feedback-submitted",
      "consensus-reached",
      "build-completed",
      "build-started",
      "persona-joined",
      "status-changed",
    ];

    it.each(types)("accepts type '%s'", (type) => {
      const n = addNotification(type, "Title", "Message", "TIX-001");

      expect(n.type).toBe(type);
      expect(n.title).toBe("Title");
      expect(n.message).toBe("Message");
      expect(n.ticketId).toBe("TIX-001");
      expect(n.read).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. onNotificationsChange — listener registration and cleanup
  // ═══════════════════════════════════════════════════════════════════════════

  describe("onNotificationsChange", () => {
    it("calls the listener when a notification is added", () => {
      const listener = vi.fn();
      const unsubscribe = onNotificationsChange(listener);

      addNotification("status-changed", "T", "M", "TIX-001");

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
    });

    it("calls the listener when markRead changes state", () => {
      const listener = vi.fn();
      const unsubscribe = onNotificationsChange(listener);

      const n = addNotification("status-changed", "T", "M", "TIX-001");
      listener.mockClear(); // reset after addNotification call

      markRead(n.id);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
    });

    it("calls the listener when markAllRead changes state", () => {
      const listener = vi.fn();
      const unsubscribe = onNotificationsChange(listener);

      addNotification("status-changed", "T1", "M1", "TIX-001");
      addNotification("status-changed", "T2", "M2", "TIX-002");
      listener.mockClear();

      markAllRead();
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
    });

    it("does NOT call the listener after unsubscribing", () => {
      const listener = vi.fn();
      const unsubscribe = onNotificationsChange(listener);

      unsubscribe(); // remove listener

      addNotification("status-changed", "T", "M", "TIX-001");
      expect(listener).not.toHaveBeenCalled();
    });

    it("allows multiple listeners", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = onNotificationsChange(listener1);
      const unsub2 = onNotificationsChange(listener2);

      addNotification("status-changed", "T", "M", "TIX-001");

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      unsub1();
      unsub2();
    });

    it("still calls remaining listeners after one is removed", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = onNotificationsChange(listener1);
      onNotificationsChange(listener2);

      unsub1(); // remove listener1

      addNotification("status-changed", "T", "M", "TIX-001");

      expect(listener1).not.toHaveBeenCalled(); // unsubscribed
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("does not call listener if no state actually changed (e.g., markAllRead when all already read)", () => {
      const listener = vi.fn();

      onNotificationsChange(listener);
      // markAllRead with no notifications — no change, no listener call
      markAllRead();

      expect(listener).not.toHaveBeenCalled();
    });

    it("handles errors in listeners gracefully (does not prevent other listeners)", () => {
      const badListener = vi.fn(() => {
        throw new Error("boom");
      });
      const goodListener = vi.fn();

      onNotificationsChange(badListener);
      onNotificationsChange(goodListener);

      // Should not throw
      expect(() => {
        addNotification("status-changed", "T", "M", "TIX-001");
      }).not.toThrow();

      expect(badListener).toHaveBeenCalledTimes(1);
      expect(goodListener).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. BroadcastChannel cross-tab sync behavior (mocked)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("BroadcastChannel cross-tab sync", () => {
    it("creates a BroadcastChannel on the 'concilium-notifications' name", () => {
      const channels = MockBroadcastChannel.instances;
      const ch = channels.find(
        (c) => c.name === "concilium-notifications",
      );
      expect(ch).toBeDefined();
    });

    it("receives notifications posted from another tab (simulated)", async () => {
      // Create a notification in "this tab"
      addNotification("status-changed", "Local", "From local", "TIX-001");

      // Simulate another tab: create a second BroadcastChannel and post
      const otherTab = new MockBroadcastChannel("concilium-notifications");
      const remoteNotification: AppNotification = {
        id: "notif-remote-123",
        type: "persona-joined",
        title: "Remote Persona",
        message: "A new persona joined from another tab",
        ticketId: "TIX-999",
        timestamp: new Date().toISOString(),
        read: false,
      };

      otherTab.postMessage({
        type: "notification",
        notification: remoteNotification,
      });

      // The module's BroadcastChannel listener should have received it
      const all = getNotifications();
      const remote = all.find((n) => n.id === "notif-remote-123");
      expect(remote).toBeDefined();
      expect(remote!.type).toBe("persona-joined");
      expect(remote!.title).toBe("Remote Persona");
    });

    it("deduplicates: does not add a notification already present (by id)", async () => {
      // Add a notification in this tab
      const local = addNotification(
        "status-changed",
        "Local",
        "Msg",
        "TIX-001",
      );

      // Simulate another tab sending the same notification
      const otherTab = new MockBroadcastChannel("concilium-notifications");
      otherTab.postMessage({
        type: "notification",
        notification: { ...local }, // same id
      });

      // Should still only have one copy
      const all = getNotifications();
      expect(all.filter((n) => n.id === local.id)).toHaveLength(1);
    });

    it("receives notification triggers listeners in this tab", async () => {
      const listener = vi.fn();
      onNotificationsChange(listener);

      const otherTab = new MockBroadcastChannel("concilium-notifications");
      const remoteNotification: AppNotification = {
        id: "notif-remote-listener-1",
        type: "build-started",
        title: "Build Started Remotely",
        message: "A build was kicked off from another tab",
        ticketId: "TIX-500",
        timestamp: new Date().toISOString(),
        read: false,
      };

      otherTab.postMessage({
        type: "notification",
        notification: remoteNotification,
      });

      expect(listener).toHaveBeenCalled();
    });

    it("ignores messages without type 'notification'", () => {
      const otherTab = new MockBroadcastChannel("concilium-notifications");
      otherTab.postMessage({ type: "other-event", data: "garbage" });

      // No notification should have been added
      expect(getNotifications()).toHaveLength(0);
    });

    it("ignores messages on different channel names", () => {
      const otherTab = new MockBroadcastChannel("different-channel");
      otherTab.postMessage({
        type: "notification",
        notification: {
          id: "notif-diff-chan",
          type: "status-changed",
          title: "Should not appear",
          message: "Wrong channel",
          ticketId: "TIX-000",
          timestamp: new Date().toISOString(),
          read: false,
        },
      });

      expect(getNotifications()).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. requestNotificationPermission
  // ═══════════════════════════════════════════════════════════════════════════

  describe("requestNotificationPermission", () => {
    it("returns false when Notification API is not available", async () => {
      // window is defined in jsdom, but Notification is not on it
      // The module checks 'Notification' in window
      const result = await requestNotificationPermission();
      expect(result).toBe(false);
    });

    it("returns true when permission is already granted", async () => {
      // Mock Notification with 'granted' permission
      const originalNotification = (window as any).Notification;
      (window as any).Notification = {
        permission: "granted",
        requestPermission: vi.fn(),
      };

      // Re-import to pick up the mock
      vi.resetModules();
      vi.stubGlobal("localStorage", getMockStorage());
      vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
      MockBroadcastChannel.reset();

      const mod = await import("../notifications");
      const result = await mod.requestNotificationPermission();

      expect(result).toBe(true);

      // Restore
      (window as any).Notification = originalNotification;
    });

    it("returns false when permission is denied", async () => {
      const originalNotification = (window as any).Notification;
      (window as any).Notification = {
        permission: "denied",
        requestPermission: vi.fn(),
      };

      vi.resetModules();
      vi.stubGlobal("localStorage", getMockStorage());
      vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
      MockBroadcastChannel.reset();

      const mod = await import("../notifications");
      const result = await mod.requestNotificationPermission();

      expect(result).toBe(false);

      (window as any).Notification = originalNotification;
    });

    it("requests permission when in 'default' state and returns true if granted", async () => {
      const originalNotification = (window as any).Notification;
      (window as any).Notification = {
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("granted"),
      };

      vi.resetModules();
      vi.stubGlobal("localStorage", getMockStorage());
      vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
      MockBroadcastChannel.reset();

      const mod = await import("../notifications");
      const result = await mod.requestNotificationPermission();

      expect(result).toBe(true);
      expect(
        (window as any).Notification.requestPermission,
      ).toHaveBeenCalled();

      (window as any).Notification = originalNotification;
    });

    it("returns false when requestPermission resolves to 'denied'", async () => {
      const originalNotification = (window as any).Notification;
      (window as any).Notification = {
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("denied"),
      };

      vi.resetModules();
      vi.stubGlobal("localStorage", getMockStorage());
      vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
      MockBroadcastChannel.reset();

      const mod = await import("../notifications");
      const result = await mod.requestNotificationPermission();

      expect(result).toBe(false);

      (window as any).Notification = originalNotification;
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. requestBrowserNotification
  // ═══════════════════════════════════════════════════════════════════════════

  describe("requestBrowserNotification", () => {
    it("does nothing when Notification API is not available", async () => {
      // jsdom doesn't implement Notification by default
      // Re-import in clean state
      vi.resetModules();
      vi.stubGlobal("localStorage", getMockStorage());
      vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
      MockBroadcastChannel.reset();
      resetMockNotifications();

      const mod = await import("../notifications");

      // Should not throw
      expect(() => {
        mod.requestBrowserNotification("Hello", "World");
      }).not.toThrow();

      // No notification was created
      expect(mockNotifications).toHaveLength(0);
    });

    it("does nothing when permission is not granted", async () => {
      const originalNotification = (window as any).Notification;
      const NotificationMock = vi
        .fn()
        .mockImplementation(createMockNotification);
      Object.assign(NotificationMock, { permission: "denied" });
      (window as any).Notification = NotificationMock;

      vi.resetModules();
      vi.stubGlobal("localStorage", getMockStorage());
      vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
      MockBroadcastChannel.reset();
      resetMockNotifications();

      const mod = await import("../notifications");
      mod.requestBrowserNotification("Hello", "World");

      expect(NotificationMock).not.toHaveBeenCalled();

      (window as any).Notification = originalNotification;
    });

    it("sends a browser notification when permission is granted", async () => {
      const originalNotification = (window as any).Notification;
      const NotificationMock = vi
        .fn()
        .mockImplementation(createMockNotification);
      Object.assign(NotificationMock, { permission: "granted" });
      (window as any).Notification = NotificationMock;

      vi.resetModules();
      vi.stubGlobal("localStorage", getMockStorage());
      vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
      MockBroadcastChannel.reset();
      resetMockNotifications();

      const mod = await import("../notifications");
      mod.requestBrowserNotification("Hello", "World");

      expect(NotificationMock).toHaveBeenCalledTimes(1);
      expect(NotificationMock).toHaveBeenCalledWith("Hello", {
        body: "World",
        icon: "/favicon.ico",
        tag: "concilium",
      });

      (window as any).Notification = originalNotification;
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. notifyFeedbackSubmitted
  // ═══════════════════════════════════════════════════════════════════════════

  describe("notifyFeedbackSubmitted", () => {
    it("creates an approved feedback notification", () => {
      const n = notifyFeedbackSubmitted(
        "TIX-001",
        "Fix login bug",
        "SecurityBot",
        true,
      );

      expect(n.type).toBe("feedback-submitted");
      expect(n.title).toBe("SecurityBot approved");
      expect(n.message).toBe("SecurityBot approved Fix login bug");
      expect(n.ticketId).toBe("TIX-001");
      expect(n.ticketTitle).toBe("Fix login bug");
      expect(n.actor).toBe("SecurityBot");
      expect(n.read).toBe(false);
    });

    it("creates a concerns-raised feedback notification", () => {
      const n = notifyFeedbackSubmitted(
        "TIX-002",
        "Add dark mode",
        "UXBot",
        false,
      );

      expect(n.type).toBe("feedback-submitted");
      expect(n.title).toBe("UXBot raised concerns on");
      expect(n.message).toBe("UXBot raised concerns on Add dark mode");
      expect(n.ticketId).toBe("TIX-002");
      expect(n.actor).toBe("UXBot");
    });

    it("adds the notification to the store", () => {
      notifyFeedbackSubmitted("TIX-001", "Test", "Bot", true);
      expect(getNotifications()).toHaveLength(1);
      expect(getUnreadCount()).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. notifyConsensusReached
  // ═══════════════════════════════════════════════════════════════════════════

  describe("notifyConsensusReached", () => {
    it("creates a consensus notification with correct shape", () => {
      const n = notifyConsensusReached("TIX-001", "Fix bug", 3, 4);

      expect(n.type).toBe("consensus-reached");
      expect(n.title).toBe("🎯 Consensus Reached!");
      expect(n.message).toBe('3/4 personas approved "Fix bug"');
      expect(n.ticketId).toBe("TIX-001");
      expect(n.ticketTitle).toBe("Fix bug");
      expect(n.read).toBe(false);
    });

    it("works with unanimous consensus", () => {
      const n = notifyConsensusReached("TIX-001", "All agree", 5, 5);

      expect(n.type).toBe("consensus-reached");
      expect(n.message).toBe('5/5 personas approved "All agree"');
    });

    it("works with zero approvals", () => {
      const n = notifyConsensusReached("TIX-001", "No one", 0, 5);

      expect(n.message).toBe('0/5 personas approved "No one"');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. notifyBuildCompleted
  // ═══════════════════════════════════════════════════════════════════════════

  describe("notifyBuildCompleted", () => {
    it("creates a build-completed notification with correct shape", () => {
      const n = notifyBuildCompleted("TIX-001", "Fix login");

      expect(n.type).toBe("build-completed");
      expect(n.title).toBe("✅ Build Complete!");
      expect(n.message).toBe('Build completed for "Fix login"');
      expect(n.ticketId).toBe("TIX-001");
      expect(n.ticketTitle).toBe("Fix login");
      expect(n.read).toBe(false);
    });

    it("adds the notification to the store", () => {
      notifyBuildCompleted("TIX-001", "Test");
      expect(getNotifications()).toHaveLength(1);
      expect(getUnreadCount()).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Edge cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("getNotifications returns a new array each call (immutability)", () => {
      addNotification("status-changed", "T", "M", "TIX-001");
      const a = getNotifications();
      const b = getNotifications();
      expect(a).not.toBe(b); // different references
      expect(a).toEqual(b); // same content
    });

    it("handles rapid fire of many notifications", () => {
      for (let i = 0; i < 100; i++) {
        addNotification(
          "status-changed",
          `Title ${i}`,
          `Message ${i}`,
          `TIX-${i}`,
        );
      }

      expect(getNotifications()).toHaveLength(100);
      expect(getUnreadCount()).toBe(100);
    });
  });
});
