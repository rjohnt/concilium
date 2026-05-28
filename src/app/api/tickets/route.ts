/**
 * /api/tickets — RESTful CRUD for tickets backed by SQLite.
 *
 * GET  /api/tickets        — list all tickets
 * GET  /api/tickets?id=X   — get single ticket by ID
 * POST /api/tickets        — create a new ticket
 * PATCH /api/tickets?id=X  — update ticket fields
 * DELETE /api/tickets?id=X — delete a ticket
 */

import { NextRequest, NextResponse } from "next/server";
import * as serverDb from "@/lib/server-db";
import { PriorityLevel } from "@/lib/types";
import { sanitize } from "@/lib/sanitize";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const ticket = serverDb.getTicket(id);
      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }
      return NextResponse.json({ ticket });
    }

    const tickets = serverDb.getTickets();
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("GET /api/tickets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json(
        { error: "Missing required field: title (string)" },
        { status: 400 }
      );
    }

    // Sanitize user-supplied string fields against XSS
    body.title = sanitize(body.title);
    if (typeof body.description === "string") {
      body.description = sanitize(body.description);
    }

    const priority = typeof body.priority === "number" ? (body.priority as PriorityLevel) : 2;
    const ticket = serverDb.createTicket(
      body.title,
      body.description || "",
      priority,
      body.dueDate || undefined,
      body.tags || [],
      body.id || undefined,
    );

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tickets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing ticket id query parameter" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Sanitize user-supplied string fields against XSS
    if (typeof body.title === "string") body.title = sanitize(body.title);
    if (typeof body.description === "string") body.description = sanitize(body.description);

    const ticket = serverDb.updateTicket(id, {
      title: body.title,
      description: body.description,
      dueDate: body.dueDate !== undefined ? body.dueDate : undefined,
      priority: body.priority,
      status: body.status,
      tags: body.tags,
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("PATCH /api/tickets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing ticket id query parameter" },
        { status: 400 }
      );
    }

    const deleted = serverDb.deleteTicket(id);
    if (!deleted) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tickets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
