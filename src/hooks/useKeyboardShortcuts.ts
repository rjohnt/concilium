"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Returns true if the active element is a text input / textarea / editable.
 * Prevents shortcuts from firing while the user is typing.
 */
function isTypingTarget(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "textarea" || tag === "select") return true;
  if (tag === "input") {
    const type = (el as HTMLInputElement).type;
    const textTypes = new Set([
      "text",
      "email",
      "password",
      "search",
      "url",
      "number",
      "tel",
    ]);
    return textTypes.has(type);
  }
  if (el.isContentEditable) return true;
  const role = el.getAttribute("role");
  if (role === "textbox" || role === "searchbox" || role === "combobox") return true;
  return false;
}

/**
 * Returns true when a visible modal dialog is open on the page.
 * Dashboard shortcuts are suppressed so they don't interfere with modals.
 *
 * Checks for any dialog in the DOM with aria-modal="true".
 * getBoundingClientRect() returns zeros in jsdom, so we use
 * a simple DOM presence check that works in both environments.
 */
function isModalOpen(): boolean {
  const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
  return dialog !== null;
}

export interface UseKeyboardShortcutsOptions {
  /** Number of visible tickets in the list */
  ticketCount: number;
  /** Ordered array of ticket IDs for the currently displayed tickets */
  ticketIds: string[];
  /** Called when Enter is pressed on a selected ticket */
  onOpenTicket: (ticketId: string) => void;
  /** Called when 'n' is pressed to create a new ticket */
  onNewTicket: () => void;
  /** Ref to the search input element, focused on '/' */
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export interface UseKeyboardShortcutsResult {
  /** Currently selected index (0-based), or null if nothing is selected */
  selectedIndex: number | null;
}

/**
 * Dashboard keyboard shortcuts hook for power-user navigation.
 *
 * Shortcuts (active only when dashboard is visible and no modal is open):
 * - `j` — move selection down one ticket card
 * - `k` — move selection up one ticket card
 * - `Enter` — open the selected ticket
 * - `/` — focus the search bar
 * - `n` — navigate to /new (create ticket)
 * - `Escape` — clear selection and blur search input
 *
 * Shortcuts are suppressed when the user is typing in an input/textarea
 * or when a modal dialog (CommandPalette, KeyboardShortcutsSheet, etc.)
 * is open.
 */
export function useKeyboardShortcuts({
  ticketCount,
  ticketIds,
  onOpenTicket,
  onNewTicket,
  searchInputRef,
}: UseKeyboardShortcutsOptions): UseKeyboardShortcutsResult {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedIndexRef = useRef(selectedIndex);

  // Keep the ref in sync with state so the stable effect callback can
  // always read the latest selectedIndex without re-registering listeners.
  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ── Guard: don't intercept when user is typing ──────────────
      if (isTypingTarget()) return;

      // ── Guard: don't intercept when a modal is open ─────────────
      if (isModalOpen()) return;

      const current = selectedIndexRef.current;

      switch (event.key) {
        case "j":
          event.preventDefault();
          setSelectedIndex((prev: number | null) => {
            if (ticketCount === 0) return null;
            if (prev === null) return 0;
            return Math.min(prev + 1, ticketCount - 1);
          });
          break;

        case "k":
          event.preventDefault();
          setSelectedIndex((prev: number | null) => {
            if (ticketCount === 0) return null;
            if (prev === null) return ticketCount - 1;
            return Math.max(prev - 1, 0);
          });
          break;

        case "Enter":
          if (current !== null && current < ticketIds.length) {
            event.preventDefault();
            onOpenTicket(ticketIds[current]);
          }
          break;

        case "/":
          event.preventDefault();
          searchInputRef.current?.focus();
          setSelectedIndex(null);
          break;

        case "n":
          event.preventDefault();
          onNewTicket();
          break;

        case "Escape":
          event.preventDefault();
          setSelectedIndex(null);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ticketCount, ticketIds, onOpenTicket, onNewTicket, searchInputRef]);

  return { selectedIndex };
}
