/**
 * /api/feedback — RESTful API for feedback backed by SQLite.
 *
 * GET  /api/feedback?ticketId=X          — list feedback for a ticket
 * POST /api/feedback                     — add feedback to a ticket
 * GET  /api/feedback/sync?ticketId=X     — get full ticket snapshot for client sync
 */

import { NextRequest, NextResponse } from "next/server";
import * as serverDb from "@/lib/server-db";
import { PersonaId } from "@/lib/types";
import { sanitize } from "@/lib/sanitize";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId");

    if (!ticketId) {
      return NextResponse.json(
        { error: "Missing ticketId query parameter" },
        { status: 400 }
      );
    }

    const ticket = await serverDb.getTicket(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const feedback = await serverDb.getFeedbackHistory(ticketId);

    return NextResponse.json({
      feedback,
      ticket: {
        id: ticket.id,
        status: ticket.status,
        approvals: ticket.approvals,
        buildReport: ticket.buildReport,
      },
    });
  } catch (error) {
    console.error("GET /api/feedback error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.ticketId || !body.personaId || !body.content) {
      return NextResponse.json(
        { error: "Missing required fields: ticketId, personaId, content" },
        { status: 400 }
      );
    }

    const validPersonas: PersonaId[] = ["engineer", "designer", "product-owner", "qa"];
    if (!validPersonas.includes(body.personaId)) {
      return NextResponse.json(
        { error: `Invalid personaId. Must be one of: ${validPersonas.join(", ")}` },
        { status: 400 }
      );
    }

    // Sanitize user-supplied feedback content against XSS
    body.content = sanitize(body.content);

    const approved = body.approved === true;
    const source = body.source === "ai-standin" ? "ai-standin" : "human";

    const entry = await serverDb.addFeedback(
      body.ticketId,
      body.personaId as PersonaId,
      body.content,
      approved,
      source,
    );

    if (!entry) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Return the full ticket state so the client can sync
    const ticket = await serverDb.getTicket(body.ticketId);
    const feedback = await serverDb.getFeedbackHistory(body.ticketId);

    return NextResponse.json(
      {
        feedback: entry,
        ticket: ticket
          ? {
              id: ticket.id,
              status: ticket.status,
              approvals: ticket.approvals,
              buildReport: ticket.buildReport,
              feedback,
            }
          : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/feedback error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
