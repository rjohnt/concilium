"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  PlusCircle,
  FileText,
  Sparkles,
  Share2,
  Users,
  ExternalLink,
} from "lucide-react";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { getTickets, getTicket } from "@/lib/store";
import { generateAgentPrompt } from "@/lib/agent-prompt";
import { useToast } from "@/components/Toast";
import type { Ticket } from "@/lib/types";

interface Command {
  label: string;
  shortcut?: string;
  /** Navigate here when selected. */
  href?: string;
  /** Or run this action when selected (takes precedence over href). */
  run?: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const STATIC_COMMANDS: Command[] = [
  { label: "Go to Dashboard", shortcut: "⌘1", href: "/", icon: LayoutDashboard },
  { label: "New Ticket", shortcut: "⌘N", href: "/new", icon: PlusCircle },
];

// How many tickets to show when the query is empty / when filtering.
const RECENT_LIMIT = 5;
const MATCH_LIMIT = 8;

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { addToast } = useToast();

  // ── Refs for values read inside the keyboard-navigation listener ──
  // Using refs avoids re-attaching the event listener on every keystroke.
  const filteredCommandsRef = useRef<Command[]>(STATIC_COMMANDS);
  const selectedIndexRef = useRef(0);

  const copyToClipboard = useCallback(
    (text: string, title: string) => {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
      navigator.clipboard.writeText(text).then(
        () => addToast({ variant: "success", title }),
        () => addToast({ variant: "error", title: "Couldn't copy to clipboard" })
      );
    },
    [addToast]
  );

  // Actions for the ticket you're currently viewing — so the page's scattered
  // buttons (Share, Consensus, Prompt Session…) are reachable from one place.
  const contextCommands = useMemo<Command[]>(() => {
    const match = pathname?.match(/^\/ticket\/([^/]+)/);
    const id = match?.[1];
    if (!id) return [];
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return [
      {
        label: `Copy agent prompt — ${id}`,
        icon: Sparkles,
        run: () => {
          const t = getTicket(id);
          if (t) copyToClipboard(generateAgentPrompt(t), "Agent prompt copied");
        },
      },
      {
        label: `Copy share link — ${id}`,
        icon: Share2,
        run: () => copyToClipboard(`${origin}/share/${id}`, "Public link copied"),
      },
      { label: `Open public share page — ${id}`, href: `/share/${id}`, icon: ExternalLink },
      { label: `Open consensus room — ${id}`, href: `/consensus/${id}`, icon: Users },
      { label: `Open prompt session — ${id}`, href: `/prompt/${id}`, icon: Sparkles },
    ];
  }, [pathname, copyToClipboard]);

  // Tickets as jump-to commands (most-recently-updated first).
  const ticketCommands = useMemo<Command[]>(
    () =>
      tickets.map((t) => ({
        label: `${t.id} · ${t.title}`,
        href: `/ticket/${t.id}`,
        icon: FileText,
      })),
    [tickets]
  );

  const filteredCommands = useMemo(() => {
    const q = query.toLowerCase().trim();
    const actions = [...contextCommands, ...STATIC_COMMANDS];
    if (!q) {
      return [...actions, ...ticketCommands.slice(0, RECENT_LIMIT)];
    }
    const actionMatches = actions.filter((cmd) => cmd.label.toLowerCase().includes(q));
    const ticketMatches = ticketCommands
      .filter((cmd) => cmd.label.toLowerCase().includes(q))
      .slice(0, MATCH_LIMIT);
    return [...actionMatches, ...ticketMatches];
  }, [query, ticketCommands, contextCommands]);

  // Keep refs in sync
  filteredCommandsRef.current = filteredCommands;
  selectedIndexRef.current = selectedIndex;

  const open = useCallback(() => {
    // Snapshot tickets when opening, most-recently-updated first.
    const loaded = [...getTickets()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    setTickets(loaded);
    setIsOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Execute a command: run its action, or navigate. Always closes first.
  const runCommand = useCallback(
    (command: Command) => {
      close();
      if (command.run) command.run();
      else if (command.href) router.push(command.href);
    },
    [close, router]
  );
  // Ref so the stable keyboard listener can call the latest runCommand.
  const runCommandRef = useRef(runCommand);
  runCommandRef.current = runCommand;

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
            runCommandRef.current(cmds[idx]);
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
            placeholder="Search tickets or run a command…"
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
              No tickets or commands match &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <button
                key={command.label}
                id={`command-${index}`}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => runCommand(command)}
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
