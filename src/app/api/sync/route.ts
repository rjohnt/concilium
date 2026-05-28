/**
 * /api/sync — Data synchronization endpoint.
 *
 * GET  /api/sync — Pull all tickets from server (for client initial load)
 * POST /api/sync — Push client data to server (for seed/migration)
 */

import { NextRequest, NextResponse } from "next/server";
import * as serverDb from "@/lib/server-db";
import { Ticket } from "@/lib/types";

export async function GET() {
  try {
    const tickets = serverDb.getTickets();
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("GET /api/sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      tickets?: Ticket[];
      nextTicketId?: number;
      nextFeedbackId?: number;
      nextBuildReportId?: number;
    };

    if (!body.tickets || !Array.isArray(body.tickets)) {
      return NextResponse.json(
        { error: "Missing required field: tickets (array)" },
        { status: 400 }
      );
    }

    const result = serverDb.seedFromClientData({
      tickets: body.tickets,
      nextTicketId: body.nextTicketId || 1,
      nextFeedbackId: body.nextFeedbackId || 1,
      nextBuildReportId: body.nextBuildReportId || 1,
    });

    return NextResponse.json({
      imported: result.imported,
      total: serverDb.getTickets().length,
    });
  } catch (error) {
    console.error("POST /api/sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
