import { Persona, PersonaId, Ticket, FeedbackEntry } from "./types";
import { getPersona, getAllPersonas } from "./personas";
import { getTicket, getFeedbackHistory } from "./store";
import { checkConsensusThreshold } from "./consensus-threshold";

// === Mediator Engine ===
//
// The mediator is the AI "brain" that sits between the user and the ticket.
// It takes user input, re-frames it through the lens of the selected persona,
// and generates structured, persona-aware feedback.
//
// Currently rules-based — designed to be swapped for a real LLM via the same interface.

export interface MediatorContext {
  ticketId: string;
  personaId: PersonaId;
  sessionHistory: FeedbackEntry[];
  consensusReached: boolean;
  approvedCount: number;
  totalPersonas: number;
}

export interface MediatorResponse {
  /** The AI-refined feedback, ready for submission */
  refinedFeedback: string;
  /** Persona-specific concerns surfaced from the analysis */
  concerns: string[];
  /** Persona-specific recommendations */
  recommendations: string[];
  /** Follow-up questions to deepen the conversation */
  followUpQuestions: string[];
  /** Whether the mediator recommends approval based on analysis */
  suggestApproval: boolean;
  /** Reasoning for the approval suggestion */
  approvalReasoning: string;
  /** Suggested next persona to weigh in (based on who hasn't yet) */
  suggestedNextPersona: PersonaId | null;
  /** Metadata about the mediation */
  meta: {
    mediationType: "rules-based" | "ai";
    processedAt: string;
    inputLength: number;
  };
}

function buildContext(ticketId: string, personaId: PersonaId): MediatorContext | null {
  const ticket = getTicket(ticketId);
  if (!ticket) return null;

  const history = getFeedbackHistory(ticketId);
  const consensus = checkConsensusThreshold(ticket);

  return {
    ticketId,
    personaId,
    sessionHistory: history,
    consensusReached: consensus.reached,
    approvedCount: ticket.approvals.length,
    totalPersonas: getAllPersonas().length,
  };
}

/**
 * Mediate a user message through the selected persona lens.
 * This is the main entry point — call this from the API route.
 */
export function mediate(
  ticketId: string,
  personaId: PersonaId,
  userMessage: string
): { response: MediatorResponse; context: MediatorContext } | null {
  const context = buildContext(ticketId, personaId);
  if (!context) return null;

  const ticket = getTicket(ticketId)!;
  const persona = getPersona(personaId);

  const response = generateResponse(ticket, persona, userMessage, context);

  return { response, context };
}

/**
 * Continue an existing mediation session — takes the last AI response
 * and the user's follow-up, generates the next round.
 */
export function continueMediation(
  ticketId: string,
  personaId: PersonaId,
  userMessage: string,
  previousResponse: MediatorResponse
): { response: MediatorResponse; context: MediatorContext } | null {
  const context = buildContext(ticketId, personaId);
  if (!context) return null;

  const ticket = getTicket(ticketId)!;
  const persona = getPersona(personaId);

  // For continued conversation, deepen the analysis
  const response = generateDeepenedResponse(
    ticket,
    persona,
    userMessage,
    previousResponse,
    context
  );

  return { response, context };
}

// === Response Generation ===

function generateResponse(
  ticket: Ticket,
  persona: Persona,
  userMessage: string,
  context: MediatorContext
): MediatorResponse {
  const concerns = extractConcerns(persona, userMessage, ticket);
  const recommendations = generateRecommendations(persona, userMessage, ticket);
  const followUps = generateFollowUps(persona, context);
  const { suggestApproval, reasoning } = evaluateApproval(
    persona,
    userMessage,
    context
  );

  // Build refined feedback by combining the user's message with persona framing
  const refinedFeedback = buildRefinedFeedback(
    persona,
    userMessage,
    concerns,
    recommendations
  );

  return {
    refinedFeedback,
    concerns,
    recommendations,
    followUpQuestions: followUps,
    suggestApproval,
    approvalReasoning: reasoning,
    suggestedNextPersona: findNextPersona(context),
    meta: {
      mediationType: "rules-based",
      processedAt: new Date().toISOString(),
      inputLength: userMessage.length,
    },
  };
}

function generateDeepenedResponse(
  ticket: Ticket,
  persona: Persona,
  userMessage: string,
  prev: MediatorResponse,
  context: MediatorContext
): MediatorResponse {
  // Build on the previous response — acknowledge earlier points, go deeper
  const concerns = [
    ...extractConcerns(persona, userMessage, ticket),
    ...prev.concerns.filter((c) => !userMessage.includes(c.slice(0, 20))),
  ].slice(0, 5);

  const recommendations = [
    ...generateRecommendations(persona, userMessage, ticket),
    ...prev.recommendations,
  ].slice(0, 5);

  // Generate new follow-ups based on the continued conversation
  const deepenedFollowUps = generateDeepenedFollowUps(persona, prev, context);

  const { suggestApproval, reasoning } = evaluateApproval(
    persona,
    userMessage,
    context
  );

  const refinedFeedback = buildRefinedFeedback(
    persona,
    userMessage,
    concerns,
    recommendations
  );

  return {
    refinedFeedback,
    concerns,
    recommendations,
    followUpQuestions: deepenedFollowUps,
    suggestApproval,
    approvalReasoning: reasoning,
    suggestedNextPersona: findNextPersona(context),
    meta: {
      mediationType: "rules-based",
      processedAt: new Date().toISOString(),
      inputLength: userMessage.length,
    },
  };
}

// === Analysis Functions ===

function extractConcerns(
  persona: Persona,
  message: string,
  ticket: Ticket
): string[] {
  const concerns: string[] = [];
  const lower = message.toLowerCase();

  switch (persona.id) {
    case "engineer":
      if (lower.includes("complex") || lower.includes("hard") || lower.includes("difficult"))
        concerns.push("Implementation complexity needs to be scoped carefully — consider a phased rollout.");
      if (lower.includes("dependency") || lower.includes("depend"))
        concerns.push("Dependency management could introduce blocking risks — verify all prerequisites are available.");
      if (lower.includes("performance") || lower.includes("slow"))
        concerns.push("Performance implications should be benchmarked before committing to an approach.");
      if (lower.includes("test") || lower.includes("coverage"))
        concerns.push("Testing strategy needs definition — consider unit, integration, and e2e coverage targets.");
      if (!concerns.length)
        concerns.push("Technical feasibility should be validated with a spike before full implementation.");
      break;

    case "designer":
      if (lower.includes("mobile") || lower.includes("responsive"))
        concerns.push("Responsive behavior needs explicit breakpoint definitions — don't assume desktop patterns translate.");
      if (lower.includes("accessibility") || lower.includes("a11y"))
        concerns.push("Accessibility must meet WCAG 2.1 AA minimum — keyboard nav, screen readers, color contrast.");
      if (lower.includes("animation") || lower.includes("transition"))
        concerns.push("Animations should respect prefers-reduced-motion and not block interaction.");
      if (!concerns.length)
        concerns.push("User flow and interaction states (loading, empty, error, edge cases) need deliberate design.");
      break;

    case "product-owner":
      if (lower.includes("scope") || lower.includes("creep"))
        concerns.push("Scope creep is a risk — define MVP vs. nice-to-have clearly before building.");
      if (lower.includes("stakeholder") || lower.includes("feedback"))
        concerns.push("Stakeholder alignment should be confirmed before development starts.");
      if (lower.includes("timeline") || lower.includes("deadline"))
        concerns.push("Timeline pressure shouldn't compromise quality — scope can be adjusted if needed.");
      if (!concerns.length)
        concerns.push("Business value should be quantifiable — define success metrics before building.");
      break;

    case "qa":
      if (lower.includes("edge") || lower.includes("corner"))
        concerns.push("Edge cases need explicit enumeration — don't rely on developer intuition.");
      if (lower.includes("regression"))
        concerns.push("Regression risk should be assessed — identify which existing features could be impacted.");
      if (lower.includes("state") || lower.includes("race"))
        concerns.push("State management and race conditions are common failure points — plan test scenarios.");
      if (!concerns.length)
        concerns.push("Acceptance criteria should be defined as testable, verifiable statements.");
      break;
  }

  return concerns;
}

function generateRecommendations(
  persona: Persona,
  message: string,
  ticket: Ticket
): string[] {
  const recs: string[] = [];

  switch (persona.id) {
    case "engineer":
      recs.push("Start with a technical design doc covering architecture decisions and trade-offs.");
      recs.push("Create a proof-of-concept branch for risky components before committing to a design.");
      if (ticket.priority <= 1)
        recs.push("Given the high priority, consider parallelizing independent workstreams.");
      break;

    case "designer":
      recs.push("Create low-fidelity wireframes first — validate flow before visual polish.");
      recs.push("Document interaction states: loading, empty, error, success, and edge cases.");
      recs.push("Run a quick design review with at least one other team member before implementation.");
      break;

    case "product-owner":
      recs.push("Write user stories that capture the 'why' — not just the 'what'.");
      recs.push("Define success criteria that are measurable (e.g., 'reduces time to X by Y%').");
      recs.push("Consider phased delivery: what's the smallest version that delivers value?");
      break;

    case "qa":
      recs.push("Create a test matrix covering browsers, devices, and user roles.");
      recs.push("Write automated tests for critical paths; manual testing for exploratory edge cases.");
      recs.push("Define rollback criteria — what constitutes a failed deployment?");
      break;
  }

  return recs;
}

function generateFollowUps(
  persona: Persona,
  context: MediatorContext
): string[] {
  const followUps: string[] = [];
  const ticket = getTicket(context.ticketId)!;

  // Persona-specific probing questions
  switch (persona.id) {
    case "engineer":
      followUps.push("What's your estimated level of effort for this? Is there a simpler approach?");
      followUps.push("Are there any technical unknowns that need research spikes?");
      if (context.sessionHistory.length > 0)
        followUps.push("How does the existing feedback from other personas affect your technical approach?");
      break;
    case "designer":
      followUps.push("What user research or data supports this design direction?");
      followUps.push("How does this fit into the broader product experience?");
      if (context.sessionHistory.length > 0)
        followUps.push("Have you reviewed the other personas' input — any design constraints they've surfaced?");
      break;
    case "product-owner":
      followUps.push("What's the expected impact on key metrics or user satisfaction?");
      followUps.push("Are there dependencies on other teams or features that should be flagged?");
      break;
    case "qa":
      followUps.push("What are the highest-risk areas that need the most thorough testing?");
      followUps.push("What's the minimum test coverage you'd consider acceptable for release?");
      break;
  }

  // Always ask about consensus if not yet reached
  if (!context.consensusReached) {
    followUps.push(
      `Only ${context.approvedCount}/${context.totalPersonas} personas have approved. Would you like to address any concerns before final approval?`
    );
  }

  return followUps.slice(0, 4);
}

function generateDeepenedFollowUps(
  persona: Persona,
  prev: MediatorResponse,
  context: MediatorContext
): string[] {
  const followUps: string[] = [];

  // Reference previous concerns
  if (prev.concerns.length > 0) {
    followUps.push(
      `You mentioned concerns about "${prev.concerns[0].slice(0, 60)}..." — can you elaborate on specific mitigation strategies?`
    );
  }

  // Ask about the bigger picture
  switch (persona.id) {
    case "engineer":
      followUps.push("If you were to implement this, what's the riskiest piece? What would you spike first?");
      break;
    case "designer":
      followUps.push("What would the ideal user experience look like if there were no constraints?");
      break;
    case "product-owner":
      followUps.push("How would you prioritize this against the current backlog?");
      break;
    case "qa":
      followUps.push("If you had to test this in 50% of the normal time, what would you focus on?");
      break;
  }

  return followUps.slice(0, 3);
}

function evaluateApproval(
  persona: Persona,
  message: string,
  context: MediatorContext
): { suggestApproval: boolean; reasoning: string } {
  const lower = message.toLowerCase();
  const positiveWords = [
    "approve", "looks good", "good to go", "ship it", "ready",
    "agree", "makes sense", "lgtm", "fine", "solid",
  ];
  const negativeWords = [
    "block", "blocker", "can't approve", "disagree", "concern",
    "issue", "problem", "rework", "not ready", "needs work",
  ];

  const hasPositive = positiveWords.some((w) => lower.includes(w));
  const hasNegative = negativeWords.some((w) => lower.includes(w));
  const substantial = message.length > 80;

  if (hasNegative) {
    return {
      suggestApproval: false,
      reasoning: `Input indicates concerns that should be addressed before ${persona.label} approves.`,
    };
  }

  if (hasPositive && substantial) {
    return {
      suggestApproval: true,
      reasoning: `${persona.label}'s feedback is comprehensive and indicates readiness for approval.`,
    };
  }

  if (hasPositive && !substantial) {
    return {
      suggestApproval: false,
      reasoning: `Positive sentiment noted, but ${persona.label} should provide more detailed feedback before approving.`,
    };
  }

  // Default: neutral
  return {
    suggestApproval: false,
    reasoning: `Review the refined feedback and confirm ${persona.label}'s assessment before approving.`,
  };
}

function findNextPersona(context: MediatorContext): PersonaId | null {
  const allPersonas = getAllPersonas();
  const ticket = getTicket(context.ticketId);
  if (!ticket) return null;

  const personasWithFeedback = new Set(
    context.sessionHistory.map((f) => f.personaId)
  );

  // Find first persona that hasn't provided feedback and isn't the current one
  for (const p of allPersonas) {
    if (p.id !== context.personaId && !personasWithFeedback.has(p.id)) {
      return p.id;
    }
  }

  // All have provided feedback — suggest the one farthest from approval
  for (const p of allPersonas) {
    if (p.id !== context.personaId && !ticket.approvals.includes(p.id)) {
      return p.id;
    }
  }

  return null; // Everyone has provided feedback and approved
}

function buildRefinedFeedback(
  persona: Persona,
  userMessage: string,
  concerns: string[],
  recommendations: string[]
): string {
  // Frame the user's message in the persona's voice, adding structured sections
  const sections: string[] = [];

  // Opening: persona-framed restatement
  sections.push(
    `**${persona.emoji} ${persona.label} Assessment:**\n\n${userMessage.trim()}`
  );

  // Concerns section
  if (concerns.length > 0) {
    sections.push(
      `\n**⚠️ Concerns Identified:**\n${concerns.map((c) => `- ${c}`).join("\n")}`
    );
  }

  // Recommendations section
  if (recommendations.length > 0) {
    sections.push(
      `\n**💡 Recommendations:**\n${recommendations.map((r) => `- ${r}`).join("\n")}`
    );
  }

  return sections.join("\n");
}
