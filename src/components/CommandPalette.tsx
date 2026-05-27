"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  PlusCircle,
  Car,
} from "lucide-react";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

interface Command {
  label: string;
  shortcut?: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const commands: Command[] = [
  { label: "Go to Dashboard", shortcut: "⌘1", href: "/", icon: LayoutDashboard },
  { label: "New Ticket", shortcut: "⌘N", href: "/new", icon: PlusCircle },
  { label: "VIN Decoder", shortcut: "⌘V", href: "/vin", icon: Car },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // ── Refs for values read inside the keyboard-navigation listener ──
  // Using refs avoids re-attaching the event listener on every keystroke.
  const filteredCommandsRef = useRef(commands);
  const selectedIndexRef = useRef(0);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((cmd) => cmd.label.toLowerCase().includes(q));
  }, [query]);

  // Keep refs in sync
  filteredCommandsRef.current = filteredCommands;
  selectedIndexRef.current = selectedIndex;

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Global Cmd+K / Ctrl+K to open (single listener, cross-platform)
  useKeyboardShortcut("k", open, "metaOrCtrl");

  // Focus the input when palette opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Clamp selectedIndex when filtered commands change
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (filteredCommands.length === 0) return 0;
      return Math.min(prev, filteredCommands.length - 1);
    });
  }, [filteredCommands]);

  // ── Scroll selected item into view ────────────────────────────────────
  useEffect(() => {
    const el = document.getElementById(`command-${selectedIndex}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // ── Keyboard navigation inside the palette (stable listener) ───────────
  useEffect(() => {
    if (!isOpen) return;

    const handler = (event: KeyboardEvent) => {
      const cmds = filteredCommandsRef.current;
      const idx = selectedIndexRef.current;

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          close();
          break;

        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev + 1 >= cmds.length ? 0 : prev + 1,
          );
          break;

        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev - 1 < 0 ? cmds.length - 1 : prev - 1,
          );
          break;

        case "Enter":
          event.preventDefault();
          if (cmds[idx]) {
            const href = cmds[idx].href;
            close();
            router.push(href);
          }
          break;

        // ── Focus trap: Tab / Shift+Tab cycle within the palette ──
        case "Tab": {
          event.preventDefault();
          const focusableIds = ["palette-input"];
          for (let i = 0; i < cmds.length; i++) {
            focusableIds.push(`command-${i}`);
          }
          const current = document.activeElement;
          const currentIndex = focusableIds.indexOf(current?.id ?? "");

          if (event.shiftKey) {
            // Shift+Tab: move backward, wrap to last item
            const nextIndex =
              currentIndex <= 0 ? focusableIds.length - 1 : currentIndex - 1;
            document.getElementById(focusableIds[nextIndex])?.focus();
          } else {
            // Tab: move forward, wrap to input
            const nextIndex =
              currentIndex < 0 || currentIndex >= focusableIds.length - 1
                ? 0
                : currentIndex + 1;
            document.getElementById(focusableIds[nextIndex])?.focus();
          }
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close, router]);

  if (!isOpen) return null;

  const activeDescendantId =
    filteredCommands.length > 0 ? `command-${selectedIndex}` : undefined;

  return (
    // Backdrop overlay
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60"
      onClick={close}
    >
      {/* Palette card — stop propagation on clicks inside */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl bg-raised border border-border-visible rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
          <Search size={18} className="text-ink-muted shrink-0" />
          <input
            id="palette-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            aria-activedescendant={activeDescendantId ?? ""}
            className="w-full bg-transparent text-ink-primary text-sm placeholder:text-ink-muted outline-none"
          />
          <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium text-ink-muted bg-elevated border border-border-subtle rounded">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div ref={listRef} className="py-1">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-muted">
              No commands found
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <button
                key={command.label}
                id={`command-${index}`}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => {
                  close();
                  router.push(command.href);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  index === selectedIndex
                    ? "bg-gold/10 text-gold"
                    : "text-ink-secondary hover:bg-elevated hover:text-ink-primary"
                }`}
              >
                <command.icon
                  size={18}
                  className={index === selectedIndex ? "text-gold" : "text-ink-muted"}
                />
                <span className="flex-1 text-left">{command.label}</span>
                {command.shortcut && (
                  <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium text-ink-muted bg-elevated border border-border-subtle rounded">
                    {command.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border-subtle text-[11px] text-ink-muted">
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center px-1 py-0.5 text-[10px] font-medium bg-elevated border border-border-subtle rounded">
              ↑↓
            </kbd>{" "}
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center px-1 py-0.5 text-[10px] font-medium bg-elevated border border-border-subtle rounded">
              ↵
            </kbd>{" "}
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center px-1 py-0.5 text-[10px] font-medium bg-elevated border border-border-subtle rounded">
              esc
            </kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  );
}
