"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Ticket, PersonaId } from "@/lib/types";
import { seedData, getTicket, getConsensusProgress } from "@/lib/store";
import { getAllPersonas, getPersona } from "@/lib/personas";
import { SessionPrompt } from "@/components/SessionPrompt";
import { ConsensusProgress } from "@/components/ConsensusProgress";
import { PersonaBadge } from "@/components/PersonaBadge";
import { JoinSessionModal } from "@/components/JoinSessionModal";
import {
  ArrowLeft,
  Clock,
  GitBranch,
  RefreshCw,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

export default function PromptSessionPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionPersona, setSessionPersona] = useState<PersonaId | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(true);

  const loadTicket = useCallback(() => {
    seedData();
    const t = getTicket(params.id as string);
    setTicket(t || null);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Auto-show join modal if no persona selected
  useEffect(() => {
    if (!loading && ticket && !sessionPersona) {
      setShowJoinModal(true);
    }
  }, [loading, ticket, sessionPersona]);

  const handleJoinSession = (personaId: PersonaId) => {
    setSessionPersona(personaId);
    setShowJoinModal(false);
  };

  const handleSwitchPersona = () => {
    setShowJoinModal(true);
  };

  const handleFeedbackUpdate = () => {
    loadTicket();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl">
          <div className="h-8 bg-gray-800 rounded w-1/3 mx-auto" />
          <div className="h-4 bg-gray-800 rounded w-2/3 mx-auto" />
          <div className="h-64 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-400 mb-2">
            Ticket not found
          </h3>
          <Link href="/" className="btn-secondary inline-flex mt-4">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const activePersonaObj = sessionPersona ? getPersona(sessionPersona) : null;

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Join Session Modal */}
      <JoinSessionModal
        isOpen={showJoinModal && !sessionPersona}
        onJoin={handleJoinSession}
      />
      <JoinSessionModal
        isOpen={showJoinModal && !!sessionPersona}
        onJoin={handleJoinSession}
      />

      {/* Top bar */}
      <header className="flex-shrink-0 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/ticket/${ticket.id}`}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back to Ticket</span>
            </Link>
            <div className="h-5 w-px bg-gray-800" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-gray-500">
                {ticket.id}
              </span>
              <span className="text-sm font-medium text-gray-300 truncate max-w-[200px] sm:max-w-md">
                {ticket.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Active persona */}
            {activePersonaObj ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50">
                <span>{activePersonaObj.emoji}</span>
                <span className="text-sm font-medium text-gray-200">
                  {activePersonaObj.label}
                </span>
                <button
                  onClick={handleSwitchPersona}
                  className="ml-1 p-1 rounded hover:bg-gray-700 transition-colors"
                  title="Switch persona"
                >
                  <RefreshCw size={14} className="text-gray-400" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowJoinModal(true)}
                className="btn-primary text-sm"
              >
                <Sparkles size={14} />
                Join Session
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content: two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: ticket info + consensus */}
        <div className="w-80 lg:w-96 flex-shrink-0 border-r border-gray-800 bg-gray-900/40 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Session title */}
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium mb-3">
                <Sparkles size={12} />
                Prompt Session
              </div>
              <h1 className="text-lg font-bold text-white mb-2">
                {ticket.title}
              </h1>
              <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
              <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <GitBranch size={11} />
                  {new Date(ticket.updatedAt).toLocaleDateString()}
                </span>
                <span
                  className={`badge ${
                    ticket.status === "draft"
                      ? "bg-gray-800 text-gray-400"
                      : ticket.status === "in-review"
                      ? "bg-yellow-900/50 text-yellow-400"
                      : ticket.status === "consensus"
                      ? "bg-emerald-900/50 text-emerald-400"
                      : "bg-blue-900/50 text-blue-400"
                  }`}
                >
                  {ticket.status}
                </span>
              </div>
            </div>

            {/* Consensus Progress */}
            <ConsensusProgress
              ticketId={ticket.id}
              approvals={ticket.approvals}
              onConsensusReached={handleFeedbackUpdate}
            />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gray-800/40 border border-gray-800">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <MessageSquare size={12} />
                  Feedback
                </div>
                <p className="text-2xl font-bold text-white">
                  {ticket.feedback.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-800/40 border border-gray-800">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Sparkles size={12} />
                  Consensus
                </div>
                <p className="text-2xl font-bold text-white">
                  {Math.round(
                    (ticket.approvals.length / getAllPersonas().length) * 100
                  )}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: prompt input + chat timeline */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {sessionPersona ? (
            <div className="flex-1 overflow-y-auto p-6">
              <SessionPrompt ticket={ticket} activePersona={sessionPersona} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-800 flex items-center justify-center">
                  <Sparkles size={28} className="text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-400 mb-2">
                  Ready to Start
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Join this session as a persona to provide AI-mediated
                  feedback. Your perspective will help shape this feature.
                </p>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="btn-primary"
                >
                  <Sparkles size={16} />
                  Join Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
