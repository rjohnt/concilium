"use client";

import { BuildReport as BuildReportType } from "@/lib/types";
import { getPersona } from "@/lib/personas";
import { CheckCircle2, Clock, XCircle, Wrench, Palette, FlaskConical, FileText } from "lucide-react";

interface BuildReportProps {
  report: BuildReportType;
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  building: { icon: Clock, color: "text-blue-steel bg-blue-steel/10 border border-blue-steel/30", label: "Building" },
  completed: { icon: CheckCircle2, color: "text-olive bg-olive/10 border border-olive/30", label: "Completed" },
  failed: { icon: XCircle, color: "text-cardinal bg-cardinal/10 border border-cardinal/30", label: "Failed" },
};

export function BuildReport({ report }: BuildReportProps) {
  const status = statusConfig[report.status] || statusConfig.building;
  const StatusIcon = status.icon;

  const engineerIconColor = getPersona("engineer").iconColor;
  const designerIconColor = getPersona("designer").iconColor;
  const qaIconColor = getPersona("qa").iconColor;
  const poIconColor = getPersona("product-owner").iconColor;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-ink-muted">{report.id}</span>
            <span className={`badge ${status.color}`}>
              <StatusIcon size={12} />
              {status.label}
            </span>
            <span className="text-xs text-ink-muted">
              Ticket {report.ticketId}
            </span>
          </div>
          <p className="text-xs text-ink-muted">
            Generated {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Consensus Summary */}
      <div className="bg-elevated/40 border border-border-subtle rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={16} className="text-ink-muted" />
          <h3 className="text-sm font-semibold text-ink-primary">Consensus Summary</h3>
        </div>
        <p className="text-sm text-ink-secondary">{report.consensusSummary}</p>
      </div>

      {/* Requirements */}
      <ReportSection
        icon={<Wrench size={16} className={engineerIconColor} />}
        title="Technical Requirements"
        items={report.requirements}
        emptyText="No technical requirements extracted."
      />

      {/* Design Decisions */}
      <ReportSection
        icon={<Palette size={16} className={designerIconColor} />}
        title="Design Decisions"
        items={report.designDecisions}
        emptyText="No design decisions documented."
      />

      {/* QA Criteria */}
      <ReportSection
        icon={<FlaskConical size={16} className={qaIconColor} />}
        title="QA Criteria"
        items={report.qaCriteria}
        emptyText="No QA criteria specified."
      />

      {/* Implementation Plan */}
      <div className="bg-elevated/40 border border-border-subtle rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className={poIconColor} />
          <h3 className="text-sm font-semibold text-ink-primary">Implementation Plan</h3>
        </div>
        <div className="text-sm text-ink-secondary whitespace-pre-wrap">
          {report.implementationPlan}
        </div>
      </div>
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
