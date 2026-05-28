"use client";

import { useState, useMemo } from "react";
import { FeedbackEntry, PersonaId } from "@/lib/types";
import { DiffView } from "./DiffView";
import { Clock, GitBranch, CheckCircle, XCircle } from "lucide-react";

interface VersionHistoryProps {
  ticketId: string;
  personaId: PersonaId;
  feedback: FeedbackEntry[];
  onClose: () => void;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function VersionHistory({ personaId, feedback, onClose }: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  // Filter and sort feedback for this persona by version
  const versions = useMemo(() => {
    return feedback
      .filter((f) => f.personaId === personaId)
      .sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
  }, [feedback, personaId]);

  if (versions.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-ink-muted">No versions available.</p>
        <button onClick={onClose} className="mt-2 text-xs text-gold hover:text-gold-light">
          Back to feedback
        </button>
      </div>
    );
  }

  const latest = versions[0];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-gold" />
          <span className="text-sm font-semibold text-ink-primary">Version History</span>
          <span className="text-xs text-ink-muted">({versions.length} {versions.length === 1 ? "version" : "versions"})</span>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-ink-muted hover:text-ink-primary transition-colors"
        >
          Back to feedback
        </button>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {versions.map((entry, idx) => {
          const versionNum = entry.version ?? versions.length - idx;
          const isLatest = idx === 0;
          const isSelected = selectedVersion === versionNum;
          const prevEntry = versions.find((f) => (f.version ?? 0) === versionNum - 1);

          return (
            <div key={entry.id} className="card !p-3 cursor-pointer hover:border-gold/30 transition-colors"
              onClick={() => setSelectedVersion(isSelected ? null : versionNum)}
            >
              {/* Version header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-bold ${isLatest ? "text-gold" : "text-ink-muted"}`}>
                    v{versionNum}
                  </span>
                  {isLatest && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gold/20 text-gold">
                      Latest
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-ink-muted flex items-center gap-1">
                    <Clock size={10} />
                    {formatRelative(entry.createdAt)}
                  </span>
                  {entry.approved ? (
                    <CheckCircle size={12} className="text-olive" />
                  ) : (
                    <XCircle size={12} className="text-cardinal" />
                  )}
                </div>
              </div>

              {/* Content preview (collapsed) */}
              {!isSelected && (
                <p className="text-xs text-ink-secondary line-clamp-2">{entry.content}</p>
              )}

              {/* Diff view (expanded) */}
              {isSelected && (
                <div className="mt-2 space-y-2">
                  {prevEntry ? (
                    <DiffView oldText={prevEntry.content} newText={entry.content} />
                  ) : (
                    <div className="p-3 rounded-lg bg-elevated border border-border-subtle">
                      <p className="text-xs text-ink-muted italic mb-1">Initial version — no previous to compare</p>
                      <p className="text-xs text-ink-secondary whitespace-pre-wrap">{entry.content}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
