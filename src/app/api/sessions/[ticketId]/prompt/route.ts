import { NextRequest, NextResponse } from "next/server";
import { PersonaId, AIPromptResponse } from "@/lib/types";
import { getTicket } from "@/lib/store";
import { getPersona, generateAIFeedback } from "@/lib/personas";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;

  try {
    const body = await request.json();
    const personaId = body.personaId as PersonaId;

    if (!personaId || !["engineer", "designer", "product-owner", "qa"].includes(personaId)) {
      return NextResponse.json(
        { error: "Invalid personaId. Must be one of: engineer, designer, product-owner, qa" },
        { status: 400 }
      );
    }

    const ticket = getTicket(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const persona = getPersona(personaId);
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 400 });
    }

    // Generate AI feedback using the persona's prompt template + ticket context
    const aiResponse: AIPromptResponse = generateAIFeedback(ticket, personaId);

    // Add a small delay to simulate LLM latency (makes the UX feel real)
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error("AI prompt error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI feedback" },
      { status: 500 }
    );
  }
}
