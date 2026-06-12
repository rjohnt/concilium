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
      const ticket = await serverDb.getTicket(id);
      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }
      return NextResponse.json({ ticket });
    }

    const tickets = await serverDb.getTickets();
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
    const ticket = await serverDb.createTicket(
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

    // Project assignment: null clears, otherwise must be a known PRJ-XXX id
    if (body.projectId !== undefined && body.projectId !== null) {
      if (typeof body.projectId !== "string" || !/^PRJ-\d{3}$/.test(body.projectId)) {
        return NextResponse.json(
          { error: "Invalid projectId format. Expected: PRJ-XXX" },
          { status: 400 }
        );
      }
      const project = await serverDb.getProject(body.projectId);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    // Branch override: null/empty clears, otherwise a conservative branch name
    if (body.branchOverride !== undefined && body.branchOverride !== null && body.branchOverride !== "") {
      if (
        typeof body.branchOverride !== "string" ||
        !/^[A-Za-z0-9._/-]{1,200}$/.test(body.branchOverride.trim())
      ) {
        return NextResponse.json(
          { error: "Invalid branchOverride: must be a valid branch name" },
          { status: 400 }
        );
      }
      body.branchOverride = body.branchOverride.trim();
    }

    const ticket = await serverDb.updateTicket(id, {
      title: body.title,
      description: body.description,
      dueDate: body.dueDate !== undefined ? body.dueDate : undefined,
      priority: body.priority,
      status: body.status,
      tags: body.tags,
      seats: body.seats,
      projectId: body.projectId !== undefined ? body.projectId : undefined,
      branchOverride: body.branchOverride !== undefined ? body.branchOverride || null : undefined,
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

    const deleted = await serverDb.deleteTicket(id);
    if (!deleted) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tickets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
