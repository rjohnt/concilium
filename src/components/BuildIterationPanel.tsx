"use client";

import { useState } from "react";
import {
  FileCode2,
  GitPullRequestArrow,
  Hammer,
  MessageSquarePlus,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Ticket, PersonaId, BuildArtifact } from "@/lib/types";
import { getAllPersonas, getPersona } from "@/lib/personas";
import { requestBuildChanges, rebuildWithChanges, getOpenChangeRequests } from "@/lib/store";
import { PersonaIcon } from "./PersonaIcon";
import { formatRelativeTime } from "@/lib/timeAgo";

const ARTIFACT_ICONS: Record<BuildArtifact["type"], typeof FileCode2> = {
  log: FileCode2,
  diff: GitPullRequestArrow,
  "file-list": FileCode2,
  screenshot: FileCode2,
  report: FileCode2,
};

/**
 * The build review loop: inspect what the executor produced (artifacts),
 * file role-scoped change requests, and re-kick the build with them as
 * delta context.
 */
export function BuildIterationPanel({
  ticket,
  activePersona,
  onUpdated,
}: {
  ticket: Ticket;
  activePersona: PersonaId | null;
  onUpdated?: () => void;
}) {
  const [personaId, setPersonaId] = useState<PersonaId>(activePersona ?? "engineer");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const report = ticket.buildReport;
  if (!report || report.status === "building") return null;

  const artifacts = report.artifacts ?? [];
  const openRequests = getOpenChangeRequests(ticket.id);
  const resolvedRequests = (report.changeRequests ?? []).filter((cr) => cr.resolvedByBuildId);

  const handleSubmitRequest = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await requestBuildChanges(ticket.id, personaId, content.trim());
      if (!result) throw new Error("Could not file the change request.");
      setContent("");
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not file the change request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRebuild = async () => {
    setRebuilding(true);
    setError(null);
    try {
      const result = await rebuildWithChanges(ticket.id);
      if (!result) throw new Error("Rebuild failed — the previous build was restored.");
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rebuild failed.");
      onUpdated?.();
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <div className="card p-5 space-y-4" data-testid="build-iteration-panel">
      <div className="flex items-center gap-2">
        <Hammer size={15} className="text-gold" />
        <h3 className="text-sm font-semibold text-ink-primary">Build Review</h3>
        <span className="text-xs text-ink-muted">
          {report.executor ? `executor: ${report.executor}` : null}
        </span>
      </div>

      {/* Artifacts */}
      {artifacts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink-muted">Artifacts</p>
          {artifacts.map((art) => {
            const Icon = ARTIFACT_ICONS[art.type] ?? FileCode2;
            return (
              <details key={art.id} className="rounded-lg bg-deep border border-border-subtle">
                <summary className="flex items-center gap-2 px-3 py-2 text-xs text-ink-secondary cursor-pointer select-none">
                  <Icon size={13} className="text-blue-steel" />
                  {art.label}
                  <span className="ml-auto text-ink-ghost">{formatRelativeTime(art.createdAt)}</span>
                </summary>
                <pre className="px-3 pb-3 text-[11px] text-ink-muted font-mono whitespace-pre-wrap break-words max-h-80 overflow-y-auto">
                  {art.content}
                </pre>
              </details>
            );
          })}
        </div>
      )}

      {/* Open change requests */}
      {openRequests.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink-muted">
            Open change requests ({openRequests.length})
          </p>
          {openRequests.map((cr) => (
            <div key={cr.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-elevated/50 border border-border-subtle">
              <PersonaIcon personaId={cr.personaId} size={14} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-ink-secondary">
                  {getPersona(cr.personaId)?.label}
                  <span className="ml-2 font-normal text-ink-ghost">{formatRelativeTime(cr.createdAt)}</span>
                </p>
                <p className="text-xs text-ink-secondary leading-relaxed">{cr.content}</p>
              </div>
            </div>
          ))}
          <button
            onClick={handleRebuild}
            disabled={rebuilding}
            className="btn-primary text-xs w-full justify-center disabled:opacity-50"
          >
            {rebuilding ? (
              <>
                <span className="animate-spin inline-flex"><Sparkles size={13} /></span>
                Rebuilding with change requests...
              </>
            ) : (
              <>
                <Hammer size={13} />
                Rebuild with {openRequests.length} change request{openRequests.length === 1 ? "" : "s"}
              </>
            )}
          </button>
        </div>
      )}

      {resolvedRequests.length > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-olive">
          <CheckCircle2 size={12} />
          {resolvedRequests.length} earlier change request{resolvedRequests.length === 1 ? "" : "s"} addressed by this build.
        </p>
      )}

      {/* Request changes form */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-ink-muted flex items-center gap-1.5">
          <MessageSquarePlus size={13} />
          Request changes
        </p>
        <div className="flex flex-wrap gap-1.5">
          {getAllPersonas().map((p) => (
            <button
              key={p.id}
              onClick={() => setPersonaId(p.id)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-medium transition-colors ${
                personaId === p.id
                  ? "bg-gold/15 border-gold/40 text-gold"
                  : "bg-elevated border-border-subtle text-ink-muted hover:text-ink-secondary"
              }`}
            >
              <PersonaIcon personaId={p.id} size={12} />
              {p.label}
            </button>
          ))}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`What should the next build round change, from the ${getPersona(personaId)?.label} perspective?`}
          rows={3}
          className="w-full rounded-lg bg-deep border border-border-subtle px-3 py-2 text-xs text-ink-primary placeholder:text-ink-ghost focus:outline-none focus:border-gold/50 resize-y"
        />
        <button
          onClick={handleSubmitRequest}
          disabled={submitting || !content.trim()}
          className="btn-secondary text-xs disabled:opacity-50"
        >
          {submitting ? "Filing..." : "File change request"}
        </button>
      </div>

      {error && (
        <p className="flex items-center gap-1 text-xs text-cardinal">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}
