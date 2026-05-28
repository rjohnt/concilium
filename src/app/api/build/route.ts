import { NextRequest, NextResponse } from "next/server";
import { getTicket, getFeedbackHistory, setBuildReport } from "@/lib/store";
import { getAllPersonas } from "@/lib/personas";
import { callDeepSeek, DEEPSEEK_PRO_MODEL } from "@/lib/llm";
import { checkConsensusThreshold, generateBuildSummary } from "@/lib/consensus-threshold";
import { BuildReport } from "@/lib/types";
import { checkRateLimit, extractIp, applyRateLimitHeaders } from "@/lib/rateLimit";
import type { RateLimitConfig } from "@/lib/types";

const BUILD_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000, // 1 minute
  maxRequests: 5,
};

interface BuildRequest {
  ticketId: string;
}

/**
 * Parse the LLM JSON response into a structured BuildReport.
 * Handles both clean JSON and markdown-fenced JSON.
 */
function parseBuildReport(
  rawContent: string,
  ticketId: string,
  buildId: string
): BuildReport {
  let parsed: Record<string, unknown> = {};

  try {
    parsed = JSON.parse(rawContent);
  } catch {
    // Try extracting from markdown code fences
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1].trim());
      } catch {
        // fall through to fallback
      }
    }
  }

  const now = new Date().toISOString();

  return {
    id: buildId,
    ticketId,
    createdAt: now,
    status: "building",
    requirements: safeArray(parsed.requirements),
    designDecisions: safeArray(parsed.designDecisions),
    qaCriteria: safeArray(parsed.qaCriteria),
    implementationPlan: String(parsed.implementationPlan ?? ""),
    consensusSummary: String(parsed.consensusSummary ?? ""),
  };
}

function safeArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  return [];
}

let nextBuildReportId = Date.now();

function generateBuildId(): string {
  return `BLD-${String(nextBuildReportId++ % 1000).padStart(3, "0")}`;
}

/**
 * Build the LLM prompt from ticket data and all persona feedback.
 */
function buildBuildPrompt(ticketId: string): {
  systemPrompt: string;
  userPrompt: string;
} | null {
  const ticket = getTicket(ticketId);
  if (!ticket) return null;

  const allPersonas = getAllPersonas();
  const consensus = checkConsensusThreshold(ticket);
  const buildSummary = generateBuildSummary(ticket);
  const feedbackHistory = getFeedbackHistory(ticketId);

  // Format persona feedback for the prompt
  const personaFeedback = allPersonas
    .map((persona) => {
      const feedback = feedbackHistory.filter((f) => f.personaId === persona.id);
      const approved = ticket.approvals.includes(persona.id);
      const status = approved ? "APPROVED" : "PENDING";
      const content =
        feedback.length > 0
          ? feedback.map((f) => `  - ${f.content}`).join("\n")
          : "  - No feedback provided";
      return `${persona.emoji} ${persona.label} [${status}]:\n${content}`;
    })
    .join("\n\n");

  const systemPrompt = `You are the Concilium Build Engine. Your job is to analyze persona feedback on a feature ticket and produce a structured build report that developers can execute against.

You MUST respond with ONLY valid JSON — no markdown, no code fences, no explanation. The JSON must match this exact schema:

{
  "requirements": ["string — concrete technical requirement 1", "string — concrete technical requirement 2"],
  "designDecisions": ["string — design decision 1", "string — design decision 2"],
  "qaCriteria": ["string — QA/test criteria 1", "string — QA/test criteria 2"],
  "implementationPlan": "string — step-by-step implementation plan as markdown",
  "consensusSummary": "string — summary of persona consensus state"
}

Guidelines:
- requirements: Synthesize concrete, actionable technical requirements from all persona feedback (especially engineer and QA). Each should be a single clear statement.
- designDecisions: Extract design decisions from designer and product-owner feedback. Include UX patterns, visual choices, and interaction design specifics.
- qaCriteria: Derive test criteria from QA feedback, engineer edge-case analysis, and product-owner acceptance criteria. Be specific and testable.
- implementationPlan: Write a step-by-step implementation plan as markdown. Include setup, core implementation, design integration, QA verification, and deployment steps. Reference specific feedback points.
- consensusSummary: Summarize the consensus state — who approved, who has concerns, overall readiness.`;

  const userPrompt = `## Ticket
        
**ID:** ${ticket.id}
**Title:** ${ticket.title}
**Description:** ${ticket.description}
**Priority:** ${ticket.priority === 0 ? "Urgent" : ticket.priority === 1 ? "High" : ticket.priority === 2 ? "Medium" : "Low"}
**Status:** ${ticket.status}

## Consensus State

Progress: ${consensus.progress * 100}% (${ticket.approvals.length}/${allPersonas.length} approvals)
Threshold: ${consensus.threshold * 100}%
Reached: ${consensus.reached ? "Yes" : "No"}

## Persona Feedback

${personaFeedback}

## Build Summary (auto-generated)

${buildSummary}

---

Based on the above ticket context, consensus state, and persona feedback, generate a complete build report. Focus on producing actionable, specific items for each section.`;

  return { systemPrompt, userPrompt };
}

/**
 * POST /api/build
 *
 * Accepts { ticketId: string }, validates the ticket exists,
 * builds a prompt from ticket + all persona feedback,
 * calls DeepSeek V4 Pro to generate a structured build report,
 * persists it to the store, and returns the BuildReport.
 */
export async function POST(request: NextRequest) {
  const ip = extractIp(request);
  const rateLimitResult = checkRateLimit(ip, BUILD_RATE_LIMIT);

  if (!rateLimitResult.allowed) {
    const retryAfter = rateLimitResult.reset - Math.ceil(Date.now() / 1000);
    const response = NextResponse.json(
      { error: "Too many requests", retryAfter: Math.max(0, retryAfter) },
      { status: 429 }
    );
    return applyRateLimitHeaders(response, rateLimitResult);
  }

  try {
    const body: BuildRequest = await request.json();

    // Validate ticketId
    if (!body.ticketId) {
      const response = NextResponse.json(
        { error: "Missing required field: ticketId" },
        { status: 400 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    if (!/^TIX-\d{3}$/.test(body.ticketId)) {
      const response = NextResponse.json(
        { error: "Invalid ticket ID format. Expected: TIX-XXX" },
        { status: 400 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    // Validate ticket exists
    const ticket = getTicket(body.ticketId);
    if (!ticket) {
      const response = NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    // Build the prompt
    const prompt = buildBuildPrompt(body.ticketId);
    if (!prompt) {
      const response = NextResponse.json(
        { error: "Failed to build prompt for ticket" },
        { status: 500 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    // Call DeepSeek V4 Pro
    const llmResponse = await callDeepSeek({
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      expectJson: true,
      model: DEEPSEEK_PRO_MODEL,
    });

    // Generate build ID and parse response
    const buildId = generateBuildId();
    const report = parseBuildReport(llmResponse.content, body.ticketId, buildId);

    // Persist to store
    setBuildReport(body.ticketId, report);

    const successResponse = NextResponse.json(
      {
        buildReport: report,
        meta: {
          model: llmResponse.model,
          tokensUsed: llmResponse.usage.totalTokens,
          processedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
    return applyRateLimitHeaders(successResponse, rateLimitResult);
  } catch (error) {
    console.error("Build API error:", error);
    const errorResponse = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    return applyRateLimitHeaders(errorResponse, rateLimitResult);
  }
}
