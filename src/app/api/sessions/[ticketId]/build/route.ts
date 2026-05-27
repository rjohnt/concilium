import { NextRequest, NextResponse } from "next/server";
import { getTicket, retryBuild } from "@/lib/store";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;

  const ticket = getTicket(ticketId);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (ticket.status !== "consensus") {
    return NextResponse.json(
      {
        error: "Build can only be triggered when consensus is reached",
        currentStatus: ticket.status,
        approvals: ticket.approvals,
      },
      { status: 400 }
    );
  }

  // If we have a failed build, retry it
  if (ticket.buildState?.phase === "failed") {
    const success = retryBuild(ticketId);
    if (!success) {
      return NextResponse.json({ error: "Build retry failed" }, { status: 500 });
    }
  }

  // The build should already be triggered by the consensus check in the store,
  // but if something went wrong, we can trigger it here too.
  // The consensus check in addFeedback calls triggerBuild automatically.

  return NextResponse.json({
    success: true,
    ticketId,
    status: ticket.status,
    buildPhase: ticket.buildState?.phase,
    message: "Build pipeline initiated. Check ticket status for updates.",
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;

  const ticket = getTicket(ticketId);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json({
    ticketId,
    status: ticket.status,
    buildState: ticket.buildState,
    approvals: ticket.approvals,
    consensusProgress: `${ticket.approvals.length}/4`,
  });
}
