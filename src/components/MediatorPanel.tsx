"use client";

import { useState } from "react";
import { Scale, Sparkles, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Ticket, PersonaId } from "@/lib/types";
import { getPersona } from "@/lib/personas";
import { PersonaIcon } from "./PersonaIcon";
import type { FacilitatorReport } from "@/lib/mediator-persona";

/**
 * The Mediator: a facilitator agent that reads the whole session and surfaces
 * conflicts, compromises, gaps, and the next action.
 */
export function MediatorPanel({ ticket }: { ticket: Ticket }) {
  const [report, setReport] = useState<FacilitatorReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConvene = async () => {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/mediator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Mediator request failed (${response.status})`);
      }
      const data = await response.json();
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mediator request failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-4 rounded-lg bg-elevated/40 border border-border-subtle">
      <div className="flex items-center gap-2 mb-2">
        <Scale size={14} className="text-gold" />
        <h3 className="text-sm font-semibold text-ink-primary">Mediator</h3>
      </div>

      {!report && (
        <p className="text-xs text-ink-muted leading-relaxed mb-3">
          The Mediator reads every stakeholder&apos;s feedback, surfaces real
          disagreements, and proposes the next move.
        </p>
      )}

      {report && (
        <div className="space-y-3 mb-3">
          <p className="text-xs text-ink-secondary leading-relaxed">{report.summary}</p>

          {report.conflicts.length > 0 && (
            <div className="space-y-2">
              {report.conflicts.map((conflict, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-deep border border-cardinal/30">
                  <div className="flex items-center gap-1.5 mb-1">
                    {conflict.personas.map((pid: PersonaId) => (
                      <PersonaIcon key={pid} personaId={pid} size={13} />
                    ))}
                    <span className="text-[11px] font-semibold text-cardinal">{conflict.topic}</span>
                  </div>
                  <p className="text-[11px] text-ink-secondary leading-relaxed mb-1">
                    {conflict.description}
                  </p>
                  <p className="text-[11px] text-olive leading-relaxed">
                    <span className="font-semibold">Compromise:</span> {conflict.suggestedCompromise}
                  </p>
                </div>
              ))}
            </div>
          )}

          {report.gaps.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-ink-muted mb-1">Nobody has addressed:</p>
              <ul className="space-y-0.5">
                {report.gaps.map((gap, i) => (
                  <li key={i} className="text-[11px] text-ink-secondary leading-relaxed">
                    • {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-2.5 rounded-lg bg-gold/10 border border-gold/25">
            <p className="text-[11px] text-gold leading-relaxed flex items-start gap-1.5">
              {report.readyToBuild ? (
                <CheckCircle2 size={13} className="flex-shrink-0 mt-px" />
              ) : (
                <ArrowRight size={13} className="flex-shrink-0 mt-px" />
              )}
              <span>
                {report.nextAction}
                {report.suggestedNextPersona && (
                  <>
                    {" — "}
                    {getPersona(report.suggestedNextPersona)?.label} should weigh in next.
                  </>
                )}
              </span>
            </p>
          </div>
        </div>
      )}

      <button
        onClick={handleConvene}
        disabled={running}
        className="btn-secondary text-xs w-full justify-center disabled:opacity-50"
      >
        {running ? (
          <>
            <span className="animate-spin inline-flex"><Sparkles size={13} /></span>
            Mediating...
          </>
        ) : (
          <>
            <Scale size={13} />
            {report ? "Convene again" : "Convene the Mediator"}
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
