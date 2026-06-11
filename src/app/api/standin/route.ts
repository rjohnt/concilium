/**
 * /api/standin — Trigger AI stand-in reviews for unclaimed persona seats.
 *
 * POST { ticketId, personaId? }
 *   - With personaId: generate stand-in feedback for that one seat.
 *   - Without: generate for every AI-held seat that hasn't weighed in yet.
 *
 * Stand-in feedback is persisted server-side with source "ai-standin" and
 * returned so the client can merge it into its local store.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTicket } from "@/lib/server-db";
import { generateStandinFeedback, getPendingStandinPersonas } from "@/lib/standin";
import { PersonaId } from "@/lib/types";
import { checkRateLimit, extractIp, applyRateLimitHeaders } from "@/lib/rateLimit";
import type { RateLimitConfig } from "@/lib/types";

const STANDIN_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000, // 1 minute
  maxRequests: 5,
};

const VALID_PERSONAS: PersonaId[] = ["engineer", "designer", "product-owner", "qa"];

export async function POST(request: NextRequest) {
  const ip = extractIp(request);
  const rateLimitResult = checkRateLimit(ip, STANDIN_RATE_LIMIT);

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

    const ticket = getTicket(body.ticketId);
    if (!ticket) {
      const response = NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    // Resolve which personas to run
    let personas: PersonaId[];
    if (body.personaId) {
      if (!VALID_PERSONAS.includes(body.personaId)) {
        const response = NextResponse.json(
          { error: "Invalid personaId", valid: VALID_PERSONAS },
          { status: 400 }
        );
        return applyRateLimitHeaders(response, rateLimitResult);
      }
      const seat = ticket.seats?.[body.personaId as PersonaId];
      if (seat && seat.occupant === "human") {
        const response = NextResponse.json(
          { error: "Seat is held by a human — the stand-in is off duty for this persona." },
          { status: 409 }
        );
        return applyRateLimitHeaders(response, rateLimitResult);
      }
      personas = [body.personaId];
    } else {
      personas = getPendingStandinPersonas(ticket);
    }

    if (personas.length === 0) {
      const response = NextResponse.json({
        results: [],
        message: "No AI-held seats are waiting to weigh in.",
      });
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    // Run stand-ins sequentially so each one sees the previous one's feedback —
    // this is what makes them conversational rather than four parallel monologues.
    const results = [];
    for (const personaId of personas) {
      const result = await generateStandinFeedback(body.ticketId, personaId);
      if (result) results.push(result);
    }

    const updatedTicket = getTicket(body.ticketId);
    const response = NextResponse.json({
      results,
      ticket: updatedTicket
        ? {
            id: updatedTicket.id,
            status: updatedTicket.status,
            approvals: updatedTicket.approvals,
            feedback: updatedTicket.feedback,
          }
        : null,
    });
    return applyRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error("POST /api/standin error:", error);
    const response = NextResponse.json({ error: "Internal server error" }, { status: 500 });
    return applyRateLimitHeaders(response, rateLimitResult);
  }
}
