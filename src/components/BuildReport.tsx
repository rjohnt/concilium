"use client";

import { BuildReport as BuildReportType } from "@/lib/types";
import { CheckCircle2, Clock, XCircle, Wrench, Palette, FlaskConical, FileText } from "lucide-react";

interface BuildReportProps {
  report: BuildReportType;
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  building: { icon: Clock, color: "text-yellow-400 bg-yellow-900/30", label: "Building" },
  completed: { icon: CheckCircle2, color: "text-emerald-400 bg-emerald-900/30", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-400 bg-red-900/30", label: "Failed" },
};

export function BuildReport({ report }: BuildReportProps) {
  const status = statusConfig[report.status] || statusConfig.building;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-gray-500">{report.id}</span>
            <span className={`badge ${status.color}`}>
              <StatusIcon size={12} />
              {status.label}
            </span>
            <span className="text-xs text-gray-500">
              Ticket {report.ticketId}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Generated {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Consensus Summary */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-300">Consensus Summary</h3>
        </div>
        <p className="text-sm text-gray-400">{report.consensusSummary}</p>
      </div>

      {/* Requirements */}
      <ReportSection
        icon={<Wrench size={16} className="text-blue-400" />}
        title="Technical Requirements"
        items={report.requirements}
        emptyText="No technical requirements extracted."
      />

      {/* Design Decisions */}
      <ReportSection
        icon={<Palette size={16} className="text-purple-400" />}
        title="Design Decisions"
        items={report.designDecisions}
        emptyText="No design decisions documented."
      />

      {/* QA Criteria */}
      <ReportSection
        icon={<FlaskConical size={16} className="text-amber-400" />}
        title="QA Criteria"
        items={report.qaCriteria}
        emptyText="No QA criteria specified."
      />

      {/* Implementation Plan */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-gray-300">Implementation Plan</h3>
        </div>
        <div className="text-sm text-gray-400 whitespace-pre-wrap">
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
    <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
              <span className="text-brand-400 mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600 italic">{emptyText}</p>
      )}
    </div>
  );
}
