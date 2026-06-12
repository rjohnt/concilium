"use client";

import { useState, useEffect, useCallback } from "react";
import { PersonaId } from "@/lib/types";
import { getAllPersonas } from "@/lib/personas";
import {
  Participant,
  onPresenceChange,
  getParticipants,
  joinSession,
  getClaimedPersonas,
} from "@/lib/session-presence";
import { PersonaIcon } from "./PersonaIcon";
import { Users, Clock, UserPlus } from "lucide-react";

function formatDuration(joinedAt: number): string {
  const diff = Math.floor((Date.now() - joinedAt) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface SessionParticipantsProps {
  ticketId: string;
  currentPersonaId: PersonaId | null;
  onPersonaSelect: (personaId: PersonaId) => void;
}

export function SessionParticipants({
  ticketId,
  currentPersonaId,
  onPersonaSelect,
}: SessionParticipantsProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const allPersonas = getAllPersonas();

  useEffect(() => {
    // Get initial state
    setParticipants(getParticipants(ticketId));

    // Subscribe to presence changes
    const unsub = onPresenceChange((all) => {
      setParticipants(all.filter((p) => p.ticketId === ticketId));
    });

    return unsub;
  }, [ticketId]);

  const claimedPersonaIds = participants.map((p) => p.personaId);
  const availablePersonas = allPersonas.filter(
    (p) => !claimedPersonaIds.includes(p.id),
  );

  // Only show personas that are NOT the current user (to avoid self-duplication)
  const otherParticipants = participants.filter(
    (p) => p.personaId !== currentPersonaId,
  );

  return (
    <div className="space-y-4">
      {/* Active participants */}
      {otherParticipants.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={13} className="text-ink-secondary" />
            <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">
              In Session
            </span>
            <span className="text-[10px] text-ink-ghost bg-elevated px-1.5 py-0.5 rounded-full">
              {otherParticipants.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {otherParticipants.map((p) => {
              const persona = allPersonas.find(
                (ap) => ap.id === p.personaId,
              );
              return (
                <div
                  key={p.clientId}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-elevated/60 border border-border-subtle/50"
                >
                  <div className="relative flex-shrink-0">
                    <PersonaIcon
                      personaId={p.personaId as PersonaId}
                      size={18}
                    />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--success-500)] border-2 border-deep" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink-primary truncate">
                      {persona?.label || p.label}
                    </p>
                    <div className="flex items-center gap-1">
                      <Clock size={9} className="text-ink-ghost" />
                      <span className="text-[10px] text-ink-ghost">
                        {formatDuration(p.joinedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available personas */}
      {availablePersonas.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <UserPlus size={13} className="text-ink-secondary" />
            <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">
              Available
            </span>
            <span className="text-[10px] text-ink-ghost bg-elevated px-1.5 py-0.5 rounded-full">
              {availablePersonas.length}
            </span>
          </div>
          <div className="space-y-1">
            {availablePersonas.map((persona) => (
              <button
                key={persona.id}
                onClick={() => onPersonaSelect(persona.id)}
                disabled={persona.id === currentPersonaId}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border-subtle/30 bg-deep/40 hover:bg-raised/40 hover:border-border-visible/50 transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PersonaIcon personaId={persona.id} size={16} />
                <span className="text-xs text-ink-secondary group-hover:text-ink-primary transition-colors">
                  {persona.label}
                </span>
                <span className="ml-auto text-[10px] text-ink-ghost">
                  Select
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No participants and no available personas */}
      {otherParticipants.length === 0 && availablePersonas.length === 0 && (
        <div className="text-center py-6">
          <Users size={24} className="mx-auto text-ink-ghost mb-2" />
          <p className="text-xs text-ink-muted">
            You&apos;re the only one here. Share this session for multi-user collaboration.
          </p>
        </div>
      )}
    </div>
  );
}
