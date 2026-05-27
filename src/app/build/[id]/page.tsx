"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Ticket } from "@/lib/types";
import { seedData, getTicket, completeBuild } from "@/lib/store";
import { getBuildReadiness, generateBuildSummary } from "@/lib/consensus-threshold";
import { BuildReport as BuildReportComponent } from "@/components/BuildReport";
import { ArrowLeft, Clock, CheckCircle2, RefreshCw, Rocket, FileText } from "lucide-react";
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

  const handleCompleteBuild = () => {
    if (!ticket) return;
    completeBuild(ticket.id);
    loadTicket();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-800 rounded w-1/3" />
        <div className="h-4 bg-gray-800 rounded w-2/3" />
        <div className="h-64 bg-gray-800 rounded" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <h3 className="text-lg font-medium text-gray-400 mb-2">
          Ticket not found
        </h3>
        <Link href="/" className="btn-secondary inline-flex mt-4">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const readiness = getBuildReadiness(ticket);
  const report = ticket.buildReport;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href={`/ticket/${ticket.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Ticket {ticket.id}
      </Link>

      {/* Build Header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono text-gray-500">{ticket.id}</span>
              <span
                className={`badge ${
                  ticket.status === "building"
                    ? "bg-blue-900/50 text-blue-400"
                    : ticket.status === "done"
                      ? "bg-emerald-900/50 text-emerald-400"
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
            <h1 className="text-2xl font-bold text-white mb-2">
              Build: {ticket.title}
            </h1>
            <p className="text-gray-400">{ticket.description}</p>
          </div>
          <div className="flex flex-col gap-2">
            {ticket.status === "building" && (
              <button onClick={handleCompleteBuild} className="btn-primary">
                <CheckCircle2 size={16} />
                Mark Complete
              </button>
            )}
            <Link href={`/ticket/${ticket.id}`} className="btn-secondary">
              <FileText size={16} />
              View Ticket
            </Link>
          </div>
        </div>
      </div>

      {/* Build Report */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Rocket size={18} className="text-brand-400" />
          <h2 className="text-lg font-semibold text-white">Build Report</h2>
        </div>
        {report ? (
          <BuildReportComponent report={report} />
        ) : (
          <div className="text-center py-8">
            <Rocket size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No build report generated yet.</p>
            <p className="text-sm text-gray-600 mt-1">
              Trigger a build from the ticket page when consensus is reached.
            </p>
          </div>
        )}
      </div>

      {/* Consensus Context */}
      <div className="card mb-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <RefreshCw size={14} className="text-gray-400" />
          Consensus Context
        </h3>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
            {summary}
          </pre>
        </div>
      </div>
    </div>
  );
}
