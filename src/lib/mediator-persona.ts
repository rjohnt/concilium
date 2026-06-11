/**
 * mediator-persona.ts — The Mediator: a dedicated facilitator agent.
 *
 * Unlike the persona lenses in mediator.ts (which refine ONE stakeholder's
 * input), the Mediator reads the WHOLE ticket — every persona's feedback,
 * human and AI stand-in alike — and facilitates: it detects conflicts between
 * stakeholders, summarizes open disagreements, proposes compromises, and
 * nudges whoever needs to speak next. This is the agent that moves the
 * ticket along.
 *
 * Its system prompt is deliberately its own artifact, separate from the
 * persona prompts, so it can be crafted and eval'd independently.
 *
 * Server-side only (uses server-db).
 */

import { FeedbackEntry, PersonaId, Ticket } from "./types";
import { getTicket, getFeedbackHistory } from "./server-db";
import { getAllPersonas } from "./personas";
import { callDeepSeek } from "./llm";
import { buildTicketContext, buildFeedbackContext, PROMPT_VERSION } from "./persona-prompts";

// ── The Mediator's own system prompt ────────────────────────────────────────

export const MEDIATOR_SYSTEM_PROMPT = `You are the Mediator in "Concilium", a collaborative ticket-building session where an Engineer, a Designer, a Product Owner, and a QA stakeholder shape a feature ticket together. Some seats are held by humans, some by AI stand-ins — you treat their input with equal weight.

You are NOT a stakeholder. You hold no opinion on the feature itself. Your craft is facilitation:

1. CONFLICTS — Find the places where stakeholders genuinely disagree or where one persona's plan undermines another's requirements (e.g. the Engineer's API design breaks the Designer's interaction model). Name the personas involved and state the tension in one crisp sentence each. Do not invent conflicts where there is only difference of emphasis.
2. COMPROMISES — For each real conflict, propose a concrete middle path that both sides could accept. Specific beats clever: name the scope cut, the phased rollout, the alternative pattern.
3. GAPS — Notice what nobody has addressed: unstated requirements, missing acceptance criteria, personas who haven't weighed in on a contested point.
4. MOMENTUM — Recommend the single next action that most advances the ticket toward consensus: who should speak next and about what, or whether the ticket is ready to build.

Tone: neutral, succinct, direct. You summarize positions fairly even when you recommend against them. You never pad. If the session is healthy and aligned, say so briefly — manufactured friction destroys trust in you.

Return ONLY valid JSON matching the specified schema — no markdown, no explanation.`;

// ── Report types ────────────────────────────────────────────────────────────

export interface MediatorConflict {
  personas: PersonaId[];
  topic: string;
  description: string;
  suggestedCompromise: string;
}

export interface FacilitatorReport {
  /** One-paragraph neutral summary of where the session stands. */
  summary: string;
  conflicts: MediatorConflict[];
  /** Things nobody has addressed yet. */
  gaps: string[];
  /** The single most useful next action. */
  nextAction: string;
  /** Persona who should weigh in next, when one is clearly indicated. */
  suggestedNextPersona: PersonaId | null;
  /** Whether the mediator judges the ticket ready to build. */
  readyToBuild: boolean;
  meta: {
    processedAt: string;
    model: string;
    tokensUsed: number;
    promptVersion: string;
  };
}

const REPORT_SCHEMA = `Respond with a JSON object in this exact structure (no markdown, no code fences):
{
  "summary": "One-paragraph neutral summary of where this session stands",
  "conflicts": [
    {
      "personas": ["engineer", "designer"],
      "topic": "Short label for the disagreement",
      "description": "One crisp sentence stating the tension",
      "suggestedCompromise": "A concrete middle path both sides could accept"
    }
  ],
  "gaps": ["Something nobody has addressed yet (empty array if none)"],
  "nextAction": "The single most useful next action for this ticket",
  "suggestedNextPersona": "engineer" | "designer" | "product-owner" | "qa" | null,
  "readyToBuild": boolean
}`;

// ── Facilitation ────────────────────────────────────────────────────────────

function buildSeatContext(ticket: Ticket): string {
  return getAllPersonas()
    .map((p) => {
      const seat = ticket.seats?.[p.id];
      const holder =
        seat?.occupant === "human"
          ? `human (${seat.claimedByLabel || "unnamed"})`
          : "AI stand-in";
      const approved = ticket.approvals.includes(p.id) ? " — approved ✓" : "";
      return `${p.label}: seat held by ${holder}${approved}`;
    })
    .join("\n");
}

function parseReport(raw: string): Omit<FacilitatorReport, "meta"> {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1].trim());
      } catch {
        // fall through to defaults
      }
    }
  }

  const validPersona = (v: unknown): v is PersonaId =>
    typeof v === "string" && getAllPersonas().some((p) => p.id === v);

  const conflicts: MediatorConflict[] = Array.isArray(parsed.conflicts)
    ? (parsed.conflicts as Record<string, unknown>[]).map((c) => ({
        personas: Array.isArray(c.personas) ? c.personas.filter(validPersona) : [],
        topic: String(c.topic ?? "").trim(),
        description: String(c.description ?? "").trim(),
        suggestedCompromise: String(c.suggestedCompromise ?? "").trim(),
      }))
    : [];

  return {
    summary: String(parsed.summary ?? "No summary generated.").trim(),
    conflicts,
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps.map((g) => String(g).trim()).filter(Boolean) : [],
    nextAction: String(parsed.nextAction ?? "").trim(),
    suggestedNextPersona: validPersona(parsed.suggestedNextPersona)
      ? parsed.suggestedNextPersona
      : null,
    readyToBuild: parsed.readyToBuild === true,
  };
}

/**
 * Run the Mediator LLM over a ticket + history without touching the database.
 * Used by facilitate() and by the eval harness with fixture tickets.
 */
export async function runMediatorLLM(
  ticket: Ticket,
  history: FeedbackEntry[]
): Promise<FacilitatorReport> {
  const userPrompt = [
    `## Ticket Context`,
    buildTicketContext(ticket),
    ``,
    `## Seats`,
    buildSeatContext(ticket),
    ``,
    `## Full Feedback History (chronological)`,
    buildFeedbackContext(history),
    ``,
    `## Your Task`,
    `Facilitate this session: surface real conflicts, propose compromises, name the gaps,`,
    `and recommend the next action that most advances the ticket toward consensus.`,
    ``,
    REPORT_SCHEMA,
  ].join("\n");

  const llmResponse = await callDeepSeek({
    systemPrompt: MEDIATOR_SYSTEM_PROMPT,
    userPrompt,
    expectJson: true,
  });

  return {
    ...parseReport(llmResponse.content),
    meta: {
      processedAt: new Date().toISOString(),
      model: llmResponse.model,
      tokensUsed: llmResponse.usage.totalTokens,
      promptVersion: PROMPT_VERSION,
    },
  };
}

/**
 * Run the Mediator over the full ticket. Returns null when the ticket
 * doesn't exist.
 */
export async function facilitate(ticketId: string): Promise<FacilitatorReport | null> {
  const ticket = getTicket(ticketId);
  if (!ticket) return null;

  const history = getFeedbackHistory(ticketId);
  return runMediatorLLM(ticket, history);
}
