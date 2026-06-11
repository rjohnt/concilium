/**
 * /api/mediator — Convene the Mediator facilitator agent over a ticket.
 *
 * POST { ticketId } → FacilitatorReport (conflicts, compromises, gaps, next action)
 */

import { NextRequest, NextResponse } from "next/server";
import { facilitate } from "@/lib/mediator-persona";
import { isLLMConfigured, AI_NOT_CONFIGURED_MESSAGE } from "@/lib/llm";
import { checkRateLimit, extractIp, applyRateLimitHeaders } from "@/lib/rateLimit";
import type { RateLimitConfig } from "@/lib/types";

const MEDIATOR_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000, // 1 minute
  maxRequests: 5,
};

export async function POST(request: NextRequest) {
  const ip = extractIp(request);
  const rateLimitResult = checkRateLimit(ip, MEDIATOR_RATE_LIMIT);

  if (!rateLimitResult.allowed) {
    const retryAfter = rateLimitResult.reset - Math.ceil(Date.now() / 1000);
    const response = NextResponse.json(
      { error: "Too many requests", retryAfter: Math.max(0, retryAfter) },
      { status: 429 }
    );
    return applyRateLimitHeaders(response, rateLimitResult);
  }

  // Friendly degrade when no LLM key is configured (the panel renders `error`).
  if (!isLLMConfigured()) {
    const response = NextResponse.json(
      { error: AI_NOT_CONFIGURED_MESSAGE, code: "ai_not_configured" },
      { status: 503 }
    );
    return applyRateLimitHeaders(response, rateLimitResult);
  }

  try {
    const body = await request.json();

    if (!body.ticketId || !/^TIX-\d{3}$/.test(body.ticketId)) {
      const response = NextResponse.json(
        { error: "Invalid or missing ticketId. Expected: TIX-XXX" },
        { status: 400 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    const report = await facilitate(body.ticketId);
    if (!report) {
      const response = NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    const response = NextResponse.json({ report });
    return applyRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error("POST /api/mediator error:", error);
    const response = NextResponse.json({ error: "Internal server error" }, { status: 500 });
    return applyRateLimitHeaders(response, rateLimitResult);
  }
}
