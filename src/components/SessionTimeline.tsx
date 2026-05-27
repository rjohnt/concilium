"use client";

import { SessionEvent, PersonaId } from "@/lib/types";
import { getPersona } from "@/lib/personas";
import {
  MessageSquare,
  CheckCircle,
  Hammer,
  Rocket,
  UserPlus,
  AlertCircle,
} from "lucide-react";

const EVENT_ICONS: Record<SessionEvent["type"], React.ReactNode> = {
  feedback: <MessageSquare size={14} />,
  consensus: <CheckCircle size={14} className="text-emerald-400" />,
  build_start: <Hammer size={14} className="text-blue-400" />,
  build_phase: <Rocket size={14} className="text-blue-400" />,
  build_complete: <CheckCircle size={14} className="text-emerald-400" />,
  persona_joined: <UserPlus size={14} className="text-gray-500" />,
};

const EVENT_COLORS: Record<SessionEvent["type"], string> = {
  feedback: "border-l-gray-600",
  consensus: "border-l-emerald-500",
  build_start: "border-l-blue-500",
  build_phase: "border-l-blue-500/50",
  build_complete: "border-l-emerald-500",
  persona_joined: "border-l-gray-700",
};

const PERSONA_COLORS: Record<PersonaId, string> = {
  engineer: "text-blue-400",
  designer: "text-purple-400",
  "product-owner": "text-emerald-400",
  qa: "text-amber-400",
};

export function SessionTimeline({ events }: { events: SessionEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No session activity yet. Feedback will appear here as stakeholders
        contribute.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const persona = event.personaId ? getPersona(event.personaId) : null;
        const isLatest = i === events.length - 1;

        return (
          <div
            key={event.id}
            className={`relative pl-4 border-l-2 ${
              EVENT_COLORS[event.type]
            } pb-4 last:pb-0 ${isLatest ? "border-opacity-100" : ""}`}
          >
            {/* Dot on the timeline */}
            <div
              className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[#1a1714] ${
                event.type === "consensus" || event.type === "build_complete"
                  ? "bg-emerald-500"
                  : event.type.startsWith("build")
                  ? "bg-blue-500"
                  : "bg-gray-600"
              }`}
            />

            <div className="flex items-start gap-2">
              {/* Icon */}
              <span className="mt-0.5 text-gray-500 flex-shrink-0">
                {EVENT_ICONS[event.type]}
              </span>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {persona && (
                    <span
                      className={`text-xs font-medium ${
                        PERSONA_COLORS[persona.id]
                      }`}
                    >
                      {persona.emoji} {persona.label}
                    </span>
                  )}
                  <span className="text-xs text-gray-600">
                    {new Date(event.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {event.metadata?.source === "ai" && (
                    <span className="badge bg-purple-900/30 text-purple-400 text-[10px]">
                      AI
                    </span>
                  )}
                  {event.metadata?.approved === "true" && (
                    <span className="badge bg-emerald-900/30 text-emerald-400 text-[10px]">
                      Approved
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-300 mt-0.5 leading-relaxed">
                  {event.message}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
