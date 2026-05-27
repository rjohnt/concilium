"use client";

import { useEffect, useState } from "react";
import { PersonaId } from "@/lib/types";
import { getConsensusProgress } from "@/lib/store";
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
      ? "bg-emerald-500"
      : percentage >= 75
      ? "bg-emerald-400"
      : percentage >= 50
      ? "bg-yellow-400"
      : percentage >= 25
      ? "bg-amber-500"
      : "bg-gray-600";

  const progressGlow =
    percentage >= 75 ? "shadow-[0_0_12px_rgba(52,211,153,0.4)]" : "";

  return (
    <div className="space-y-4">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-900/40 via-emerald-800/30 to-emerald-900/40 border border-emerald-500/30 p-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                <Trophy size={20} className="text-emerald-400" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-emerald-300 flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-400" />
                Consensus Reached!
                <Sparkles size={16} className="text-emerald-400" />
              </p>
              <p className="text-sm text-emerald-400/80">
                {approved}/{total} personas have approved — the ticket is ready
                to build!
              </p>
            </div>
          </div>
          {/* Animated sparkle particles */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-2 left-1/4 w-1 h-1 bg-emerald-300 rounded-full animate-ping" />
            <div
              className="absolute top-4 right-1/3 w-1.5 h-1.5 bg-emerald-200 rounded-full animate-ping"
              style={{ animationDelay: "0.3s" }}
            />
            <div
              className="absolute bottom-2 left-1/3 w-1 h-1 bg-emerald-300 rounded-full animate-ping"
              style={{ animationDelay: "0.7s" }}
            />
            <div
              className="absolute bottom-3 right-1/4 w-1.5 h-1.5 bg-emerald-200 rounded-full animate-ping"
              style={{ animationDelay: "1s" }}
            />
          </div>
        </div>
      )}

      {/* Progress header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Consensus Progress
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            <span
              className={
                consensusReached ? "text-emerald-400 font-semibold" : ""
              }
            >
              {approved}
            </span>
            <span className="text-gray-600">/{total}</span> approved
          </span>
          <span
            className={`badge text-xs ${
              consensusReached
                ? "bg-emerald-900/50 text-emerald-400"
                : percentage >= 50
                ? "bg-yellow-900/50 text-yellow-400"
                : "bg-gray-800 text-gray-400"
            }`}
          >
            {Math.round(percentage)}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
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
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          Persona Status
        </p>
        <div className="grid grid-cols-2 gap-2">
          {/* Approved personas first */}
          {approvedPersonas.map((persona) => (
            <div
              key={persona.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/40 border border-gray-800"
            >
              <PersonaBadge personaId={persona.id} approved={true} />
              <CheckCircle size={14} className="text-emerald-400 ml-auto flex-shrink-0" />
            </div>
          ))}
          {/* Remaining personas */}
          {remaining.map((persona) => (
            <div
              key={persona.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/20 border border-gray-800/50 opacity-70"
            >
              <PersonaBadge personaId={persona.id} approved={false} />
              <Clock size={14} className="text-gray-500 ml-auto flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Remaining personas callout */}
      {remaining.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-800/30">
          <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
            <Clock size={12} />
            Waiting for:{" "}
            {remaining.map((p) => allPersonas.find((pp) => pp.id === p)?.label).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
