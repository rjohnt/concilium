"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Ticket, PersonaId } from "@/lib/types";
import { seedData, getTicket, getConsensusProgress, getSessionEvents } from "@/lib/store";
import { getAllPersonas, getPersona } from "@/lib/personas";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { PersonaBadge } from "@/components/PersonaBadge";
import { JoinSessionModal } from "@/components/JoinSessionModal";
import { SessionTimeline } from "@/components/SessionTimeline";
import { BuildProgress } from "@/components/BuildProgress";
import { ArrowLeft, Clock, GitBranch, RefreshCw, Activity } from "lucide-react";
import Link from "next/link";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  // Session state
  const [sessionPersona, setSessionPersona] = useState<PersonaId | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const loadTicket = useCallback(() => {
    seedData();
    const t = getTicket(params.id as string);
    setTicket(t ? { ...t } : null);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Poll for build state updates
  useEffect(() => {
    if (!ticket || ticket.status !== "building") return;

    const interval = setInterval(() => {
      loadTicket();
    }, 1000);

    return () => clearInterval(interval);
  }, [ticket?.status, loadTicket]);

  // After ticket loads, show the join modal if no session is active
  useEffect(() => {
    if (!loading && ticket && !sessionPersona && !showJoinModal) {
      // Small delay for cinematic entrance after page load
      const timer = setTimeout(() => setShowJoinModal(true), 400);
      return () => clearTimeout(timer);
    }
  }, [loading, ticket, sessionPersona, showJoinModal]);

  const handleJoinSession = (personaId: PersonaId) => {
    setSessionPersona(personaId);
    setShowJoinModal(false);
  };

  const handleSwitchPersona = () => {
    setShowJoinModal(true);
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

  const consensus = getConsensusProgress(ticket.id);
  const allPersonas = getAllPersonas();
  const progress = consensus.approved / consensus.total;
  const activePersonaObj = sessionPersona ? getPersona(sessionPersona) : null;
  const sessionEvents = getSessionEvents(ticket.id);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Join Session Modal */}
      <JoinSessionModal
        isOpen={showJoinModal && !sessionPersona}
        onJoin={handleJoinSession}
      />

      {/* Switch Persona Modal (re-join) */}
      <JoinSessionModal
        isOpen={showJoinModal && !!sessionPersona}
        onJoin={handleJoinSession}
      />

      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </Link>

      {/* Active persona indicator */}
      {activePersonaObj && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-gray-900/60 border border-gray-800">
          <span className="text-lg">{activePersonaObj.emoji}</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-200">
              Viewing as{" "}
              <span className="text-white">{activePersonaObj.label}</span>
            </p>
            <p className="text-xs text-gray-500">{activePersonaObj.expertise}</p>
          </div>
          <button
            onClick={handleSwitchPersona}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-brand-400 hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={12} />
            Switch
          </button>
        </div>
      )}

      {/* Two-column layout for ticket detail + timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: ticket info + feedback */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket header */}
          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-mono text-gray-500">
                    {ticket.id}
                  </span>
                  <span
                    className={`badge ${
                      ticket.status === "draft"
                        ? "bg-gray-800 text-gray-400"
                        : ticket.status === "in-review"
                        ? "bg-yellow-900/50 text-yellow-400"
                        : ticket.status === "consensus"
                        ? "bg-emerald-900/50 text-emerald-400"
                        : ticket.status === "building"
                        ? "bg-blue-900/50 text-blue-400"
                        : "bg-emerald-900/50 text-emerald-400"
                    }`}
                  >
                    {ticket.status === "done" ? "✅ Done" : ticket.status}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-3">
                  {ticket.title}
                </h1>
                <p className="text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {ticket.description}
                </p>
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Created {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch size={12} />
                    Updated {new Date(ticket.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Consensus bar */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-300">
                Consensus Progress
              </h3>
              <span className="text-sm text-gray-400">
                {consensus.approved}/{consensus.total} approved
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  consensus.remaining.length === 0
                    ? "bg-emerald-500"
                    : "bg-brand-500"
                }`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="flex items-center gap-3 mt-3">
              {allPersonas.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <PersonaBadge
                    personaId={p.id}
                    approved={ticket.approvals.includes(p.id)}
                  />
                </div>
              ))}
              {consensus.remaining.length === 0 && (
                <span className="badge bg-emerald-900/50 text-emerald-400 ml-auto">
                  🎉 Consensus Reached
                </span>
              )}
            </div>
          </div>

          {/* Build progress (shown when building) */}
          {ticket.buildState &&
            ticket.status === "building" && (
              <BuildProgress buildState={ticket.buildState} />
            )}

          {/* Build complete confirmation */}
          {ticket.status === "done" && ticket.buildState && (
            <div className="card bg-emerald-900/10 border-emerald-500/20">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🚀</span>
                <div>
                  <h3 className="text-lg font-bold text-emerald-300">
                    Build Complete
                  </h3>
                  <p className="text-sm text-emerald-400/70">
                    This feature was built from the combined consensus of all
                    stakeholders and is now deployed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Feedback panel — show after joining, or show hint before joining */}
          {sessionPersona ? (
            <FeedbackPanel
              ticket={ticket}
              onFeedbackAdded={() => loadTicket()}
              initialPersona={sessionPersona}
              onSwitchPersona={handleSwitchPersona}
            />
          ) : (
            <div className="card text-center py-12 opacity-60">
              <p className="text-gray-500 text-sm">
                Choose a persona to join the session and provide feedback.
              </p>
            </div>
          )}
        </div>

        {/* Right column: session timeline */}
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Session Activity
              </h3>
              <span className="text-xs text-gray-500 ml-auto">
                {sessionEvents.length} events
              </span>
            </div>
            <SessionTimeline events={sessionEvents} />
          </div>

          {/* Quick stats */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
              Session Stats
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total feedback</span>
                <span className="text-gray-300">
                  {ticket.feedback.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">AI-generated</span>
                <span className="text-purple-400">
                  {ticket.feedback.filter((f) => f.source === "ai").length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Human</span>
                <span className="text-gray-300">
                  {ticket.feedback.filter((f) => f.source === "human").length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
