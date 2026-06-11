/**
 * /api/change-request — Role-scoped change requests on a completed build.
 *
 * POST { ticketId, personaId, content } → appends a BuildChangeRequest to the
 * ticket's latest build report. Unresolved requests become delta context for
 * the next build round (consumed by POST /api/build).
 */

import { NextRequest, NextResponse } from "next/server";
import { getTicket, setBuildReport } from "@/lib/server-db";
import { BuildChangeRequest, PersonaId } from "@/lib/types";
import { checkRateLimit, extractIp, applyRateLimitHeaders } from "@/lib/rateLimit";
import type { RateLimitConfig } from "@/lib/types";
import { sanitize } from "@/lib/sanitize";

const CHANGE_REQUEST_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 10,
};

const VALID_PERSONAS: PersonaId[] = ["engineer", "designer", "product-owner", "qa"];

export async function POST(request: NextRequest) {
  const ip = extractIp(request);
  const rateLimitResult = checkRateLimit(ip, CHANGE_REQUEST_RATE_LIMIT);

  if (!rateLimitResult.allowed) {
    const retryAfter = rateLimitResult.reset - Math.ceil(Date.now() / 1000);
    const response = NextResponse.json(
      { error: "Too many requests", retryAfter: Math.max(0, retryAfter) },
      { status: 429 }
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
    if (!VALID_PERSONAS.includes(body.personaId)) {
      const response = NextResponse.json(
        { error: "Invalid personaId", valid: VALID_PERSONAS },
        { status: 400 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }
    if (!body.content || typeof body.content !== "string" || !body.content.trim()) {
      const response = NextResponse.json(
        { error: "Missing required field: content" },
        { status: 400 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    const ticket = await getTicket(body.ticketId);
    if (!ticket) {
      const response = NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      return applyRateLimitHeaders(response, rateLimitResult);
    }
    if (!ticket.buildReport) {
      const response = NextResponse.json(
        { error: "Ticket has no build report to request changes on" },
        { status: 409 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    const changeRequest: BuildChangeRequest = {
      id: `CR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      personaId: body.personaId,
      content: sanitize(body.content.trim()),
      createdAt: new Date().toISOString(),
    };

    const report = {
      ...ticket.buildReport,
      changeRequests: [...(ticket.buildReport.changeRequests ?? []), changeRequest],
    };
    await setBuildReport(body.ticketId, report);

    const response = NextResponse.json({ changeRequest, buildReport: report }, { status: 201 });
    return applyRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error("POST /api/change-request error:", error);
    const response = NextResponse.json({ error: "Internal server error" }, { status: 500 });
    return applyRateLimitHeaders(response, rateLimitResult);
  }
}
