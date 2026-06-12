import { NextRequest, NextResponse } from "next/server";
import { getTicket, getFeedbackHistory, setBuildReport } from "@/lib/server-db";
import { isLLMConfigured, AI_NOT_CONFIGURED_MESSAGE } from "@/lib/llm";
import { getBuildExecutor } from "@/lib/build-executor";
import { checkRateLimit, extractIp, applyRateLimitHeaders } from "@/lib/rateLimit";
import type { RateLimitConfig } from "@/lib/types";
import { sanitize } from "@/lib/sanitize";

const BUILD_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000, // 1 minute
  maxRequests: 5,
};

interface BuildRequest {
  ticketId: string;
}

let nextBuildReportId = Date.now();

function generateBuildId(): string {
  return `BLD-${String(nextBuildReportId++ % 1000).padStart(3, "0")}`;
}

/**
 * POST /api/build
 *
 * Accepts { ticketId: string }, validates the ticket exists, and runs the
 * configured build executor (CONCILIUM_BUILD_EXECUTOR): the default "report"
 * executor synthesizes a structured spec from consensus feedback; the
 * "local-claude" executor additionally implements it in a sandboxed
 * workspace and attaches diff/log artifacts. Unresolved change requests from
 * the previous build round are passed through as delta context.
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

  // Friendly degrade when no LLM key is configured (BuildTrigger surfaces `error`).
  if (!isLLMConfigured()) {
    const response = NextResponse.json(
      { error: AI_NOT_CONFIGURED_MESSAGE, code: "ai_not_configured" },
      { status: 503 }
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

    // Belt-and-suspenders sanitization of ticketId (already regex-validated)
    body.ticketId = sanitize(body.ticketId);

    // Validate ticket exists
    const ticket = await getTicket(body.ticketId);
    if (!ticket) {
      const response = NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    const history = await getFeedbackHistory(body.ticketId);
    // Delta context: change requests from the previous round not yet consumed
    const changeRequests = (ticket.buildReport?.changeRequests ?? []).filter(
      (cr) => !cr.resolvedByBuildId
    );

    const executor = getBuildExecutor();
    const buildId = generateBuildId();
    const execution = await executor.execute({
      ticket,
      history,
      changeRequests,
      buildId,
    });

    // Persist to store
    await setBuildReport(body.ticketId, execution.report);

    const successResponse = NextResponse.json(
      {
        buildReport: execution.report,
        meta: {
          model: execution.meta.model,
          tokensUsed: execution.meta.tokensUsed,
          executor: execution.meta.executor,
          processedAt: execution.meta.processedAt,
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
