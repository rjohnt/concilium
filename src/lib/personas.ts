import { Persona, PersonaId, Ticket, AIPromptResponse } from "./types";

export const PERSONAS: Record<PersonaId, Persona> = {
  engineer: {
    id: "engineer",
    label: "Engineer",
    emoji: "⚙️",
    color: "bg-blue-600",
    expertise:
      "Technical feasibility, architecture, implementation approach, and code quality.",
    promptTemplate: `You are weighing in as the Engineer on this feature ticket.

Consider:
- Is this technically feasible given our stack?
- What architecture approach would you recommend?
- Are there hidden complexity or scope concerns?
- What dependencies or prerequisites exist?

Provide your assessment:`,
  },
  designer: {
    id: "designer",
    label: "Designer",
    emoji: "🎨",
    color: "bg-purple-600",
    expertise:
      "User experience, visual design, interaction patterns, and accessibility.",
    promptTemplate: `You are weighing in as the Designer on this feature ticket.

Consider:
- How should the user flow work?
- What interaction patterns make sense?
- Are there accessibility concerns to address?
- Does this fit with our design system?

Provide your assessment:`,
  },
  "product-owner": {
    id: "product-owner",
    label: "Product Owner",
    emoji: "📋",
    color: "bg-emerald-600",
    expertise:
      "Business value, priority, scope definition, and stakeholder alignment.",
    promptTemplate: `You are weighing in as the Product Owner on this feature ticket.

Consider:
- What is the business value and user impact?
- Is the scope appropriately defined?
- What is the priority relative to other work?
- Are there stakeholders we should consult?

Provide your assessment:`,
  },
  qa: {
    id: "qa",
    label: "QA",
    emoji: "🧪",
    color: "bg-amber-600",
    expertise:
      "Edge cases, test scenarios, acceptance criteria, and quality gates.",
    promptTemplate: `You are weighing in as QA on this feature ticket.

Consider:
- What edge cases should we test?
- What are the acceptance criteria?
- Are there regression risks to consider?
- What test scenarios cover the critical paths?

Provide your assessment:`,
  },
};

export function getPersona(id: PersonaId): Persona {
  return PERSONAS[id];
}

export function getAllPersonas(): Persona[] {
  return Object.values(PERSONAS);
}

// === AI Feedback Generation ===
//
// This is a template-driven mock that produces persona-specific analysis
// based on the ticket context. In production, this would be replaced with
// an LLM API call (OpenAI, Anthropic, or Hermes Agent delegation).
//
// The response structure mirrors what a real LLM would return, so swapping
// is a drop-in change — just replace the body with an API call.

interface AIFeedbackTemplate {
  opening: string;
  analysisPoints: (ticket: Ticket) => string[];
  approvalStance: (ticket: Ticket) => boolean;
  confidence: number;
}

function extractKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

const ENGINEER_TEMPLATE: AIFeedbackTemplate = {
  opening: "From an engineering perspective, let me assess the technical aspects:",
  analysisPoints: (ticket: Ticket) => {
    const keywords = extractKeywords(ticket.title);
    const points: string[] = [];

    if (keywords.some((k) => ["real-time", "websocket", "collaborative", "cursor"].includes(k))) {
      points.push(
        "This requires real-time infrastructure. WebSocket (via Socket.io or raw WS) is the pragmatic choice for cursor streaming. Server-side presence tracking with Redis pub/sub for horizontal scaling."
      );
      points.push(
        "Bandwidth consideration: raw cursor positions at 60fps would be ~2KB/s per user. Throttling to 15fps with interpolation on the client side reduces this to ~500B/s — acceptable for most deployments."
      );
    } else if (keywords.some((k) => ["dark", "mode", "theme", "toggle"].includes(k))) {
      points.push(
        "CSS custom properties (variables) approach is clean: define a `data-theme` attribute on `<html>`. Use `prefers-color-scheme` media query for system default detection, with localStorage as the override layer."
      );
      points.push(
        "Architecture: theme context provider at root, CSS variable injection, persistent preference in localStorage. Transition concerns: use `prefers-reduced-motion` to disable transitions for accessibility."
      );
    } else if (keywords.some((k) => ["api", "rate", "limit", "tenant"].includes(k))) {
      points.push(
        "Token bucket algorithm is the standard approach. Per-tenant buckets stored in Redis with configurable refill rates. Plan for ~10K buckets at steady state."
      );
      points.push(
        "Middleware hook at the API gateway level — before request reaches handlers. Return 429 with `Retry-After` header. Need dashboard for ops to monitor/override limits."
      );
    } else if (keywords.some((k) => ["export", "pdf", "dashboard", "report"].includes(k))) {
      points.push(
        "Server-side PDF generation recommended (Puppeteer or Playwright for Chrome headless rendering). Client-side libraries (jsPDF) struggle with complex chart rendering."
      );
      points.push(
        "Architecture: queue-based rendering with status callbacks. Render HTML → capture screenshot → embed in PDF template. Consider async pattern for reports that take >5s to generate."
      );
    } else {
      points.push(
        `The ${ticket.title} feature requires careful scoping. Let's identify the core user path and build that first before expanding.`
      );
      points.push(
        "Standard web stack is appropriate here. No unusual infrastructure requirements based on the description. Recommend starting with a spike/prototype to validate assumptions."
      );
    }

    points.push(
      "Dependencies: no new external services required. Existing infrastructure should handle this. Integration surface is limited to the areas described in the ticket."
    );

    return points;
  },
  approvalStance: (ticket: Ticket) => {
    const keywords = extractKeywords(ticket.title);
    // Engineer tends to approve straightforward features, flag complex ones
    return !keywords.some((k) =>
      ["real-time", "streaming", "collaborative", "ai"].includes(k)
    );
  },
  confidence: 0.82,
};

const DESIGNER_TEMPLATE: AIFeedbackTemplate = {
  opening: "Looking at this from a design and UX perspective:",
  analysisPoints: (ticket: Ticket) => {
    const keywords = extractKeywords(ticket.title);
    const points: string[] = [];

    if (keywords.some((k) => ["dark", "mode", "theme", "toggle"].includes(k))) {
      points.push(
        "Color palette: use a cool gray base (#0f0f0f for backgrounds, never pure #000). Surface colors should step at #1a1a1a, #242424, #2e2e2e. Text hierarchy: #e0e0e0 primary, #a0a0a0 secondary."
      );
      points.push(
        "Toggle design: sun/moon icon transition is the expected pattern. Position: settings panel header, consistent with material design placement. Add smooth 300ms color transition on the icon swap."
      );
    } else if (keywords.some((k) => ["cursor", "whiteboard", "collaborative"].includes(k))) {
      points.push(
        "Cursor design: use a filled circle with a subtle 2px white stroke for contrast against any background. Each user gets an assigned color from a predefined palette (8 distinct colors, tested for colorblind accessibility)."
      );
      points.push(
        "Name label should appear on hover or after a 500ms idle period to reduce visual noise. Consider showing a subtle trail (last 3 positions) for context of cursor movement direction."
      );
    } else if (keywords.some((k) => ["export", "pdf", "report", "dashboard"].includes(k))) {
      points.push(
        "PDF layout: branded header with logo + report title. Keep the dashboard's visual hierarchy — KPI cards at top, charts below. 2-column grid for charts to use horizontal space efficiently."
      );
      points.push(
        "Accessibility: ensure generated PDFs meet WCAG 2.1 AA contrast ratios. Include alt text for charts. Test with screen readers on the generated output."
      );
    } else {
      points.push(
        "User flow should be intuitive — minimize clicks to the core action. Progressive disclosure: show only what's needed at each step."
      );
      points.push(
        "Interaction patterns: follow established conventions. Don't reinvent the wheel — users should recognize patterns from other products they use daily."
      );
    }

    points.push(
      "Accessibility: ensure keyboard navigation works for all interactions. Color contrast ratios should meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)."
    );

    return points;
  },
  approvalStance: () => true, // Designer generally approves if the UX makes sense
  confidence: 0.78,
};

const PO_TEMPLATE: AIFeedbackTemplate = {
  opening: "Evaluating this from a product and business perspective:",
  analysisPoints: (ticket: Ticket) => {
    const keywords = extractKeywords(ticket.title);
    const points: string[] = [];

    if (keywords.some((k) => ["dark", "mode", "theme"].includes(k))) {
      points.push(
        "Dark mode is consistently a top-5 user request across our products. Implementing it has measurable impact on user satisfaction (NPS +3-5 points based on competitor data) and reduces eye strain complaints by ~40%."
      );
      points.push(
        "Priority: Medium-High. Not blocking any revenue, but impacts user retention for power users who work late. Scope: start with core surfaces (dashboard, settings, tickets) and expand iteratively."
      );
    } else if (keywords.some((k) => ["cursor", "collaborative", "whiteboard"].includes(k))) {
      points.push(
        "This is our #1 enterprise blocker. 3 enterprise deals in pipeline are waiting on this feature. Revenue impact: ~$450K ARR. P0 priority — needs to ship this quarter."
      );
      points.push(
        "MVP scope: cursor positions only. No chat, no annotations, no presence indicators beyond cursor. Those are follow-on tickets. Ship the core experience fast."
      );
    } else {
      points.push(
        "User story: 'As a [user type], I want [capability] so that [outcome].' Let's make sure this ticket has a clear user story before proceeding."
      );
      points.push(
        "Success metrics: define 2-3 measurable outcomes before building. What does 'done and successful' look like in numbers?"
      );
    }

    return points;
  },
  approvalStance: (ticket: Ticket) => {
    const keywords = extractKeywords(ticket.title);
    // PO approves high-value items, wants more info on others
    return keywords.some((k) =>
      ["cursor", "collaborative", "dark", "mode", "enterprise"].includes(k)
    );
  },
  confidence: 0.75,
};

const QA_TEMPLATE: AIFeedbackTemplate = {
  opening: "QA assessment — let me identify the testing surface:",
  analysisPoints: (ticket: Ticket) => {
    const keywords = extractKeywords(ticket.title);
    const points: string[] = [];

    points.push("Test matrix:");
    points.push("- Unit tests: core logic and state transitions");
    points.push("- Integration tests: component interactions and API contracts");

    if (keywords.some((k) => ["dark", "mode", "theme"].includes(k))) {
      points.push("- Visual regression: screenshot comparison across all breakpoints in both themes");
      points.push("- Cross-browser: Chrome, Firefox, Safari, Edge (latest 2 versions)");
      points.push("- Edge case: what happens when localStorage is full or disabled? Graceful fallback to system preference.");
      points.push("- Accessibility: verify contrast ratios automatically via axe-core or Lighthouse CI in the pipeline.");
    } else if (keywords.some((k) => ["cursor", "collaborative", "real-time"].includes(k))) {
      points.push("- Load test: 50 concurrent cursors on a single whiteboard — measure frame drops and latency");
      points.push("- Network conditions: test on 3G, packet loss, and disconnection/reconnection scenarios");
      points.push("- Race conditions: what happens when two users' cursors occupy the same position?");
    } else {
      points.push("- Happy path: verify the core user flow works end-to-end");
      points.push("- Edge cases: empty state, error state, loading state, maximum input lengths");
      points.push("- Regression: run the full regression suite to catch unintended side effects");
    }

    points.push(
      "Acceptance criteria: each criterion should be independently verifiable. Avoid compound criteria ('X and Y work') — split them."
    );

    return points;
  },
  approvalStance: () => false, // QA rarely approves on first pass — always finds something
  confidence: 0.88,
};

const TEMPLATES: Record<PersonaId, AIFeedbackTemplate> = {
  engineer: ENGINEER_TEMPLATE,
  designer: DESIGNER_TEMPLATE,
  "product-owner": PO_TEMPLATE,
  qa: QA_TEMPLATE,
};

export function generateAIFeedback(
  ticket: Ticket,
  personaId: PersonaId
): AIPromptResponse {
  const persona = getPersona(personaId);
  const template = TEMPLATES[personaId];

  const analysisPoints = template.analysisPoints(ticket);

  // Build the feedback by composing the opening + analysis points
  const feedback = [
    template.opening,
    "",
    ...analysisPoints.map((p, i) => `${i + 1}. ${p}`),
  ].join("\n");

  // Generate reasoning based on persona's expertise
  const reasoning = `As ${persona.label}, I focused on ${persona.expertise.toLowerCase()} The analysis was generated by examining the ticket title/description and applying domain-specific heuristics for this persona's concerns.`;

  return {
    personaId,
    feedback,
    recommendedApproval: template.approvalStance(ticket),
    reasoning,
    confidence: template.confidence,
  };
}
