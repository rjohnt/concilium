import { Ticket, PersonaId, TicketStatus } from "./types";
import { getAllPersonas } from "./personas";
import { getTicket } from "./store";

function updateTicketStatus(ticketId: string, status: TicketStatus): void {
  const ticket = getTicket(ticketId);
  if (ticket) {
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
  }
}

const CONSENSUS_THRESHOLD = 0.75; // 75% of personas must approve

/**
 * Calculate consensus for a ticket.
 * Returns true if >= 75% of all personas have approved.
 * When consensus is reached, auto-transitions the ticket to 'consensus' status.
 */
export async function calculateConsensus(ticketId: string): Promise<{
  reached: boolean;
  approved: number;
  total: number;
  percentage: number;
}> {
  const ticket = getTicket(ticketId);
  if (!ticket) {
    return { reached: false, approved: 0, total: 0, percentage: 0 };
  }

  const allPersonas = getAllPersonas();
  const total = allPersonas.length;
  const approved = ticket.approvals.length;
  const percentage = total > 0 ? approved / total : 0;
  const reached = percentage >= CONSENSUS_THRESHOLD;

  // Auto-transition to consensus when threshold met
  if (reached && ticket.status !== "consensus" && ticket.status !== "building" && ticket.status !== "done") {
    updateTicketStatus(ticketId, "consensus");
  }

  return { reached, approved, total, percentage };
}

/**
 * Get build readiness score and next steps.
 * Combines consensus percentage with feedback depth to determine readiness.
 */
export function getBuildReadiness(ticketId: string): {
  score: number; // 0-100
  consensusMet: boolean;
  feedbackCount: number;
  missingPersonas: PersonaId[];
  nextSteps: string[];
  readyToBuild: boolean;
} {
  const ticket = getTicket(ticketId);
  if (!ticket) {
    return {
      score: 0,
      consensusMet: false,
      feedbackCount: 0,
      missingPersonas: getAllPersonas().map((p) => p.id),
      nextSteps: ["Ticket not found"],
      readyToBuild: false,
    };
  }

  const allPersonas = getAllPersonas();
  const approved = ticket.approvals.length;
  const total = allPersonas.length;
  const consensusMet = approved / total >= CONSENSUS_THRESHOLD;

  const missingPersonas = allPersonas
    .filter((p) => !ticket.approvals.includes(p.id))
    .map((p) => p.id);

  const feedbackCount = ticket.feedback.length;

  // Score: weighted combination of consensus (70%) and feedback depth (30%)
  const consensusScore = Math.min(approved / total, 1) * 70;
  const feedbackScore = Math.min(feedbackCount / (total * 2), 1) * 30; // max 2 feedbacks per persona
  const score = Math.round(consensusScore + feedbackScore);

  const nextSteps: string[] = [];

  if (!consensusMet) {
    nextSteps.push(
      `Need approvals from: ${missingPersonas.map((p) => {
        const persona = allPersonas.find((pp) => pp.id === p);
        return persona ? `${persona.emoji} ${persona.label}` : p;
      }).join(", ")}`
    );
  }

  if (feedbackCount < total) {
    nextSteps.push(
      `Only ${feedbackCount}/${total} personas have provided feedback. Encourage more contributions.`
    );
  }

  if (ticket.feedback.some((f) => !f.approved)) {
    nextSteps.push(
      "Some feedback entries did not approve — review rejection reasons before building."
    );
  }

  if (consensusMet && score >= 80) {
    nextSteps.push("✅ Ready to move to building!");
  }

  if (nextSteps.length === 0) {
    nextSteps.push("✅ All checks passed. Ready for development.");
  }

  const readyToBuild = consensusMet && score >= 70;

  return {
    score,
    consensusMet,
    feedbackCount,
    missingPersonas,
    nextSteps,
    readyToBuild,
  };
}

/**
 * Generate a comprehensive summary of all persona feedback for a ticket.
 */
export function generateConsensusSummary(ticketId: string): {
  summary: string;
  approvals: PersonaId[];
  rejections: PersonaId[];
  keyConcerns: string[];
  keyHighlights: string[];
  generatedAt: string;
} {
  const ticket = getTicket(ticketId);
  const empty = {
    summary: "No feedback available.",
    approvals: [] as PersonaId[],
    rejections: [] as PersonaId[],
    keyConcerns: [] as string[],
    keyHighlights: [] as string[],
    generatedAt: new Date().toISOString(),
  };

  if (!ticket) return empty;

  const allPersonas = getAllPersonas();
  const approvals = ticket.approvals;
  const rejections = allPersonas
    .filter((p) => !ticket.approvals.includes(p.id))
    .map((p) => p.id);

  // Extract key themes from feedback
  const keyConcerns: string[] = [];
  const keyHighlights: string[] = [];

  for (const entry of ticket.feedback) {
    const persona = allPersonas.find((p) => p.id === entry.personaId);
    const label = persona ? persona.label : entry.personaId;

    if (!entry.approved) {
      keyConcerns.push(`[${label}] ${entry.content.slice(0, 120)}${entry.content.length > 120 ? "..." : ""}`);
    } else {
      keyHighlights.push(`[${label}] ${entry.content.slice(0, 120)}${entry.content.length > 120 ? "..." : ""}`);
    }
  }

  const approvedCount = approvals.length;
  const totalCount = allPersonas.length;

  const summary =
    ticket.feedback.length === 0
      ? `No feedback has been submitted for "${ticket.title}". All ${totalCount} persona reviews are pending.`
      : `Consensus summary for "${ticket.title}": ${approvedCount}/${totalCount} personas approved (${Math.round((approvedCount / totalCount) * 100)}%). ` +
        `${ticket.feedback.length} feedback entries submitted. ` +
        (rejections.length > 0
          ? `Still awaiting input from: ${rejections.map((r) => allPersonas.find((p) => p.id === r)?.label || r).join(", ")}.`
          : "All personas have weighed in!");

  return {
    summary,
    approvals,
    rejections,
    keyConcerns,
    keyHighlights,
    generatedAt: new Date().toISOString(),
  };
}
