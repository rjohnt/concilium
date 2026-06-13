"use client";

import { BuildReport as BuildReportType, TicketStatus } from "@/lib/types";
import { CheckCircle2, Clock, XCircle, Wrench, Palette, FlaskConical, FileText, GitPullRequestArrow } from "lucide-react";
import { BuildRetryCard } from "@/components/BuildRetryCard";

// Matches PULL_REQUEST_ARTIFACT_LABEL in @/lib/github/build-pr (kept as a
// literal here so the client bundle doesn't pull in Octokit).
const PULL_REQUEST_ARTIFACT_LABEL = "Pull request";

interface BuildReportProps {
  report?: BuildReportType;
  ticketStatus?: TicketStatus;
  buildRetryCount?: number;
  isRetrying?: boolean;
  onRetry?: () => void;
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  building: { icon: Clock, color: "text-blue-steel bg-blue-steel/10 border border-blue-steel/30", label: "Building" },
  completed: { icon: CheckCircle2, color: "text-olive bg-olive/10 border border-olive/30", label: "Completed" },
  failed: { icon: XCircle, color: "text-cardinal bg-cardinal/10 border border-cardinal/30", label: "Failed" },
};

export function BuildReport({
  report,
  ticketStatus,
  buildRetryCount,
  isRetrying = false,
  onRetry,
}: BuildReportProps) {
  // No report + building → show retry card
  if (!report && ticketStatus === "building") {
    return (
      <BuildRetryCard
        buildRetryCount={buildRetryCount}
        isRetrying={isRetrying}
        onRetry={onRetry}
      />
    );
  }

  // No report + not building → empty state
  if (!report) {
    return (
      <div className="text-center py-8">
        <FileText size={32} className="text-ink-muted mx-auto mb-3" />
        <p className="text-sm text-ink-muted">No build report available.</p>
      </div>
    );
  }

  // report is guaranteed non-null from here
  const reportRef = report;
  const status = statusConfig[reportRef.status] || statusConfig.building;
  const StatusIcon = status.icon;
  const pullRequest = reportRef.artifacts?.find(
    (a) => a.type === "report" && a.label === PULL_REQUEST_ARTIFACT_LABEL
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-ink-muted">{reportRef.id}</span>
            <span className={`badge ${status.color}`}>
              <StatusIcon size={12} />
              {status.label}
            </span>
            <span className="text-xs text-ink-muted">
              Ticket {reportRef.ticketId}
            </span>
          </div>
          <p className="text-xs text-ink-muted">
            Generated {new Date(reportRef.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Failed state: show retry card below header */}
      {reportRef.status === "failed" && (
        <BuildRetryCard
          errorMessage={reportRef.errorMessage}
          buildRetryCount={buildRetryCount}
          isRetrying={isRetrying}
          onRetry={onRetry}
        />
      )}

      {reportRef.status !== "failed" && (
        <>
          {/* Pull request */}
          {pullRequest && (
            <a
              href={pullRequest.content}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-elevated/40 border border-border-subtle rounded-lg p-4 text-sm text-gold hover:border-gold/40 transition-colors"
            >
              <GitPullRequestArrow size={16} />
              <span className="font-semibold">Pull request</span>
              <span className="text-ink-muted font-mono text-xs truncate">{pullRequest.content}</span>
            </a>
          )}

          {/* Consensus Summary */}
          <div className="bg-elevated/40 border border-border-subtle rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-ink-muted" />
              <h3 className="text-sm font-semibold text-ink-primary">Consensus Summary</h3>
            </div>
            <p className="text-sm text-ink-secondary">{reportRef.consensusSummary}</p>
          </div>

          {/* Requirements */}
          <ReportSection
            icon={<Wrench size={16} className="text-blue-steel" />}
            title="Technical Requirements"
            items={reportRef.requirements}
            emptyText="No technical requirements extracted."
          />

          {/* Design Decisions */}
          <ReportSection
            icon={<Palette size={16} className="text-[#b48ead]" />}
            title="Design Decisions"
            items={reportRef.designDecisions}
            emptyText="No design decisions documented."
          />

          {/* QA Criteria */}
          <ReportSection
            icon={<FlaskConical size={16} className="text-[#c9a84c]" />}
            title="QA Criteria"
            items={reportRef.qaCriteria}
            emptyText="No QA criteria specified."
          />

          {/* Implementation Plan */}
          <div className="bg-elevated/40 border border-border-subtle rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-olive" />
              <h3 className="text-sm font-semibold text-ink-primary">Implementation Plan</h3>
            </div>
            <div className="text-sm text-ink-secondary whitespace-pre-wrap">
              {reportRef.implementationPlan}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ReportSection({
  icon,
  title,
  items,
  emptyText,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="bg-elevated/40 border border-border-subtle rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-ink-secondary">
              <span className="text-gold mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-ghost italic">{emptyText}</p>
      )}
    </div>
  );
}
