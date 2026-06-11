"use client";

import { useMemo, useState } from "react";
import { Bot, Sparkles, AlertCircle } from "lucide-react";
import { Ticket, PersonaId, FeedbackEntry } from "@/lib/types";
import { getAllPersonas } from "@/lib/personas";
import { importServerFeedback } from "@/lib/store";
import { PersonaIcon } from "./PersonaIcon";

/**
 * Panel for triggering AI stand-in reviews on seats no human has claimed.
 * Lists the pending stand-ins and asks them all to weigh in with one click.
 */
export function StandinPanel({
  ticket,
  onFeedbackImported,
}: {
  ticket: Ticket;
  onFeedbackImported?: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingStandins = useMemo(() => {
    const spoken = new Set(ticket.feedback.map((f) => f.personaId));
    return getAllPersonas().filter((p) => {
      const seat = ticket.seats?.[p.id];
      const aiHeld = !seat || seat.occupant === "ai";
      return aiHeld && !spoken.has(p.id);
    });
  }, [ticket]);

  if (pendingStandins.length === 0) return null;

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/standin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Stand-in request failed (${response.status})`);
      }
      const data = await response.json();
      const entries: FeedbackEntry[] = (data.results ?? []).map(
        (r: { entry: FeedbackEntry }) => r.entry
      );
      importServerFeedback(ticket.id, entries);
      onFeedbackImported?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stand-in request failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-4 rounded-lg bg-elevated/40 border border-border-subtle">
      <div className="flex items-center gap-2 mb-2">
        <Bot size={14} className="text-blue-steel" />
        <h3 className="text-sm font-semibold text-ink-primary">AI Stand-ins</h3>
      </div>
      <p className="text-xs text-ink-muted leading-relaxed mb-3">
        {pendingStandins.length} unclaimed seat{pendingStandins.length === 1 ? " hasn't" : "s haven't"} weighed
        in yet. Their AI stand-ins can review the ticket now.
      </p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {pendingStandins.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-steel/15 border border-blue-steel/30 text-blue-steel text-[10px] font-medium"
          >
            <PersonaIcon personaId={p.id as PersonaId} size={11} />
            {p.label}
          </span>
        ))}
      </div>
      <button
        onClick={handleRun}
        disabled={running}
        className="btn-secondary text-xs w-full justify-center disabled:opacity-50"
      >
        {running ? (
          <>
            <span className="animate-spin inline-flex"><Sparkles size={13} /></span>
            Stand-ins reviewing...
          </>
        ) : (
          <>
            <Bot size={13} />
            Ask stand-ins to weigh in
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 flex items-center gap-1 text-xs text-cardinal">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}
