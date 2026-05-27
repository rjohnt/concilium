"use client";

import { TicketStatus } from "@/lib/types";

const STATUS_TABS: { key: "all" | TicketStatus; label: string; emoji: string }[] = [
  { key: "all", label: "All", emoji: "📋" },
  { key: "draft", label: "Draft", emoji: "📝" },
  { key: "in-review", label: "In Review", emoji: "🔍" },
  { key: "consensus", label: "Consensus", emoji: "🤝" },
  { key: "building", label: "Building", emoji: "🔨" },
  { key: "done", label: "Done", emoji: "✅" },
];

interface FilterBarProps {
  activeFilter: "all" | TicketStatus;
  onFilterChange: (filter: "all" | TicketStatus) => void;
  counts: Record<string, number>;
}

export function FilterBar({
  activeFilter,
  onFilterChange,
  counts,
}: FilterBarProps) {
  return (
    <div className="mb-6">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
        {STATUS_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count = tab.key === "all"
            ? Object.values(counts).reduce((sum, c) => sum + c, 0)
            : counts[tab.key] ?? 0;

          return (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150 border ${
                isActive
                  ? "bg-gold/20 border-gold/30 text-gold-light shadow-[0_0_8px_rgba(201,168,76,0.15)]"
                  : "bg-elevated border-border-visible/30 text-ink-secondary hover:bg-elevated/80 hover:text-ink-primary hover:border-border-visible/50"
              }`}
            >
              <span className="text-sm leading-none">{tab.emoji}</span>
              <span>{tab.label}</span>
              <span
                className={`ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold ${
                  isActive
                    ? "bg-gold/30 text-gold-light"
                    : "bg-overlay/60 text-ink-muted"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
