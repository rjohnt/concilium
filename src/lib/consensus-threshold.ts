import { Ticket } from "./types";
import { getAllPersonas } from "./personas";

export const DEFAULT_THRESHOLD = 0.75; // 75% of personas must approve

/**
 * Check whether the consensus threshold has been reached for a ticket.
 * Rounding up: e.g., with 4 personas and 0.75 threshold, need ceil(3) = 3 approvals.
 */
export function checkConsensusThreshold(ticket: Ticket): {
  reached: boolean;
  progress: number;
  threshold: number;
} {
  const allPersonas = getAllPersonas();
  const total = allPersonas.length;
  const approved = ticket.approvals.length;
  const progress = total > 0 ? approved / total : 0;

  return {
    reached: approved >= Math.ceil(total * DEFAULT_THRESHOLD),
    progress,
    threshold: DEFAULT_THRESHOLD,
  };
}

/**
 * Evaluate overall build readiness, factoring in consensus, blockers, and next steps.
 */
export function getBuildReadiness(ticket: Ticket): {
  ready: boolean;
  score: number;
  blockers: string[];
  nextSteps: string[];
} {
  const threshold = checkConsensusThreshold(ticket);
  const allPersonas = getAllPersonas();
  const blockers: string[] = [];
  const nextSteps: string[] = [];

  // Check consensus
  if (!threshold.reached) {
    const remaining = allPersonas
      .filter((p) => !ticket.approvals.includes(p.id))
      .map((p) => p.label);
    blockers.push(
      `Consensus not reached: ${ticket.approvals.length}/${allPersonas.length} approved. Waiting on: ${remaining.join(", ")}.`
    );
    nextSteps.push("Continue gathering persona feedback to reach consensus.");
  }

  // Check for unapproved/disapproving feedback
  const disapprovals = ticket.feedback.filter((f) => !f.approved);
  if (disapprovals.length > 0) {
    const uniquePersonaIds = Array.from(
      new Set(disapprovals.map((f) => f.personaId))
    );
    const disapprovingPersonas = uniquePersonaIds
      .map((p) => allPersonas.find((ap) => ap.id === p)?.label || p)
      .join(", ");
    blockers.push(
      `Outstanding concerns from: ${disapprovingPersonas}. Resolve these before building.`
    );
    nextSteps.push("Address concerns raised in disapproving feedback.");
  }

  // Check if there is any feedback at all
  if (ticket.feedback.length === 0) {
    blockers.push("No feedback has been collected for this ticket.");
    nextSteps.push("Invite personas to review and provide feedback.");
  }

  // Calculate score: base on consensus progress, penalize for blockers
  let score = threshold.progress * 100;
  if (disapprovals.length > 0 && threshold.reached) {
    // Consensus technically met but unresolved concerns exist
    score = Math.min(score, 80);
  }

  return {
    ready: threshold.reached && disapprovals.length === 0,
    score: Math.round(score),
    blockers,
    nextSteps: nextSteps.length > 0 ? nextSteps : ["All clear — ready to build!"],
  };
}

/**
 * Generate a markdown build summary from all persona feedback.
 */
export function generateBuildSummary(ticket: Ticket): string {
  const allPersonas = getAllPersonas();
  const lines: string[] = [];

  lines.push(`# Build Summary: ${ticket.id} — ${ticket.title}`);
  lines.push("");
  lines.push(`**Generated:** ${new Date().toLocaleString()}`);
  lines.push(`**Status:** ${ticket.status}`);
  lines.push(`**Consensus:** ${ticket.approvals.length}/${allPersonas.length} personas approved`);
  lines.push("");

  // Section: Persona Feedback Summary
  lines.push("## 📝 Persona Feedback Summary");
  lines.push("");

  for (const persona of allPersonas) {
    const feedback = ticket.feedback.filter((f) => f.personaId === persona.id);
    if (feedback.length === 0) {
      lines.push(`### ${persona.emoji} ${persona.label} — No feedback`);
      lines.push("");
      continue;
    }

    const approved = ticket.approvals.includes(persona.id);
    const status = approved ? "✅ Approved" : "❌ Has Concerns";
    lines.push(`### ${persona.emoji} ${persona.label} ${status}`);
    lines.push("");

    for (const entry of feedback) {
      lines.push(`> ${entry.content}`);
      lines.push("");
    }
  }

  // Section: Technical Requirements
  lines.push("## 🔧 Technical Requirements");
  lines.push("");

  const engineerFeedback = ticket.feedback.filter(
    (f) => f.personaId === "engineer"
  );
  if (engineerFeedback.length > 0) {
    for (const entry of engineerFeedback) {
      lines.push(`- ${entry.content.split(".")[0]}.`);
    }
  } else {
    lines.push("- No engineering assessment available.");
  }
  lines.push("");

  // Section: Design Decisions
  lines.push("## 🎨 Design Decisions");
  lines.push("");

  const designerFeedback = ticket.feedback.filter(
    (f) => f.personaId === "designer"
  );
  if (designerFeedback.length > 0) {
    for (const entry of designerFeedback) {
      lines.push(`- ${entry.content.split(".")[0]}.`);
    }
  } else {
    lines.push("- No design assessment available.");
  }
  lines.push("");

  // Section: QA Criteria
  lines.push("## 🧪 QA Criteria");
  lines.push("");

  const qaFeedback = ticket.feedback.filter((f) => f.personaId === "qa");
  if (qaFeedback.length > 0) {
    for (const entry of qaFeedback) {
      lines.push(`- ${entry.content.split(".")[0]}.`);
    }
  } else {
    lines.push("- No QA assessment available.");
  }
  lines.push("");

  // Section: Product Context
  lines.push("## 📋 Product Context");
  lines.push("");

  const poFeedback = ticket.feedback.filter(
    (f) => f.personaId === "product-owner"
  );
  if (poFeedback.length > 0) {
    for (const entry of poFeedback) {
      lines.push(`- ${entry.content.split(".")[0]}.`);
    }
  } else {
    lines.push("- No product assessment available.");
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Extract requirements from the build summary as a structured list.
 */
export function extractSection(lines: string[], sectionName: string): string[] {
  let inSection = false;
  const results: string[] = [];
  for (const line of lines) {
    if (line.startsWith(`## ${sectionName}`)) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith("## ")) {
      break;
    }
    if (inSection && line.startsWith("- ") && !line.includes("No ")) {
      results.push(line.replace(/^- /, "").trim());
    }
  }
  return results;
}

/**
 * Build a structured BuildReport from a ticket and its summary.
 */
export function buildBuildReport(
  ticket: Ticket,
  buildId: string
): import("./types").BuildReport {
  const summary = generateBuildSummary(ticket);
  const summaryLines = summary.split("\n");
  const allPersonas = getAllPersonas();

  return {
    id: buildId,
    ticketId: ticket.id,
    createdAt: new Date().toISOString(),
    status: "building",
    requirements: extractSection(summaryLines, "🔧 Technical Requirements"),
    designDecisions: extractSection(summaryLines, "🎨 Design Decisions"),
    qaCriteria: extractSection(summaryLines, "🧪 QA Criteria"),
    implementationPlan: `## Implementation Plan for ${ticket.id}\n\nBased on the consensus feedback, implement the following:\n\n1. Review all persona feedback for context\n2. Set up the development environment\n3. Implement core functionality\n4. Address design requirements\n5. Cover QA criteria\n6. Submit for review`,
    consensusSummary: `Consensus: ${ticket.approvals.length}/${allPersonas.length} personas approved.`,
  };
}
