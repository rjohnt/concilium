"use client";

import { useState } from "react";
import { Ticket } from "@/lib/types";
import { getBuildReadiness, generateBuildSummary, DEFAULT_THRESHOLD } from "@/lib/consensus-threshold";
import { triggerBuild } from "@/lib/store";
import { getAllPersonas } from "@/lib/personas";
import { AlertTriangle, CheckCircle2, Clock, Play, Rocket, X, FileText, Wrench, Palette, FlaskConical } from "lucide-react";

interface BuildTriggerProps {
  ticket: Ticket;
  onBuildTriggered: () => void;
}

export function BuildTrigger({ ticket, onBuildTriggered }: BuildTriggerProps) {
  const [showModal, setShowModal] = useState(false);
  const [summary, setSummary] = useState("");

  const readiness = getBuildReadiness(ticket);
  const scoreColor =
    readiness.score >= 90
      ? "text-emerald-400"
      : readiness.score >= 50
        ? "text-yellow-400"
        : "text-red-400";

  const handleShowSummary = () => {
    const s = generateBuildSummary(ticket);
    setSummary(s);
    setShowModal(true);
  };

  const handleTriggerBuild = () => {
    const report = triggerBuild(ticket.id);
    if (report) {
      onBuildTriggered();
    }
    setShowModal(false);
  };

  // Already building or done
  if (ticket.status === "building" || ticket.status === "done") {
    return (
      <div className="card">
        <div className="flex items-center gap-3">
          {ticket.status === "building" ? (
            <Clock size={20} className="text-blue-steel" />
          ) : (
            <CheckCircle2 size={20} className="text-olive" />
          )}
          <div>
            <h3 className="text-sm font-semibold text-ink-primary">
              {ticket.status === "building" ? "Build In Progress" : "Build Complete"}
            </h3>
            <p className="text-xs text-ink-muted">
              {ticket.status === "building"
                ? "The build has been triggered and is in progress."
                : "This ticket has been built successfully."}
            </p>
          </div>
          {ticket.buildReport && (
            <a
              href={`/build/${ticket.id}`}
              className="btn-ghost ml-auto text-xs"
            >
              <FileText size={14} />
              View Report
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        {/* Build Readiness Score */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
            <Rocket size={16} className="text-gold" />
            Build Readiness
          </h3>
          <span
            className={`text-2xl font-bold ${scoreColor}`}
          >
            {readiness.score}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-elevated rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(readiness.score, 100)}%`,
              background:
                readiness.score >= 90
                  ? "linear-gradient(90deg, #6b8f5e, #8fbf7a)"
                  : readiness.score >= 50
                    ? "linear-gradient(90deg, #c9a84c, #e0c86a)"
                    : "linear-gradient(90deg, #b84545, #d96b6b)",
            }}
          />
        </div>

        {/* Threshold indicator */}
        <p className="text-xs text-ink-muted mb-4">
          Threshold: {Math.round(DEFAULT_THRESHOLD * 100)}% of personas must approve
        </p>

        {/* Blockers */}
        {readiness.blockers.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-medium text-ink-secondary mb-2 flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-cardinal" />
              Blockers
            </h4>
            <ul className="space-y-1.5">
              {readiness.blockers.map((blocker, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-cardinal/80"
                >
                  <span className="mt-0.5">⚠</span>
                  <span>{blocker}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Steps */}
        {readiness.nextSteps.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-medium text-ink-secondary mb-2">Next Steps</h4>
            <ul className="space-y-1">
              {readiness.nextSteps.map((step, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-ink-muted"
                >
                  <span className="text-gold mt-0.5">→</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Button */}
        {readiness.ready ? (
          <button
            onClick={handleShowSummary}
            className="btn-primary w-full justify-center"
          >
            <Rocket size={16} />
            Ready to Build!
          </button>
        ) : (
          <button
            onClick={handleShowSummary}
            disabled={readiness.score < 50}
            className="btn-secondary w-full justify-center"
          >
            <FileText size={16} />
            View Build Summary
          </button>
        )}
      </div>

      {/* Build Summary Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep/70 backdrop-blur-sm">
          <div className="bg-raised border border-border-visible rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-raised border-b border-border-subtle px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h2 className="text-lg font-semibold text-ink-primary">Build Summary</h2>
                <p className="text-xs text-ink-muted">Review before triggering the build</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-overlay transition-colors"
              >
                <X size={18} className="text-ink-muted" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Summary sections by persona */}
              {getAllPersonas().map((persona) => {
                const personaId = persona.id;
                const personaFeedback = ticket.feedback.filter(
                  (f) => f.personaId === personaId
                );
                const approved = ticket.approvals.includes(personaId);
                const sectionIcons: Record<string, React.ReactNode> = {
                  engineer: <Wrench size={14} className="text-blue-400" />,
                  designer: <Palette size={14} className="text-purple-400" />,
                  qa: <FlaskConical size={14} className="text-amber-400" />,
                  "product-owner": <FileText size={14} className="text-emerald-400" />,
                };

                return (
                  <div
                    key={personaId}
                    className="bg-elevated/50 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {sectionIcons[personaId]}
                      <h4 className="text-sm font-medium text-ink-primary">
                        {persona.label}
                      </h4>
                      <span
                        className={`text-xs ml-auto ${
                          approved ? "text-olive" : "text-gold"
                        }`}
                      >
                        {approved ? "✅ Approved" : "⏳ Pending"}
                      </span>
                    </div>
                    {personaFeedback.length > 0 ? (
                      <ul className="space-y-1">
                        {personaFeedback.map((entry) => (
                          <li key={entry.id} className="text-xs text-ink-muted pl-4 border-l border-border-visible">
                            {entry.content.split(".")[0]}.
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-ink-muted italic">No feedback provided</p>
                    )}
                  </div>
                );
              })}

              {/* Consensus Info */}
              <div className="bg-gold/10 border border-gold/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-gold-light">
                  <CheckCircle2 size={14} />
                  <span className="font-medium">
                    {ticket.approvals.length} of {getAllPersonas().length} personas approved
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-raised border-t border-border-subtle px-6 py-4 rounded-b-xl flex items-center gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerBuild}
                disabled={!readiness.ready}
                className="btn-primary flex-1 justify-center"
              >
                <>
                  <Play size={16} />
                  Trigger Build
                </>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
