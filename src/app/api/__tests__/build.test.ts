import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

vi.mock("@/lib/llm", () => ({
  callDeepSeek: vi.fn(),
  DEEPSEEK_PRO_MODEL: "deepseek-v4-pro",
  isLLMConfigured: vi.fn(() => true),
  AI_NOT_CONFIGURED_MESSAGE: "AI features aren't configured on this server",
}));

vi.mock("@/lib/server-db", () => {
  const mockTickets: Map<string, Record<string, unknown>> = new Map();
  return {
    getTicket: vi.fn((id: string) => mockTickets.get(id) ?? undefined),
    getFeedbackHistory: vi.fn(() => []),
    setBuildReport: vi.fn(),
    getAllPersonas: vi.fn(() => [
      { id: "engineer", label: "Engineer", emoji: "⚙️", color: "bg-blue-600", expertise: "Tech", promptTemplate: "" },
      { id: "designer", label: "Designer", emoji: "🎨", color: "bg-purple-600", expertise: "UX", promptTemplate: "" },
      { id: "product-owner", label: "Product Owner", emoji: "📋", color: "bg-emerald-600", expertise: "Biz", promptTemplate: "" },
      { id: "qa", label: "QA", emoji: "🧪", color: "bg-amber-600", expertise: "Tests", promptTemplate: "" },
    ]),
  };
});

vi.mock("@/lib/personas", () => ({
  getAllPersonas: vi.fn(() => [
    { id: "engineer", label: "Engineer", emoji: "⚙️", color: "bg-blue-600", expertise: "Tech", promptTemplate: "" },
    { id: "designer", label: "Designer", emoji: "🎨", color: "bg-purple-600", expertise: "UX", promptTemplate: "" },
    { id: "product-owner", label: "Product Owner", emoji: "📋", color: "bg-emerald-600", expertise: "Biz", promptTemplate: "" },
    { id: "qa", label: "QA", emoji: "🧪", color: "bg-amber-600", expertise: "Tests", promptTemplate: "" },
  ]),
}));

vi.mock("@/lib/consensus-threshold", () => ({
  checkConsensusThreshold: vi.fn(() => ({
    reached: true,
    progress: 0.75,
    threshold: 0.75,
  })),
  generateBuildSummary: vi.fn(() => "# Build Summary\n\nTest summary."),
}));

import { POST } from "../build/route";
import { callDeepSeek, isLLMConfigured } from "@/lib/llm";
import * as serverDb from "@/lib/server-db";
import * as consensus from "@/lib/consensus-threshold";
import { Ticket } from "@/lib/types";
import { resetRateLimitBuckets } from "@/lib/rateLimit";

function makeMockTicket(id: string): Ticket {
  return {
    id,
    title: "Test Feature",
    description: "Test description for build testing",
    status: "consensus",
    priority: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    tags: [],
    feedback: [
      {
        id: "FB-001",
        ticketId: id,
        personaId: "engineer",
        content: "Technically feasible.",
        createdAt: "2026-01-01T00:00:00.000Z",
        approved: true,
      },
      {
        id: "FB-002",
        ticketId: id,
        personaId: "designer",
        content: "UX looks good.",
        createdAt: "2026-01-01T00:00:00.000Z",
        approved: true,
      },
      {
        id: "FB-003",
        ticketId: id,
        personaId: "product-owner",
        content: "High business value.",
        createdAt: "2026-01-01T00:00:00.000Z",
        approved: true,
      },
    ],
    approvals: ["engineer", "designer", "product-owner"],
  };
}

function buildLLMResponse(): string {
  return JSON.stringify({
    requirements: [
      "Implement feature X with TypeScript interfaces",
      "Add unit tests covering edge cases",
      "Ensure accessibility compliance",
    ],
    designDecisions: [
      "Use dark parchment theme variables",
      "Follow existing card pattern for layout",
    ],
    qaCriteria: [
      "Test on all breakpoints",
      "Verify keyboard navigation",
      "Check contrast ratios",
    ],
    implementationPlan: "## Steps\n\n1. Setup\n2. Implement\n3. Test",
    consensusSummary: "3 of 4 personas approved. Consensus reached.",
  });
}

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ========================================================================
// POST /api/build tests
// ========================================================================

describe("POST /api/build", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitBuckets();
  });

  it("returns 400 when ticketId is missing", async () => {
    const request = createRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Missing required field");
  });

  it("returns 400 for invalid ticket ID format", async () => {
    const request = createRequest({ ticketId: "INVALID" });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid ticket ID format");
  });

  it("returns 400 for non-TIX-XXX format ticket IDs", async () => {
    const request = createRequest({ ticketId: "TICKET-001" });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid ticket ID format");
  });

  it("returns 404 when ticket does not exist", async () => {
    (serverDb.getTicket as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    const request = createRequest({ ticketId: "TIX-999" });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain("Ticket not found");
  });

  it("returns 200 with a build report on successful generation", async () => {
    // Setup: ticket exists
    const mockTicket = makeMockTicket("TIX-001");
    (serverDb.getTicket as ReturnType<typeof vi.fn>).mockReturnValue(mockTicket);

    // Setup: LLM returns valid JSON
    const mockLLMResponse = buildLLMResponse();
    (callDeepSeek as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: mockLLMResponse,
      model: "deepseek-v4-pro",
      usage: { promptTokens: 500, completionTokens: 300, totalTokens: 800 },
    });

    const request = createRequest({ ticketId: "TIX-001" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();

    // Verify build report structure
    expect(body.buildReport).toBeDefined();
    expect(body.buildReport.id).toMatch(/^BLD-\d{3}$/);
    expect(body.buildReport.ticketId).toBe("TIX-001");
    expect(body.buildReport.status).toBe("building");
    expect(body.buildReport.requirements).toHaveLength(3);
    expect(body.buildReport.requirements[0]).toContain("Implement feature X");
    expect(body.buildReport.designDecisions).toHaveLength(2);
    expect(body.buildReport.qaCriteria).toHaveLength(3);
    expect(body.buildReport.implementationPlan).toContain("## Steps");
    expect(body.buildReport.consensusSummary).toContain("3 of 4");

    // Verify meta
    expect(body.meta).toBeDefined();
    expect(body.meta.model).toBe("deepseek-v4-pro");
    expect(body.meta.tokensUsed).toBe(800);

    // Verify setBuildReport was called
    expect(serverDb.setBuildReport).toHaveBeenCalledWith("TIX-001", body.buildReport);

    // Verify callDeepSeek was called with correct model
    expect(callDeepSeek).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "deepseek-v4-pro",
        expectJson: true,
      })
    );
  });

  it("handles LLM response in markdown code fences", async () => {
    const mockTicket = makeMockTicket("TIX-002");
    (serverDb.getTicket as ReturnType<typeof vi.fn>).mockReturnValue(mockTicket);

    const jsonContent = buildLLMResponse();
    const fencedResponse = `Here is the build report:\n\n\`\`\`json\n${jsonContent}\n\`\`\``;

    (callDeepSeek as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: fencedResponse,
      model: "deepseek-v4-pro",
      usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
    });

    const request = createRequest({ ticketId: "TIX-002" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.buildReport.requirements).toHaveLength(3);
  });

  it("handles LLM response with missing fields gracefully", async () => {
    const mockTicket = makeMockTicket("TIX-003");
    (serverDb.getTicket as ReturnType<typeof vi.fn>).mockReturnValue(mockTicket);

    (callDeepSeek as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify({}),
      model: "deepseek-v4-pro",
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
    });

    const request = createRequest({ ticketId: "TIX-003" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.buildReport.requirements).toEqual([]);
    expect(body.buildReport.designDecisions).toEqual([]);
    expect(body.buildReport.qaCriteria).toEqual([]);
    expect(body.buildReport.implementationPlan).toBe("");
    expect(body.buildReport.consensusSummary).toBe("");
  });

  it("returns 500 on LLM failure", async () => {
    const mockTicket = makeMockTicket("TIX-004");
    (serverDb.getTicket as ReturnType<typeof vi.fn>).mockReturnValue(mockTicket);

    (callDeepSeek as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("API timeout")
    );

    const request = createRequest({ ticketId: "TIX-004" });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });

  it("passes the correct system prompt with persona context", async () => {
    const mockTicket = makeMockTicket("TIX-005");
    (serverDb.getTicket as ReturnType<typeof vi.fn>).mockReturnValue(mockTicket);

    (callDeepSeek as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: buildLLMResponse(),
      model: "deepseek-v4-pro",
      usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
    });

    const request = createRequest({ ticketId: "TIX-005" });
    await POST(request);

    const callArgs = (callDeepSeek as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.systemPrompt).toContain("Concilium Build Engine");
    expect(callArgs.userPrompt).toContain("TIX-005");
    expect(callArgs.userPrompt).toContain("Test Feature");
    expect(callArgs.userPrompt).toContain("Persona Feedback");
    expect(callArgs.expectJson).toBe(true);
    expect(callArgs.model).toBe("deepseek-v4-pro");
  });

  // --- Rate Limit Tests ---

  it("6th request from same IP returns 429", async () => {
    const mockTicket = makeMockTicket("TIX-001");
    (serverDb.getTicket as ReturnType<typeof vi.fn>).mockReturnValue(mockTicket);
    (callDeepSeek as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: buildLLMResponse(),
      model: "deepseek-v4-pro",
      usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
    });

    // First 5 requests should succeed
    for (let i = 0; i < 5; i++) {
      const request = createRequest({ ticketId: "TIX-001" });
      const response = await POST(request);
      expect(response.status).toBe(200);
    }

    // 6th request should be rate-limited
    const blockedRequest = createRequest({ ticketId: "TIX-001" });
    const blockedResponse = await POST(blockedRequest);

    expect(blockedResponse.status).toBe(429);
    const body = await blockedResponse.json();
    expect(body.error).toBe("Too many requests");
    expect(typeof body.retryAfter).toBe("number");
  });

  it("429 body contains { error: 'Too many requests', retryAfter: number }", async () => {
    // Exhaust the rate limit
    for (let i = 0; i < 5; i++) {
      const request = createRequest({ ticketId: "TIX-001" });
      await POST(request);
    }

    const request = createRequest({ ticketId: "TIX-001" });
    const response = await POST(request);

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toHaveProperty("error", "Too many requests");
    expect(body).toHaveProperty("retryAfter");
    expect(typeof body.retryAfter).toBe("number");
    expect(body.retryAfter).toBeGreaterThanOrEqual(0);
  });

  it("rate-limit headers present on 200 response", async () => {
    const mockTicket = makeMockTicket("TIX-001");
    (serverDb.getTicket as ReturnType<typeof vi.fn>).mockReturnValue(mockTicket);
    (callDeepSeek as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: buildLLMResponse(),
      model: "deepseek-v4-pro",
      usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
    });

    const request = createRequest({ ticketId: "TIX-001" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("4");
    expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("rate-limit headers present on 429 response", async () => {
    // Exhaust the rate limit
    for (let i = 0; i < 5; i++) {
      const request = createRequest({ ticketId: "TIX-001" });
      await POST(request);
    }

    const request = createRequest({ ticketId: "TIX-001" });
    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });
});

describe("POST /api/build — AI not configured", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it("returns 503 with code ai_not_configured when the LLM key is missing", async () => {
    vi.mocked(isLLMConfigured).mockReturnValueOnce(false);
    const request = new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      body: JSON.stringify({ ticketId: "TIX-001" }),
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.9.9.9" },
    });
    const response = await POST(request);
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.code).toBe("ai_not_configured");
    // The message is user-facing — must not leak infra commands
    expect(data.error).not.toContain("railway");
  });
});
