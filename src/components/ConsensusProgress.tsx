"use client";

import { useEffect, useState } from "react";
import { PersonaId } from "@/lib/types";
import { getAllPersonas } from "@/lib/personas";
import { PersonaBadge } from "./PersonaBadge";
import { CheckCircle, Clock, Sparkles, Trophy } from "lucide-react";

interface ConsensusProgressProps {
  ticketId: string;
  approvals: PersonaId[];
  onConsensusReached?: () => void;
}

export function ConsensusProgress({
  ticketId,
  approvals,
  onConsensusReached,
}: ConsensusProgressProps) {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationTriggered, setCelebrationTriggered] = useState(false);

  const allPersonas = getAllPersonas();
  const total = allPersonas.length;
  const approved = approvals.length;
  const percentage = total > 0 ? (approved / total) * 100 : 0;
  const consensusReached = percentage >= 75;

  const remaining = allPersonas.filter((p) => !approvals.includes(p.id));
  const approvedPersonas = allPersonas.filter((p) => approvals.includes(p.id));

  // Animate progress bar
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedWidth(percentage);
    }, 200);
    return () => clearTimeout(timer);
  }, [percentage]);

  // Celebration effect
  useEffect(() => {
    if (consensusReached && !celebrationTriggered) {
      setCelebrationTriggered(true);
      setShowCelebration(true);
      onConsensusReached?.();

      const hideTimer = setTimeout(() => {
        setShowCelebration(false);
      }, 4000);
      return () => clearTimeout(hideTimer);
    }
  }, [consensusReached, celebrationTriggered, onConsensusReached]);

  // Determine progress bar color
  const progressColor =
    percentage >= 100
      ? "bg-[color:var(--success-500)]"
      : percentage >= 75
      ? "bg-[color:color-mix(in_oklab,var(--success-500)_85%,white)]"
      : percentage >= 50
      ? "bg-[color:color-mix(in_oklab,var(--warning-500)_85%,white)]"
      : percentage >= 25
      ? "bg-[color:var(--warning-500)]"
      : "bg-ink-ghost";

  const progressGlow =
    percentage >= 75
      ? "shadow-[0_0_12px_color-mix(in_oklab,var(--success-500)_40%,transparent)]"
      : "";

  return (
    <div className="space-y-4">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="relative overflow-hidden rounded-xl bg-[color:var(--success-100)] border border-[color:color-mix(in_oklab,var(--success-500)_22%,transparent)] p-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:color-mix(in_oklab,var(--success-500)_20%,transparent)]">
                <Trophy size={20} className="text-[color:var(--success-500)]" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-[color:color-mix(in_oklab,var(--success-500)_80%,black)] flex items-center gap-2">
                <Sparkles size={16} className="text-[color:var(--success-500)]" />
                Consensus Reached!
                <Sparkles size={16} className="text-[color:var(--success-500)]" />
              </p>
              <p className="text-sm text-[color:color-mix(in_oklab,var(--success-500)_80%,black)]">
                {approved}/{total} personas have approved — the ticket is ready
                to build!
              </p>
            </div>
          </div>
          {/* Animated sparkle particles */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-2 left-1/4 w-1 h-1 bg-[color:var(--success-500)] rounded-full animate-ping" />
            <div
              className="absolute top-4 right-1/3 w-1.5 h-1.5 bg-[color:color-mix(in_oklab,var(--success-500)_60%,white)] rounded-full animate-ping"
              style={{ animationDelay: "0.3s" }}
            />
            <div
              className="absolute bottom-2 left-1/3 w-1 h-1 bg-[color:var(--success-500)] rounded-full animate-ping"
              style={{ animationDelay: "0.7s" }}
            />
            <div
              className="absolute bottom-3 right-1/4 w-1.5 h-1.5 bg-[color:color-mix(in_oklab,var(--success-500)_60%,white)] rounded-full animate-ping"
              style={{ animationDelay: "1s" }}
            />
          </div>
        </div>
      )}

      {/* Progress header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-primary uppercase tracking-wider">
          Consensus Progress
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-secondary">
            <span
              className={
                consensusReached ? "text-[color:var(--success-500)] font-semibold" : ""
              }
            >
              {approved}
            </span>
            <span className="text-ink-ghost">/{total}</span> approved
          </span>
          <span
            className={`badge text-xs ${
              consensusReached
                ? "bg-[color:var(--success-100)] text-[color:color-mix(in_oklab,var(--success-500)_80%,black)]"
                : percentage >= 50
                ? "bg-[color:var(--warning-100)] text-[color:color-mix(in_oklab,var(--warning-500)_72%,black)]"
                : "bg-elevated text-ink-secondary"
            }`}
          >
            {Math.round(percentage)}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-elevated rounded-full overflow-hidden">
        {/* Background grid effect */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 5px)",
          }}
        />
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColor} ${progressGlow} relative`}
          style={{ width: `${animatedWidth}%` }}
        >
          {/* Shimmer effect */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
              animation: "shimmer 2s infinite",
            }}
          />
        </div>
      </div>

      {/* Per-persona status */}
      <div className="space-y-2">
        <p className="text-xs text-ink-muted uppercase tracking-wider">
          Persona Status
        </p>
        <div className="grid grid-cols-2 gap-2">
          {/* Approved personas first */}
          {approvedPersonas.map((persona) => (
            <div
              key={persona.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-elevated/40 border border-border-subtle"
            >
              <PersonaBadge personaId={persona.id} approved={true} />
              <CheckCircle size={14} className="text-[color:var(--success-500)] ml-auto flex-shrink-0" />
            </div>
          ))}
          {/* Remaining personas */}
          {remaining.map((persona) => (
            <div
              key={persona.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-elevated/20 border border-border-subtle/50 opacity-70"
            >
              <PersonaBadge personaId={persona.id} approved={false} />
              <Clock size={14} className="text-ink-muted ml-auto flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Remaining personas callout */}
      {remaining.length > 0 && (
        <div className="p-3 rounded-lg bg-[color:var(--warning-100)] border border-[color:color-mix(in_oklab,var(--warning-500)_28%,transparent)]">
          <p className="text-xs text-[color:color-mix(in_oklab,var(--warning-500)_72%,black)] flex items-center gap-1.5">
            <Clock size={12} />
            Waiting for:{" "}
            {remaining.map((p) => p.label).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
