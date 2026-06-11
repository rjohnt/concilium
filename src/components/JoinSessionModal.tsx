"use client";

import { useEffect, useState } from "react";
import { PersonaId, Seat } from "@/lib/types";
import { getAllPersonas } from "@/lib/personas";
import { getPreferredRole } from "@/lib/seats";
import { Sparkles, ArrowRight, Bot, User, Lock } from "lucide-react";
import { PersonaIcon } from "./PersonaIcon";

const PERSONA_BORDER_COLORS: Record<PersonaId, string> = {
  engineer: "border-blue-500/50 hover:border-blue-400 group-hover:shadow-blue-500/20",
  designer: "border-purple-500/50 hover:border-purple-400 group-hover:shadow-purple-500/20",
  "product-owner": "border-emerald-500/50 hover:border-emerald-400 group-hover:shadow-emerald-500/20",
  qa: "border-amber-500/50 hover:border-amber-400 group-hover:shadow-amber-500/20",
};

const PERSONA_GLOW_COLORS: Record<PersonaId, string> = {
  engineer: "shadow-blue-500/30",
  designer: "shadow-purple-500/30",
  "product-owner": "shadow-emerald-500/30",
  qa: "shadow-amber-500/30",
};

const PERSONA_RING_COLORS: Record<PersonaId, string> = {
  engineer: "ring-blue-500",
  designer: "ring-purple-500",
  "product-owner": "ring-emerald-500",
  qa: "ring-amber-500",
};

const PERSONA_TEXT_COLORS: Record<PersonaId, string> = {
  engineer: "text-blue-400",
  designer: "text-purple-400",
  "product-owner": "text-emerald-400",
  qa: "text-amber-400",
};

const PERSONA_BG_GLOW: Record<PersonaId, string> = {
  engineer: "bg-blue-500/5",
  designer: "bg-purple-500/5",
  "product-owner": "bg-emerald-500/5",
  qa: "bg-amber-500/5",
};

function SeatBadge({ seat, isMine }: { seat: Seat; isMine: boolean }) {
  if (seat.occupant === "ai") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-steel/15 border border-blue-steel/30 text-blue-steel text-[10px] font-medium">
        <Bot size={11} />
        AI stand-in
      </span>
    );
  }
  if (isMine) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-olive/15 border border-olive/30 text-olive text-[10px] font-medium">
        <User size={11} />
        You
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-elevated border border-border-visible text-ink-muted text-[10px] font-medium">
      <Lock size={11} />
      {seat.claimedByLabel || "Another human"}
    </span>
  );
}

export function JoinSessionModal({
  isOpen,
  onJoin,
  mode = "initial",
  seats,
  clientId,
}: {
  isOpen: boolean;
  onJoin: (personaId: PersonaId) => void;
  mode?: "initial" | "switch";
  /** Normalized seat map for the ticket (one seat per persona). */
  seats?: Record<PersonaId, Seat>;
  /** Stable id of this client, used to recognize seats you already hold. */
  clientId?: string;
}) {
  const [selectedId, setSelectedId] = useState<PersonaId | null>(null);
  const [joining, setJoining] = useState(false);
  const personas = getAllPersonas();

  const isLockedSeat = (personaId: PersonaId): boolean => {
    const seat = seats?.[personaId];
    return !!seat && seat.occupant === "human" && seat.claimedBy !== clientId;
  };

  // Preselect the user's remembered role when the modal opens fresh
  useEffect(() => {
    if (!isOpen || mode !== "initial") return;
    const preferred = getPreferredRole();
    if (preferred && !isLockedSeat(preferred)) {
      setSelectedId(preferred);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleSelect = (personaId: PersonaId) => {
    if (isLockedSeat(personaId)) return;
    setSelectedId(personaId);
  };

  const handleJoin = () => {
    if (!selectedId || isLockedSeat(selectedId)) return;
    setJoining(true);
    // Brief cinematic delay before transitioning
    setTimeout(() => {
      onJoin(selectedId);
    }, 500);
  };

  const title = mode === "switch" ? "Switch Role" : "Choose Your Role";
  const description =
    mode === "switch"
      ? "Switching roles hands your current seat back to its AI stand-in and takes over the new one."
      : "Every role is held by an AI stand-in until a human takes it over. Claim a seat to weigh in yourself — the AI covers the rest.";

  const selectedSeat = selectedId ? seats?.[selectedId] : undefined;
  const takingOverFromAi = !!selectedSeat && selectedSeat.occupant === "ai";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain p-4 sm:flex sm:items-center sm:justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-deep"
        aria-hidden
      />

      {/* Modal content */}
      <div className="relative mx-auto w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-base p-2 sm:p-4 animate-in fade-in zoom-in-95 duration-300 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-medium mb-4">
            <Sparkles size={14} />
            {mode === "switch" ? "Switch Role" : "Session Join"}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-ink-primary mb-2">
            {title}
          </h2>
          <p className="text-ink-muted max-w-lg mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        {/* Persona cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {personas.map((persona, i) => {
            const seat = seats?.[persona.id] ?? { personaId: persona.id, occupant: "ai" as const };
            const locked = isLockedSeat(persona.id);
            const isMine = seat.occupant === "human" && seat.claimedBy === clientId;
            return (
            <button
              key={persona.id}
              onClick={() => handleSelect(persona.id)}
              disabled={joining || locked}
              className={`group relative text-left p-4 sm:p-5 rounded-xl border transition-all duration-300
                bg-elevated hover:bg-elevated
                ${locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                ${
                  selectedId === persona.id
                    ? `border-2 ${PERSONA_BORDER_COLORS[persona.id].split(" ")[0]} ring-2 ${PERSONA_RING_COLORS[persona.id]} ${PERSONA_GLOW_COLORS[persona.id]} shadow-xl scale-[1.02]`
                    : locked
                    ? `border-border-subtle`
                    : `border-border-visible hover:border-border-visible/60 hover:shadow-lg hover:scale-[1.01]`
                }
                animate-in fade-in slide-in-from-bottom-4
              `}
              style={{
                animationDelay: `${i * 100}ms`,
                animationFillMode: "both",
              }}
            >
              {/* Subtle background glow for selected */}
              {selectedId === persona.id && (
                <div
                  className={`absolute inset-0 rounded-xl ${PERSONA_BG_GLOW[persona.id]} transition-opacity`}
                />
              )}

              <div className="relative z-10">
                {/* Icon + Label row */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl"><PersonaIcon personaId={persona.id} size={32} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={`text-lg font-semibold ${
                          selectedId === persona.id
                            ? "text-ink-primary"
                            : "text-ink-secondary group-hover:text-ink-primary"
                        } transition-colors`}
                      >
                        {persona.label}
                      </h3>
                      <SeatBadge seat={seat} isMine={isMine} />
                    </div>
                    <p
                      className={`text-xs ${
                        selectedId === persona.id
                          ? PERSONA_TEXT_COLORS[persona.id]
                          : "text-ink-muted"
                      } transition-colors`}
                    >
                      {persona.expertise}
                    </p>
                  </div>
                </div>

                {/* Prompt preview */}
                <div className="mt-3 p-3 rounded-lg bg-deep border border-border-subtle/60">
                  <p className="text-xs text-ink-muted leading-relaxed line-clamp-3 font-mono">
                    {persona.promptTemplate}
                  </p>
                </div>

                {/* Selected indicator */}
                {selectedId === persona.id && (
                  <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-gold">
                    <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                    {seat.occupant === "ai" ? "Taking over from AI stand-in" : "Selected"}
                  </div>
                )}
              </div>
            </button>
            );
          })}
        </div>

        {/* Action button */}
        <div className="flex justify-center">
          <button
            onClick={handleJoin}
            disabled={!selectedId || joining}
            className="btn-primary text-base px-8 py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300
              flex items-center gap-2 shadow-lg shadow-gold/20 hover:shadow-gold/30"
          >
            {joining ? (
              <>
                <span className="animate-spin">
                  <Sparkles size={18} />
                </span>
                Joining session...
              </>
            ) : (
              <>
                {takingOverFromAi
                  ? "Take over as"
                  : mode === "switch"
                  ? "Switch to"
                  : "Join as"}{" "}
                {selectedId
                  ? personas.find((p) => p.id === selectedId)?.label
                  : "..."}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-ink-ghost mt-6">
          {mode === "switch"
            ? "Your current feedback will be preserved when switching."
            : "Seats held by other humans are locked. You can switch roles at any time."}
        </p>
      </div>
    </div>
  );
}
