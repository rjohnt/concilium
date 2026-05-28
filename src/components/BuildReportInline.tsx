"use client";

import { useState, useEffect, useCallback } from "react";
import { Ticket } from "@/lib/types";
import { seedData, getTicket } from "@/lib/store";
import { parseMarkdown } from "@/components/MarkdownPreview";
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FileCode2,
  ListChecks,
  Palette,
  FlaskConical,
  FileText,
} from "lucide-react";
import Link from "next/link";

interface BuildReportInlineProps {
  ticket: Ticket;
  onBuildUpdated?: () => void;
}

type SectionKey = "requirements" | "designDecisions" | "qaCriteria";

interface SectionConfig {
  key: SectionKey;
  icon: React.ReactNode;
  label: string;
  items: string[];
  emptyText: string;
}

export function BuildReportInline({ ticket, onBuildUpdated }: BuildReportInlineProps) {
  const report = ticket.buildReport;
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
    requirements: true,
    designDecisions: true,
    qaCriteria: true,
  });

  const toggleSection = (key: SectionKey) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Poll while building to detect status changes
  const pollTicket = useCallback(() => {
    seedData();
    const fresh = getTicket(ticket.id);
    if (fresh && fresh.buildReport?.status !== ticket.buildReport?.status) {
      onBuildUpdated?.();
    }
  }, [ticket.id, ticket.buildReport?.status, onBuildUpdated]);

  useEffect(() => {
    if (!report || report.status !== "building") return;
    const interval = setInterval(pollTicket, 2000);
    return () => clearInterval(interval);
  }, [report, pollTicket]);

  if (!report) return null;

  const statusBadge = getStatusBadge(report.status);
  const sections: SectionConfig[] = [
    {
      key: "requirements",
      icon: <ListChecks size={14} className="text-blue-400" />,
      label: "Requirements",
      items: report.requirements,
      emptyText: "No requirements extracted.",
    },
    {
      key: "designDecisions",
      icon: <Palette size={14} className="text-purple-400" />,
      label: "Design Decisions",
      items: report.designDecisions,
      emptyText: "No design decisions documented.",
    },
    {
      key: "qaCriteria",
      icon: <FlaskConical size={14} className="text-amber-400" />,
      label: "QA Criteria",
      items: report.qaCriteria,
      emptyText: "No QA criteria specified.",
    },
  ];

  return (
    <div className="card">
      {/* Header: ID + Status badge */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-mono text-ink-muted">{report.id}</span>
        <span className={`badge ${statusBadge.color}`}>
          {statusBadge.icon}
          {statusBadge.label}
        </span>
        <Link
          href={`/build/${ticket.id}`}
          className="ml-auto badge inline-flex items-center gap-1 text-xs text-ink-muted hover:text-gold hover:bg-gold/10 transition-colors"
        >
          <ExternalLink size={12} />
          View Full Report
        </Link>
      </div>

      {/* Consensus summary one-liner */}
      <div className="bg-raised/50 border border-border-subtle rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={14} className="text-ink-muted" />
          <span className="text-xs font-medium text-ink-secondary">Consensus Summary</span>
        </div>
        <p className="text-sm text-ink-secondary leading-relaxed line-clamp-2">
          {report.consensusSummary}
        </p>
      </div>

      {/* Collapsible sections */}
      <div className="space-y-2 mb-4">
        {sections.map((section) => (
          <div key={section.key}>
            <button
              onClick={() => toggleSection(section.key)}
              className="w-full flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-lg hover:bg-elevated/50 transition-colors group"
            >
              {collapsed[section.key] ? (
                <ChevronRight size={14} className="text-ink-muted group-hover:text-ink-secondary transition-colors" />
              ) : (
                <ChevronDown size={14} className="text-ink-muted group-hover:text-ink-secondary transition-colors" />
              )}
              {section.icon}
              <span className="text-xs font-medium text-ink-secondary group-hover:text-ink-primary transition-colors">
                {section.label}
              </span>
              <span className="text-xs text-ink-muted ml-auto tabular-nums">
                {section.items.length}
              </span>
            </button>
            {!collapsed[section.key] && (
              <div className="ml-8 mt-1 mb-2">
                {section.items.length > 0 ? (
                  <ul className="space-y-1">
                    {section.items.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs text-ink-secondary"
                      >
                        <span className="text-gold mt-0.5 flex-shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-ink-muted italic">{section.emptyText}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Implementation Plan (rendered markdown) */}
      {report.implementationPlan && (
        <div className="border-t border-border-subtle pt-4">
          <div className="flex items-center gap-2 mb-2">
            <FileCode2 size={14} className="text-emerald-400" />
            <span className="text-xs font-medium text-ink-secondary">Implementation Plan</span>
          </div>
          <div
            className="text-xs text-ink-secondary leading-relaxed prose-muted bg-raised/30 rounded-lg p-3 max-h-48 overflow-y-auto"
            dangerouslySetInnerHTML={{
              __html: parseMarkdown(report.implementationPlan) ||
                '<p class="text-ink-muted italic">No implementation plan generated.</p>',
            }}
          />
        </div>
      )}
    </div>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case "building":
      return {
        icon: <Loader2 size={12} className="animate-spin" />,
        color: "bg-yellow-900/40 text-yellow-400 border-yellow-700/50",
        label: "Building",
      };
    case "completed":
      return {
        icon: <CheckCircle2 size={12} />,
        color: "bg-olive/10 text-olive border-olive/40",
        label: "Completed",
      };
    case "failed":
      return {
        icon: <XCircle size={12} />,
        color: "bg-cardinal/10 text-cardinal border-cardinal/40",
        label: "Failed",
      };
    default:
      return {
        icon: <Loader2 size={12} className="animate-spin" />,
        color: "bg-yellow-900/40 text-yellow-400",
        label: "Building",
      };
  }
}
