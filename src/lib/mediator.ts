import { Persona, PersonaId, Ticket, FeedbackEntry } from "./types";
import { getPersona, getAllPersonas } from "./personas";
import { getTicket, getFeedbackHistory } from "./server-db";
import { checkConsensusThreshold } from "./consensus-threshold";
import { callDeepSeek } from "./llm";
import {
  buildPersonaSystemPrompt,
  buildTicketContext,
  buildFeedbackContext,
} from "./persona-prompts";

// === Mediator Engine v2 — LLM-Powered ===
//
// The mediator is the AI "brain" that sits between the user and the ticket.
// It takes user input, re-frames it through the lens of the selected persona,
// and generates structured, persona-aware feedback via DeepSeek V4 Flash.

export interface MediatorContext {
  ticketId: string;
  personaId: PersonaId;
  sessionHistory: FeedbackEntry[];
  consensusReached: boolean;
  approvedCount: number;
  totalPersonas: number;
}

export interface MediatorResponse {
  /** The AI-refined feedback, ready for submission */
  refinedFeedback: string;
  /** Persona-specific concerns surfaced from the analysis */
  concerns: string[];
  /** Persona-specific recommendations */
  recommendations: string[];
  /** Follow-up questions to deepen the conversation */
  followUpQuestions: string[];
  /** Whether the mediator recommends approval based on analysis */
  suggestApproval: boolean;
  /** Reasoning for the approval suggestion */
  approvalReasoning: string;
  /** Suggested next persona to weigh in (based on who hasn't yet) */
  suggestedNextPersona: PersonaId | null;
  /** Metadata about the mediation */
  meta: {
    mediationType: "ai";
    processedAt: string;
    inputLength: number;
    model: string;
    tokensUsed: number;
  };
}

async function buildContext(
  ticketId: string,
  personaId: PersonaId
): Promise<{ context: MediatorContext; ticket: Ticket } | null> {
  const ticket = await getTicket(ticketId);
  if (!ticket) return null;

  const history = await getFeedbackHistory(ticketId);
  const consensus = checkConsensusThreshold(ticket);

  return {
    ticket,
    context: {
      ticketId,
      personaId,
      sessionHistory: history,
      consensusReached: consensus.reached,
      approvedCount: ticket.approvals.length,
      totalPersonas: getAllPersonas().length,
    },
  };
}

/**
 * Mediate a user message through the selected persona lens via DeepSeek V4 Flash.
 */
export async function mediate(
  ticketId: string,
  personaId: PersonaId,
  userMessage: string
): Promise<{ response: MediatorResponse; context: MediatorContext } | null> {
  const built = await buildContext(ticketId, personaId);
  if (!built) return null;
  const { context, ticket } = built;

  const persona = getPersona(personaId);
  if (!persona) return null;

  const response = await generateLLMResponse(ticket, persona, userMessage, context, false);

  return { response, context };
}

/**
 * Continue an existing mediation session — takes the last AI response
 * and the user's follow-up, generates the next round.
 */
export async function continueMediation(
  ticketId: string,
  personaId: PersonaId,
  userMessage: string,
  previousResponse: MediatorResponse
): Promise<{ response: MediatorResponse; context: MediatorContext } | null> {
  const built = await buildContext(ticketId, personaId);
  if (!built) return null;
  const { context, ticket } = built;

  const persona = getPersona(personaId);
  if (!persona) return null;

  const response = await generateLLMResponse(ticket, persona, userMessage, context, true, previousResponse);

  return { response, context };
}

// === LLM Prompt Building ===
// Persona framing and context blocks are shared with the AI stand-ins via
// persona-prompts.ts so the eval harness covers both paths.

async function generateLLMResponse(
  ticket: Ticket,
  persona: Persona,
  userMessage: string,
  context: MediatorContext,
  isContinuation: boolean,
  previousResponse?: MediatorResponse
): Promise<MediatorResponse> {
  const systemPrompt = buildPersonaSystemPrompt(persona);

  const existingFeedback = buildFeedbackContext(context.sessionHistory, persona.id);
  const allPersonas = getAllPersonas();
  const personaStatus = allPersonas
    .map(
      (p) =>
        `${p.emoji} ${p.label}: ${context.sessionHistory.some((f) => f.personaId === p.id) ? "provided feedback" : "not yet"}${ticket.approvals.includes(p.id) ? " ✓ approved" : ""}`
    )
    .join("\n");

  // Build the prompt — ticket context (fresh) or continuation
  const jsonSchema = `Respond with a JSON object in this exact structure (no markdown, no code fences):
{
  "refinedFeedback": "A detailed feedback statement that reframes the user's input through the ${persona.label} lens. Use first-person persona voice. Include your assessment, analysis, and specific observations. 2-4 paragraphs.",
  "concerns": ["Concern 1 specific to ${persona.label}'s domain", "Concern 2", "Concern 3 (max 4)"],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3 (max 4)"],
  "followUpQuestions": ["A probing question to deepen the conversation", "Another question (max 3)"],
  "suggestApproval": boolean,
  "approvalReasoning": "Brief explanation of why you do or don't recommend approval from the ${persona.label}'s perspective"
}`;

  let userPrompt: string;

  if (isContinuation && previousResponse) {
    userPrompt = [
      `## Previous Mediation Round`,
      `Your previous response as ${persona.label}:`,
      `Refined Feedback: ${previousResponse.refinedFeedback}`,
      `Concerns: ${previousResponse.concerns.join("; ")}`,
      `Recommendations: ${previousResponse.recommendations.join("; ")}`,
      ``,
      `## User Follow-up`,
      `The user is responding to your previous analysis:`,
      `"""`,
      userMessage,
      `"""`,
      ``,
      `## Persona Status`,
      personaStatus,
      ``,
      jsonSchema,
    ].join("\n");
  } else {
    // Fresh mediation — full ticket context
    userPrompt = [
      `## Ticket Context`,
      buildTicketContext(ticket),
      ``,
      `## Existing Feedback from Other Personas`,
      existingFeedback,
      ``,
      `## Persona Status`,
      personaStatus,
      ``,
      `## User Input`,
      `The user is submitting their perspective as the ${persona.label} persona:`,
      `"""`,
      userMessage,
      `"""`,
      ``,
      jsonSchema,
    ].join("\n");
  }

  const llmResponse = await callDeepSeek({
    systemPrompt,
    userPrompt,
    expectJson: true,
  });

  // Parse the JSON response
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(llmResponse.content);
  } catch (e) {
    // If JSON parsing fails, try to extract from markdown code fences
    const jsonMatch = llmResponse.content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1].trim());
    } else {
      // Fallback: extract whatever we can
      parsed = {
        refinedFeedback: llmResponse.content.slice(0, 1000),
        concerns: ["Could not parse structured response — see feedback for details."],
        recommendations: [],
        followUpQuestions: [],
        suggestApproval: false,
        approvalReasoning: "Response parsing error occurred.",
      };
    }
  }

  // Find next persona
  const suggestedNextPersona = findNextPersona(context, ticket);

  return {
    refinedFeedback: String(parsed.refinedFeedback ?? "No feedback generated.").trim(),
    concerns: safeArray(parsed.concerns),
    recommendations: safeArray(parsed.recommendations),
    followUpQuestions: safeArray(parsed.followUpQuestions),
    suggestApproval: Boolean(parsed.suggestApproval),
    approvalReasoning: String(parsed.approvalReasoning ?? "").trim(),
    suggestedNextPersona,
    meta: {
      mediationType: "ai",
      processedAt: new Date().toISOString(),
      inputLength: userMessage.length,
      model: "deepseek-v4-flash",
      tokensUsed: llmResponse.usage.totalTokens,
    },
  };
}

function safeArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim());
  }
  return [];
}

function findNextPersona(context: MediatorContext, ticket: Ticket): PersonaId | null {
  const allPersonas = getAllPersonas();

  const personasWithFeedback = new Set(
    context.sessionHistory.map((f) => f.personaId)
  );

  // Find first persona that hasn't provided feedback and isn't the current one
  for (const p of allPersonas) {
    if (p.id !== context.personaId && !personasWithFeedback.has(p.id)) {
      return p.id;
    }
  }

  // All have provided feedback — suggest the one farthest from approval
  for (const p of allPersonas) {
    if (p.id !== context.personaId && !ticket.approvals.includes(p.id)) {
      return p.id;
    }
  }

  return null; // Everyone has provided feedback and approved
}
