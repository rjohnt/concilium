"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Ticket } from "@/lib/types";
import { seedData, getTicket } from "@/lib/store";
import { getBuildReadiness, generateBuildSummary } from "@/lib/consensus-threshold";
import { BuildReport as BuildReportComponent } from "@/components/BuildReport";
import { BuildCompleteCelebration } from "@/components/BuildCompleteCelebration";
import { EmptyState } from "@/components/EmptyState";
import { Clock, CheckCircle2, RefreshCw, Rocket, FileText, FileQuestion } from "lucide-react";
import Link from "next/link";

export default function BuildPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState("");

  const loadTicket = useCallback(() => {
    seedData();
    const t = getTicket(params.id as string);
    setTicket(t || null);
    if (t) {
      setSummary(generateBuildSummary(t));
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Poll every 1s while building to reflect auto-transitions and build progress
  useEffect(() => {
    if (!ticket || ticket.status !== "building") return;
    const interval = setInterval(() => {
      seedData();
      const t = getTicket(params.id as string);
      if (t && t.status !== ticket.status) {
        setTicket(t);
        setSummary(generateBuildSummary(t));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [ticket, params.id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-elevated rounded w-1/3" />
        <div className="h-4 bg-elevated rounded w-2/3" />
        <div className="h-64 bg-elevated rounded" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-4xl mx-auto py-16">
        <EmptyState
          icon={FileQuestion}
          title="Ticket not found"
          description="This ticket may have been deleted or the link is invalid."
          action={{ label: "Back to Dashboard", href: "/" }}
        />
      </div>
    );
  }

  const readiness = getBuildReadiness(ticket);
  const report = ticket.buildReport;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Build Header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono text-ink-muted">{ticket.id}</span>
              <span
                className={`badge ${
                  ticket.status === "building"
                    ? "bg-blue-900/50 text-blue-400"
                    : ticket.status === "done"
                      ? "bg-olive/20 text-olive"
                      : "bg-yellow-900/50 text-yellow-400"
                }`}
              >
                {ticket.status === "building" ? (
                  <Clock size={12} />
                ) : ticket.status === "done" ? (
                  <CheckCircle2 size={12} />
                ) : (
                  <Clock size={12} />
                )}
                {ticket.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-ink-primary mb-2">
              {ticket.status === "done" ? "✓ " : ""}Build: {ticket.title}
            </h1>
            <p className="text-ink-secondary">{ticket.description}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href={`/ticket/${ticket.id}`} className="btn-secondary">
              <FileText size={16} />
              View Ticket
            </Link>
          </div>
        </div>
      </div>

      {/* Build Complete Celebration */}
      {ticket.status === "done" && (
        <div className="mb-6">
          <BuildCompleteCelebration
            ticketId={ticket.id}
            ticketTitle={ticket.title}
          />
        </div>
      )}

      {/* Build Report */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Rocket size={18} className="text-gold" />
          <h2 className="text-lg font-semibold text-ink-primary">Build Report</h2>
        </div>
        {report ? (
          <BuildReportComponent report={report} />
        ) : (
          <EmptyState
            icon={Rocket}
            title="No build report generated yet"
            description="Trigger a build from the ticket page when consensus is reached."
            className="bg-transparent border-0 py-8"
          />
        )}
      </div>

      {/* Consensus Context */}
      <div className="card mb-6">
        <h3 className="text-sm font-semibold text-ink-secondary mb-4 flex items-center gap-2">
          <RefreshCw size={14} className="text-ink-muted" />
          Consensus Context
        </h3>
        <div className="bg-elevated/50 rounded-lg p-4">
          <pre className="text-xs text-ink-muted whitespace-pre-wrap font-mono leading-relaxed">
            {summary}
          </pre>
        </div>
      </div>
    </div>
  );
}
