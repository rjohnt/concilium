/**
 * standin.ts — Agentic AI stand-ins for unclaimed persona seats.
 *
 * When a seat has no human, its AI stand-in can review the ticket like any
 * other stakeholder: it reads the full ticket + feedback history, produces a
 * persona-grounded assessment via DeepSeek, and submits it as feedback with
 * source "ai-standin". Stand-in approvals count toward consensus exactly like
 * human approvals — the stand-in IS the stakeholder until a human takes over.
 *
 * Server-side only (uses server-db).
 */

import { FeedbackEntry, PersonaId, Ticket } from "./types";
import { getPersona } from "./personas";
import { getTicket, getFeedbackHistory, addFeedback } from "./server-db";
import { callDeepSeek } from "./llm";
import {
  buildPersonaSystemPrompt,
  buildStandinUserPrompt,
  PROMPT_VERSION,
} from "./persona-prompts";

export interface StandinResult {
  entry: FeedbackEntry;
  concerns: string[];
  recommendations: string[];
  approve: boolean;
  approvalReasoning: string;
  meta: {
    model: string;
    tokensUsed: number;
    promptVersion: string;
  };
}

export interface ParsedStandinResponse {
  feedback: string;
  concerns: string[];
  recommendations: string[];
  approve: boolean;
  approvalReasoning: string;
}

function parseStandinResponse(raw: string): ParsedStandinResponse {
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

  const safeArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [];

  return {
    feedback: String(parsed.feedback ?? raw).trim().slice(0, 4000),
    concerns: safeArray(parsed.concerns),
    recommendations: safeArray(parsed.recommendations),
    approve: parsed.approve === true,
    approvalReasoning: String(parsed.approvalReasoning ?? "").trim(),
  };
}

/** Render the structured stand-in response as a single feedback entry body. */
function formatStandinFeedback(parsed: ParsedStandinResponse): string {
  const sections = [parsed.feedback];
  if (parsed.concerns.length > 0) {
    sections.push(`Concerns:\n${parsed.concerns.map((c) => `- ${c}`).join("\n")}`);
  }
  if (parsed.recommendations.length > 0) {
    sections.push(`Recommendations:\n${parsed.recommendations.map((r) => `- ${r}`).join("\n")}`);
  }
  return sections.join("\n\n");
}

/**
 * Run the stand-in LLM for a ticket/persona/history without touching the
 * database. Used by generateStandinFeedback and by the eval harness, which
 * feeds it fixture tickets.
 */
export async function runStandinLLM(
  ticket: Ticket,
  personaId: PersonaId,
  history: FeedbackEntry[],
  /** Optional model override — production passes none (default model); the
   *  eval harness passes the model under test so models can be compared. */
  model?: string
): Promise<{ parsed: ParsedStandinResponse; model: string; tokensUsed: number } | null> {
  const persona = getPersona(personaId);
  if (!persona) return null;

  const llmResponse = await callDeepSeek({
    systemPrompt: buildPersonaSystemPrompt(persona),
    userPrompt: buildStandinUserPrompt(ticket, persona, history),
    expectJson: true,
    model,
  });

  return {
    parsed: parseStandinResponse(llmResponse.content),
    model: llmResponse.model,
    tokensUsed: llmResponse.usage.totalTokens,
  };
}

/**
 * Generate and persist stand-in feedback for one persona seat.
 * Returns null when the ticket or persona doesn't exist.
 */
export async function generateStandinFeedback(
  ticketId: string,
  personaId: PersonaId
): Promise<StandinResult | null> {
  const ticket = await getTicket(ticketId);
  if (!ticket) return null;

  const history = await getFeedbackHistory(ticketId);
  const run = await runStandinLLM(ticket, personaId, history);
  if (!run) return null;

  const { parsed, model, tokensUsed } = run;

  const entry = await addFeedback(
    ticketId,
    personaId,
    formatStandinFeedback(parsed),
    parsed.approve,
    "ai-standin"
  );
  if (!entry) return null;

  return {
    entry,
    concerns: parsed.concerns,
    recommendations: parsed.recommendations,
    approve: parsed.approve,
    approvalReasoning: parsed.approvalReasoning,
    meta: {
      model,
      tokensUsed,
      promptVersion: PROMPT_VERSION,
    },
  };
}

/**
 * Personas whose seat is AI-held and who haven't weighed in yet.
 * These are the seats a "stand-ins, weigh in" request will cover.
 */
export function getPendingStandinPersonas(ticket: Ticket): PersonaId[] {
  const allPersonaIds: PersonaId[] = ["engineer", "designer", "product-owner", "qa"];
  const spoken = new Set(ticket.feedback.map((f) => f.personaId));
  return allPersonaIds.filter((id) => {
    const seat = ticket.seats?.[id];
    const aiHeld = !seat || seat.occupant === "ai";
    return aiHeld && !spoken.has(id);
  });
}
