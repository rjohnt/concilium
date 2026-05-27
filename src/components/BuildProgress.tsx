"use client";

import { BuildState, BuildPhase } from "@/lib/types";
import {
  Hammer,
  Search,
  Box,
  Code,
  TestTube,
  Rocket,
  CheckCircle,
  XCircle,
  Loader,
} from "lucide-react";

const PHASE_CONFIG: Record<
  BuildPhase,
  { label: string; icon: React.ReactNode }
> = {
  queued: { label: "Queued", icon: <Loader size={16} className="animate-spin" /> },
  analyzing: { label: "Analyzing Feedback", icon: <Search size={16} /> },
  scaffolding: { label: "Scaffolding", icon: <Box size={16} /> },
  implementing: { label: "Implementing", icon: <Code size={16} /> },
  testing: { label: "Running Tests", icon: <TestTube size={16} /> },
  deploying: { label: "Deploying", icon: <Rocket size={16} /> },
  complete: { label: "Complete", icon: <CheckCircle size={16} /> },
  failed: { label: "Failed", icon: <XCircle size={16} /> },
};

const PHASE_ORDER: BuildPhase[] = [
  "queued",
  "analyzing",
  "scaffolding",
  "implementing",
  "testing",
  "deploying",
  "complete",
];

export function BuildProgress({ buildState }: { buildState: BuildState }) {
  const currentIndex = PHASE_ORDER.indexOf(
    buildState.phase as Exclude<BuildPhase, "failed">
  );
  const isComplete = buildState.phase === "complete";
  const isFailed = buildState.phase === "failed";

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hammer size={16} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Build Pipeline
          </h3>
        </div>
        {isComplete && (
          <span className="badge bg-emerald-900/50 text-emerald-400">
            ✅ Deployed
          </span>
        )}
        {isFailed && (
          <span className="badge bg-red-900/50 text-red-400">❌ Failed</span>
        )}
        {!isComplete && !isFailed && (
          <span className="badge bg-blue-900/50 text-blue-400">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse mr-1" />
            Building
          </span>
        )}
      </div>

      {/* Phase indicator */}
      <div className="flex items-center gap-1.5">
        {PHASE_ORDER.filter((p) => p !== "queued" || buildState.phase !== "complete").map(
          (phase) => {
            const phaseIndex = PHASE_ORDER.indexOf(phase);
            const isActive = phase === buildState.phase;
            const isPast =
              !isFailed && currentIndex >= 0 && phaseIndex < currentIndex;
            const config = PHASE_CONFIG[phase];

            return (
              <div key={phase} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-3 h-3 rounded-full border-2 transition-all duration-500 ${
                    isActive
                      ? "border-blue-400 bg-blue-500 scale-125 shadow-lg shadow-blue-500/50"
                      : isPast
                      ? "border-emerald-400 bg-emerald-500"
                      : "border-gray-700 bg-gray-800"
                  }`}
                />
              </div>
            );
          }
        )}
      </div>

      {/* Phase labels */}
      <div className="flex items-start gap-1.5">
        {PHASE_ORDER.filter((p) => p !== "queued" || buildState.phase !== "complete").map(
          (phase) => {
            const phaseIndex = PHASE_ORDER.indexOf(phase);
            const isActive = phase === buildState.phase;
            const isPast =
              !isFailed && currentIndex >= 0 && phaseIndex < currentIndex;
            const config = PHASE_CONFIG[phase];

            return (
              <div
                key={phase}
                className="flex-1 flex flex-col items-center gap-1 min-w-0"
              >
                <span
                  className={`text-[10px] font-medium text-center ${
                    isActive
                      ? "text-blue-400"
                      : isPast
                      ? "text-emerald-400"
                      : "text-gray-600"
                  }`}
                >
                  {config.label}
                </span>
              </div>
            );
          }
        )}
      </div>

      {/* Current phase detail */}
      {!isComplete && !isFailed && buildState.phase !== "queued" && (
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
          <div className="flex items-center gap-2">
            <span className="animate-spin">
              <Loader size={14} className="text-blue-400" />
            </span>
            <span className="text-sm text-gray-300">
              {PHASE_CONFIG[buildState.phase].label}...
            </span>
          </div>
        </div>
      )}

      {/* Build log */}
      {buildState.log.length > 0 && (
        <div className="border-t border-gray-800 pt-3 space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Build Log
          </p>
          {buildState.log.map((entry, i) => (
            <p
              key={i}
              className="text-xs text-gray-400 font-mono flex items-start gap-2"
            >
              <span className="text-gray-600 flex-shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              {entry}
            </p>
          ))}
        </div>
      )}

      {/* Timestamps */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span>
          Started:{" "}
          {new Date(buildState.startedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
        {buildState.completedAt && (
          <span>
            Completed:{" "}
            {new Date(buildState.completedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
