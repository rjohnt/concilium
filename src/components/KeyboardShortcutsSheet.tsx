"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HelpCircle, X } from "lucide-react";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

// ── Shortcut data grouped by category ──────────────────────────────────

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  category: string;
  shortcuts: ShortcutEntry[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    category: "Navigation",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open command palette" },
      { keys: ["⌘", "N"], description: "New ticket" },
    ],
  },
  {
    category: "Session Prompt",
    shortcuts: [
      { keys: ["⌘", "↵"], description: "Submit feedback" },
    ],
  },
  {
    category: "General",
    shortcuts: [
      { keys: ["←", "→", "↑", "↓"], description: "Navigate lists and options" },
      { keys: ["Tab"], description: "Next focusable element" },
      { keys: ["↵"], description: "Confirm / select" },
      { keys: ["Esc"], description: "Close modals and panels" },
      { keys: ["?"], description: "Toggle this cheat sheet" },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────

/** Returns true if the active element is a text input / textarea / editable. */
function isTypingTarget(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "textarea" || tag === "select") return true;
  if (tag === "input") {
    const type = (el as HTMLInputElement).type;
    // Only text-like inputs — exclude radio, checkbox, button, range, etc.
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

// ── kbd helper (consistent with CommandPalette.tsx) ────────────────────

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium text-ink-muted bg-elevated border border-border-subtle rounded">
      {children}
    </kbd>
  );
}

// ── Component ──────────────────────────────────────────────────────────

export function KeyboardShortcutsSheet() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  // ── Global '?' via useKeyboardShortcut hook (ignores when typing) ──
  useKeyboardShortcut(
    "?",
    () => {
      if (isTypingTarget()) return;
      toggle();
    },
    undefined,
    false,
  );

  // ── Close on Escape when the sheet is open ─────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  return (
    <>
      {/* ── Floating toggle button (hidden when sheet is open) ──────── */}
      <button
        onClick={toggle}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
        className={`fixed bottom-6 right-6 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-elevated border border-border-visible text-ink-muted hover:text-gold hover:border-gold/40 shadow-lg transition-all duration-150 ${
          isOpen ? "pointer-events-none opacity-0" : ""
        }`}
      >
        <HelpCircle size={16} />
      </button>

      {/* ── Overlay / sheet ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
          >
            {/* Sheet panel */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Keyboard shortcuts"
              aria-describedby="shortcuts-sheet-footer"
              className="relative w-full max-w-lg mx-4 mb-4 sm:mb-0 bg-raised border border-border-visible rounded-xl shadow-2xl overflow-hidden"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
                <h2 className="text-sm font-semibold text-ink-primary">
                  Keyboard Shortcuts
                </h2>
                <button
                  onClick={close}
                  aria-label="Close shortcuts sheet"
                  className="flex items-center justify-center h-7 w-7 rounded-md text-ink-muted hover:text-ink-primary hover:bg-elevated transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Shortcut list */}
              <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
                {shortcutGroups.map((group) => (
                  <div key={group.category}>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
                      {group.category}
                    </h3>
                    <div className="space-y-2">
                      {group.shortcuts.map((entry) => (
                        <div
                          key={entry.description}
                          className="flex items-center justify-between gap-4"
                        >
                          <span className="text-sm text-ink-secondary">
                            {entry.description}
                          </span>
                          <span className="shrink-0">
                            <Kbd>{entry.keys.join("")}</Kbd>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer hint */}
              <div
                id="shortcuts-sheet-footer"
                className="flex items-center justify-center gap-2 px-5 py-3 border-t border-border-subtle text-[11px] text-ink-muted"
              >
                <span>Press</span>
                <Kbd>?</Kbd>
                <span>anytime to toggle this sheet</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
