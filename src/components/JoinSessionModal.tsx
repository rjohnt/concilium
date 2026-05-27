"use client";

import { useState } from "react";
import { Persona, PersonaId } from "@/lib/types";
import { getAllPersonas } from "@/lib/personas";
import { X, Sparkles, ArrowRight } from "lucide-react";

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

export function JoinSessionModal({
  isOpen,
  onJoin,
  mode = "initial",
}: {
  isOpen: boolean;
  onJoin: (personaId: PersonaId) => void;
  mode?: "initial" | "switch";
}) {
  const [selectedId, setSelectedId] = useState<PersonaId | null>(null);
  const [joining, setJoining] = useState(false);
  const personas = getAllPersonas();

  if (!isOpen) return null;

  const handleSelect = (personaId: PersonaId) => {
    setSelectedId(personaId);
  };

  const handleJoin = () => {
    if (!selectedId) return;
    setJoining(true);
    // Brief cinematic delay before transitioning
    setTimeout(() => {
      onJoin(selectedId);
    }, 500);
  };

  const title = mode === "switch" ? "Switch Persona" : "Choose Your Role";
  const description =
    mode === "switch"
      ? "Switching personas changes your perspective in this session. You can always switch back."
      : "Join this ticket session as a stakeholder persona. Your perspective will shape the review — weigh in with the lens of your chosen role.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-deep/95 backdrop-blur-sm"
        aria-hidden
      />

      {/* Modal content */}
      <div className="relative w-full max-w-3xl animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-medium mb-4">
            <Sparkles size={14} />
            {mode === "switch" ? "Switch Role" : "Session Join"}
          </div>
          <h2 className="text-3xl font-bold text-ink-primary mb-2">
            {title}
          </h2>
          <p className="text-ink-muted max-w-lg mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        {/* Persona cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {personas.map((persona, i) => (
            <button
              key={persona.id}
              onClick={() => handleSelect(persona.id)}
              disabled={joining}
              className={`group relative text-left p-5 rounded-xl border transition-all duration-300 cursor-pointer
                bg-elevated/80 hover:bg-elevated
                ${
                  selectedId === persona.id
                    ? `border-2 ${PERSONA_BORDER_COLORS[persona.id].split(" ")[0]} ring-2 ${PERSONA_RING_COLORS[persona.id]} ${PERSONA_GLOW_COLORS[persona.id]} shadow-xl scale-[1.02]`
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
                {/* Emoji + Label row */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{persona.emoji}</span>
                  <div>
                    <h3
                      className={`text-lg font-semibold ${
                        selectedId === persona.id
                          ? "text-ink-primary"
                          : "text-ink-secondary group-hover:text-ink-primary"
                      } transition-colors`}
                    >
                      {persona.label}
                    </h3>
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
                <div className="mt-3 p-3 rounded-lg bg-deep/80 border border-border-subtle/60">
                  <p className="text-xs text-ink-muted leading-relaxed line-clamp-3 font-mono">
                    {persona.promptTemplate}
                  </p>
                </div>

                {/* Selected indicator */}
                {selectedId === persona.id && (
                  <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-gold">
                    <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                    Selected
                  </div>
                )}
              </div>
            </button>
          ))}
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
                {mode === "switch" ? "Switch to" : "Join as"}{" "}
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
            : "You can switch your persona at any time during the session."}
        </p>
      </div>
    </div>
  );
}
