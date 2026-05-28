import { NextRequest, NextResponse } from "next/server";
import { mediate, continueMediation } from "@/lib/mediator";
import { PersonaId } from "@/lib/types";
import { checkRateLimit, extractIp, applyRateLimitHeaders } from "@/lib/rateLimit";
import type { RateLimitConfig } from "@/lib/types";
import { sanitize } from "@/lib/sanitize";

const PROMPT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000, // 1 minute
  maxRequests: 10,
};

interface PromptRequest {
  ticketId: string;
  personaId: PersonaId;
  message: string;
  /** If provided, this is a continuation of a previous mediation */
  previousResponse?: {
    refinedFeedback: string;
    concerns: string[];
    recommendations: string[];
    followUpQuestions: string[];
    suggestApproval: boolean;
    approvalReasoning: string;
    suggestedNextPersona: string | null;
  };
}

const VALID_PERSONAS: PersonaId[] = [
  "engineer",
  "designer",
  "product-owner",
  "qa",
];

export async function POST(request: NextRequest) {
  const ip = extractIp(request);
  const rateLimitResult = checkRateLimit(ip, PROMPT_RATE_LIMIT);

  if (!rateLimitResult.allowed) {
    const retryAfter = rateLimitResult.reset - Math.ceil(Date.now() / 1000);
    const response = NextResponse.json(
      { error: "Too many requests", retryAfter: Math.max(0, retryAfter) },
      { status: 429 }
    );
    return applyRateLimitHeaders(response, rateLimitResult);
  }

  try {
    const body: PromptRequest = await request.json();

    // Validate required fields
    if (!body.ticketId || !body.personaId || !body.message) {
      const response = NextResponse.json(
        {
          error: "Missing required fields",
          required: ["ticketId", "personaId", "message"],
        },
        { status: 400 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    // Validate ticket ID format
    if (!/^TIX-\d{3}$/.test(body.ticketId)) {
      const response = NextResponse.json(
        { error: "Invalid ticket ID format. Expected: TIX-XXX" },
        { status: 400 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    // Sanitize user message against XSS (belt-and-suspenders even for LLM-bound text)
    body.message = sanitize(body.message);

    // Validate persona
    if (!VALID_PERSONAS.includes(body.personaId)) {
      const response = NextResponse.json(
        {
          error: "Invalid persona ID",
          valid: VALID_PERSONAS,
        },
        { status: 400 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    // Route to mediator (LLM-powered via DeepSeek V4 Flash)
    let result;

    if (body.previousResponse) {
      // Continuation of an existing mediation session
      result = await continueMediation(
        body.ticketId,
        body.personaId,
        body.message,
        body.previousResponse as unknown as Parameters<typeof continueMediation>[3]
      );
    } else {
      // Fresh mediation
      result = await mediate(body.ticketId, body.personaId, body.message);
    }

    if (!result) {
      const response = NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    const successResponse = NextResponse.json({
      ...result.response,
      context: {
        ticketId: result.context.ticketId,
        personaId: result.context.personaId,
        consensusReached: result.context.consensusReached,
        approvedCount: result.context.approvedCount,
        totalPersonas: result.context.totalPersonas,
        sessionHistoryCount: result.context.sessionHistory.length,
      },
    });
    return applyRateLimitHeaders(successResponse, rateLimitResult);
  } catch (error) {
    console.error("Prompt API error:", error);
    const errorResponse = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    return applyRateLimitHeaders(errorResponse, rateLimitResult);
  }
}

/**
 * GET handler — returns session context for a ticket+persona combination,
 * useful for initializing the UI before the user sends a message.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get("ticketId");
  const personaId = searchParams.get("personaId") as PersonaId | null;

  if (!ticketId || !personaId) {
    return NextResponse.json(
      { error: "ticketId and personaId required" },
      { status: 400 }
    );
  }

  if (!/^TIX-\d{3}$/.test(ticketId)) {
    return NextResponse.json(
      { error: "Invalid ticket ID format" },
      { status: 400 }
    );
  }

  if (!VALID_PERSONAS.includes(personaId)) {
    return NextResponse.json(
      { error: "Invalid persona ID", valid: VALID_PERSONAS },
      { status: 400 }
    );
  }

  // Return minimal context without mediating
  const { getTicket, getFeedbackHistory } = await import("@/lib/server-db");
  const { checkConsensusThreshold } = await import("@/lib/consensus-threshold");
  const { getPersona, getAllPersonas } = await import("@/lib/personas");

  const ticket = getTicket(ticketId);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const persona = getPersona(personaId);
  if (!persona) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  const consensus = checkConsensusThreshold(ticket);
  const history = getFeedbackHistory(ticketId);
  const allPersonas = getAllPersonas();

  return NextResponse.json({
    ticket: {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
    },
    persona: {
      id: persona.id,
      label: persona.label,
      emoji: persona.emoji,
      expertise: persona.expertise,
      promptTemplate: persona.promptTemplate,
    },
    session: {
      consensusReached: consensus.reached,
      approvedCount: ticket.approvals.length,
      totalPersonas: allPersonas.length,
      historyCount: history.length,
      existingFeedback: history.map((f) => ({
        id: f.id,
        personaId: f.personaId,
        approved: f.approved,
        createdAt: f.createdAt,
        preview: f.content.slice(0, 100),
      })),
    },
  });
}
