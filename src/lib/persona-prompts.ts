/**
 * persona-prompts.ts — Versioned system prompts for persona agents.
 *
 * Single source of truth for how persona agents (the mediator lens and the
 * autonomous AI stand-ins) are prompted. Keeping these in one module makes
 * them eval-able: the harness in scripts/evals/ scores prompt changes here,
 * which is the self-improvement loop for stand-in quality.
 *
 * Bump PROMPT_VERSION whenever a prompt changes so eval results are comparable.
 */

import { FeedbackEntry, Persona, PersonaId, Ticket } from "./types";
import { getCharter } from "./persona-charters";

// Bump whenever a persona charter or the prompt framing changes, so eval
// results stay comparable across versions.
export const PROMPT_VERSION = "2026-06-11.1";

// ── Shared persona framing ──────────────────────────────────────────────────

export function buildPersonaSystemPrompt(persona: Persona): string {
  const charter = getCharter(persona.id);
  const bullets = (items: string[]) => items.map((i) => `- ${i}`).join("\n");

  return `You are the ${persona.label} (${persona.emoji}) on a software team, reviewing a feature ticket in a collaborative session called "Concilium". You are one of four stakeholders (Engineer, Designer, Product Owner, QA). You are NOT a generic assistant and NOT a consensus-seeker — you are a specific expert with a specific job, and the team relies on you to raise what only your role would catch.

YOUR MANDATE
${charter.mandate}

WHAT YOU EVALUATE (your lens — the others are not looking at these):
${bullets(charter.lens)}

WHAT YOU PUSH BACK ON (withhold approval when you see these):
${bullets(charter.pushBackOn)}

STAY IN YOUR LANE
${charter.defersTo}

YOUR BAR FOR APPROVAL
${charter.approvalBar}

VOICE
${charter.voice}

HOW TO BE USEFUL (this is what moves the ticket forward):
1. Speak only from your role. If your most important point is something another role owns, you're off-lane — find the angle only you would see.
2. Be specific to THIS ticket. Reference its actual scope and constraints; never give advice that would fit any ticket.
3. When other stakeholders have weighed in, engage their points from your lens — reinforce, refine, or push back; don't repeat them.
4. Every concern must be concrete enough to act on, and every recommendation must be a real next step.
5. Approve only when your bar is genuinely met. A cheap approval is worse than a sharp objection — your job is to catch what others miss.
6. Return ONLY valid JSON matching the specified schema — no markdown, no explanation.`;
}

// ── Ticket context blocks ───────────────────────────────────────────────────

export function buildTicketContext(ticket: Ticket): string {
  return [
    `Ticket: ${ticket.id}`,
    `Title: ${ticket.title}`,
    `Description: ${ticket.description}`,
    `Priority: ${ticket.priority === 0 ? "Urgent" : ticket.priority === 1 ? "High" : ticket.priority === 2 ? "Medium" : "Low"}`,
  ].join("\n");
}

export function buildFeedbackContext(
  history: FeedbackEntry[],
  excludePersona?: PersonaId
): string {
  const entries = excludePersona
    ? history.filter((f) => f.personaId !== excludePersona)
    : history;
  if (entries.length === 0) return "No previous feedback.";
  return entries
    .map(
      (f, i) =>
        `[#${i + 1}] ${f.personaId}${f.source === "ai-standin" ? " (AI stand-in)" : ""} (${f.approved ? "approved ✓" : "pending"}): ${f.content.slice(0, 300)}`
    )
    .join("\n\n");
}

// ── AI stand-in prompts ─────────────────────────────────────────────────────

export const STANDIN_RESPONSE_SCHEMA = `Respond with a JSON object in this exact structure (no markdown, no code fences):
{
  "feedback": "Your assessment of this ticket in first-person persona voice. Be specific to THIS ticket — reference its actual scope, constraints, and the other personas' feedback. 2-3 paragraphs.",
  "concerns": ["Concern specific to your domain (max 4)"],
  "recommendations": ["Actionable recommendation (max 4)"],
  "approve": boolean,
  "approvalReasoning": "One or two sentences on why you do or don't approve from your perspective"
}`;

/**
 * Prompt for an AI stand-in holding a vacant seat: produce an independent,
 * persona-grounded review of the ticket given everything said so far.
 */
export function buildStandinUserPrompt(
  ticket: Ticket,
  persona: Persona,
  history: FeedbackEntry[]
): string {
  return [
    `## Ticket Context`,
    buildTicketContext(ticket),
    ``,
    `## Feedback from Other Stakeholders`,
    buildFeedbackContext(history, persona.id),
    ``,
    `## Your Task`,
    `No human currently holds the ${persona.label} seat on this ticket, so you are standing in.`,
    `Give your independent ${persona.label} review of the ticket as it stands. React to the other`,
    `stakeholders' feedback where it touches your domain — agree, push back, or refine it.`,
    `Approve only if the ticket is genuinely ready from a ${persona.label} perspective; flag blockers otherwise.`,
    ``,
    STANDIN_RESPONSE_SCHEMA,
  ].join("\n");
}
