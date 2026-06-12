"use client";

import { useState, useRef } from "react";
import { Ticket } from "@/lib/types";
import { getBuildReadiness, generateBuildSummary, DEFAULT_THRESHOLD } from "@/lib/consensus-threshold";
import { generateAgentPrompt } from "@/lib/agent-prompt";
import { triggerBuild } from "@/lib/store";
import { getAllPersonas } from "@/lib/personas";
import { AlertTriangle, CheckCircle2, Clock, Play, Rocket, X, XCircle, FileText, Wrench, Palette, FlaskConical, CheckCircle, ArrowRight, Loader2, RefreshCw, Copy, Check } from "lucide-react";
import { useToast } from "@/components/Toast";

interface BuildTriggerProps {
  ticket: Ticket;
  onBuildTriggered: () => void;
}

export function BuildTrigger({ ticket, onBuildTriggered }: BuildTriggerProps) {
  const [showModal, setShowModal] = useState(false);
  const [summary, setSummary] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const { addToast } = useToast();
  const toastFiredRef = useRef<{ start: boolean; complete: boolean; error: boolean }>({
    start: false,
    complete: false,
    error: false,
  });

  const readiness = getBuildReadiness(ticket);
  const scoreColor =
    readiness.score >= 90
      ? "text-[var(--success-500)]"
      : readiness.score >= 50
        ? "text-[color-mix(in_oklab,var(--warning-500)_72%,black)]"
        : "text-[var(--danger-500)]";

  const handleShowSummary = () => {
    const s = generateBuildSummary(ticket);
    setSummary(s);
    setPromptCopied(false);
    setShowModal(true);
  };

  const handleCopyPrompt = () => {
    const prompt = generateAgentPrompt(ticket);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(prompt).then(
        () => {
          setPromptCopied(true);
          setTimeout(() => setPromptCopied(false), 2000);
          addToast({
            variant: "success",
            title: "Agent prompt copied",
            description: "Paste the council-refined spec into your coding agent.",
          });
        },
        () => addToast({ variant: "error", title: "Couldn't copy prompt" })
      );
    }
  };

  const handleTriggerBuild = async () => {
    setShowModal(false);
    setIsBuilding(true);
    setBuildError(null);
    // Info toast on build start
    if (!toastFiredRef.current.start) {
      toastFiredRef.current.start = true;
      toastFiredRef.current.complete = false;
      toastFiredRef.current.error = false;
      addToast({
        variant: "info",
        title: "Build started",
        description: `Build triggered for "${ticket.title}".`,
      });
    }
    try {
      const report = await triggerBuild(ticket.id);
      if (report) {
        // Success toast
        if (!toastFiredRef.current.complete) {
          toastFiredRef.current.complete = true;
          addToast({
            variant: "success",
            title: "Build complete",
            description: `"${ticket.title}" built successfully.`,
          });
        }
        onBuildTriggered();
      } else {
        // Error toast
        if (!toastFiredRef.current.error) {
          toastFiredRef.current.error = true;
          addToast({
            variant: "error",
            title: "Build failed",
            description: "The API may be unavailable or the ticket is not ready.",
          });
        }
        setBuildError("Build failed. The API may be unavailable or the ticket is not ready.");
      }
    } catch (err) {
      // Error toast
      if (!toastFiredRef.current.error) {
        toastFiredRef.current.error = true;
        addToast({
          variant: "error",
          title: "Build failed",
          description: err instanceof Error ? err.message : "An unexpected error occurred.",
        });
      }
      setBuildError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsBuilding(false);
    }
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
                  <span className="mt-0.5"><AlertTriangle size={12} /></span>
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
                  <span className="text-gold mt-0.5"><ArrowRight size={12} /></span>
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

      {/* Loading banner */}
      {isBuilding && (
        <div className="card mt-4 border border-[color-mix(in_oklab,var(--warning-500)_28%,transparent)] bg-[var(--warning-100)]">
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-[color-mix(in_oklab,var(--warning-500)_78%,black)]" />
            <div>
              <p className="text-sm font-medium text-[color-mix(in_oklab,var(--warning-500)_72%,black)]">Build in progress...</p>
              <p className="text-xs text-[color-mix(in_oklab,color-mix(in_oklab,var(--warning-500)_72%,black)_70%,transparent)]">
                The build has been triggered. The report will appear shortly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {buildError && (
        <div className="card mt-4 border border-cardinal/50 bg-cardinal/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <XCircle size={18} className="text-cardinal flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-cardinal">Build failed</p>
                <p className="text-xs text-cardinal/70">{buildError}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setBuildError(null);
                setIsBuilding(true);
                handleTriggerBuild();
              }}
              className="btn-secondary text-xs flex-shrink-0"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        </div>
      )}

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
                  engineer: <Wrench size={14} className="text-[var(--persona-eng-500)]" />,
                  designer: <Palette size={14} className="text-[var(--persona-des-500)]" />,
                  qa: <FlaskConical size={14} className="text-[var(--persona-res-500)]" />,
                  "product-owner": <FileText size={14} className="text-[var(--persona-prod-500)]" />,
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
                        {approved ? <span className="flex items-center gap-1"><CheckCircle size={12} className="text-olive" /> Approved</span> : <span className="flex items-center gap-1"><Clock size={12} className="text-gold" /> Pending</span>}
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
                onClick={handleCopyPrompt}
                className="btn-secondary"
                title="Copy the council-refined spec as a prompt for your coding agent"
              >
                {promptCopied ? (
                  <>
                    <Check size={16} className="text-[var(--success-500)]" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy agent prompt
                  </>
                )}
              </button>
              <button
                onClick={handleTriggerBuild}
                disabled={!readiness.ready || isBuilding}
                className="btn-primary flex-1 justify-center"
              >
                {isBuilding ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Building...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Trigger Build
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
