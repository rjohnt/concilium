"use client";

import { useMemo } from "react";
import { Bot, User } from "lucide-react";
import { Ticket } from "@/lib/types";
import { summarizeSeatOccupancy } from "@/lib/seats";
import { getAllPersonas } from "@/lib/personas";
import { PersonaIcon } from "./PersonaIcon";

// MagicPath v2 light palette, matching the dashboard cards
const MP = {
  bg: "#ffffff",
  border: "#e8eaf6",
  text: "#0d0f1a",
  muted: "#6b7280",
  human: "#4f46e5",
  humanBg: "#EEF2FF",
  ai: "#64748B",
  aiBg: "#F1F5F9",
  track: "#eef0fa",
};

/**
 * Persistent dashboard element: how many persona seats across active tickets
 * are held by humans vs covered by AI stand-ins.
 */
export function SeatOccupancyBanner({ tickets }: { tickets: Ticket[] }) {
  const summary = useMemo(() => summarizeSeatOccupancy(tickets), [tickets]);
  const personas = getAllPersonas();

  if (summary.totalSeats === 0) return null;

  const humanPct = Math.round((summary.humanSeats / summary.totalSeats) * 100);

  return (
    <div
      className="rounded-xl p-5 mb-8"
      style={{ background: MP.bg, border: `1px solid ${MP.border}` }}
      data-testid="seat-occupancy-banner"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Summary */}
        <div className="min-w-0">
          <div className="text-xs font-medium mb-1" style={{ color: MP.muted }}>
            Seat occupancy · {summary.ticketCount} active ticket{summary.ticketCount === 1 ? "" : "s"}
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: MP.human }}>
              <User size={15} /> {summary.humanSeats} human
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: MP.ai }}>
              <Bot size={15} /> {summary.aiSeats} AI stand-in
            </span>
          </div>
          {/* Ratio bar */}
          <div
            className="mt-2 h-1.5 w-full md:w-64 rounded-full overflow-hidden"
            style={{ background: MP.track }}
            role="progressbar"
            aria-valuenow={humanPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${humanPct}% of seats held by humans`}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${humanPct}%`, background: MP.human }}
            />
          </div>
        </div>

        {/* Per-persona breakdown */}
        <div className="flex flex-wrap items-center gap-2">
          {personas.map((persona) => {
            const counts = summary.perPersona[persona.id];
            const allHuman = counts.ai === 0;
            return (
              <div
                key={persona.id}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium"
                style={{
                  background: allHuman ? MP.humanBg : MP.aiBg,
                  color: allHuman ? MP.human : MP.ai,
                  border: `1px solid ${MP.border}`,
                }}
                title={`${persona.label}: ${counts.human} seat${counts.human === 1 ? "" : "s"} human-held, ${counts.ai} covered by AI`}
              >
                <PersonaIcon personaId={persona.id} size={13} />
                {persona.label}
                <span className="inline-flex items-center gap-0.5" style={{ color: MP.human }}>
                  <User size={11} />{counts.human}
                </span>
                <span className="inline-flex items-center gap-0.5" style={{ color: MP.ai }}>
                  <Bot size={11} />{counts.ai}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
