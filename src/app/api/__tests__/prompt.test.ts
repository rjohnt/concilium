import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

vi.mock("@/lib/mediator", () => ({
  mediate: vi.fn(),
  continueMediation: vi.fn(),
}));

vi.mock("@/lib/store", () => {
  const mockTickets: Map<string, Record<string, unknown>> = new Map();
  return {
    getTicket: vi.fn((id: string) => mockTickets.get(id) ?? undefined),
    getFeedbackHistory: vi.fn(() => []),
  };
});

import { POST, GET } from "../prompt/route";
import { mediate, continueMediation } from "@/lib/mediator";
import { resetRateLimitBuckets } from "@/lib/rateLimit";

function makeMockMediationResult() {
  return {
    response: {
      refinedFeedback: "This feature looks technically feasible.",
      concerns: ["Performance at scale"],
      recommendations: ["Add caching layer"],
      followUpQuestions: ["What's the expected traffic volume?"],
      suggestApproval: true,
      approvalReasoning: "Well-scoped and clear requirements.",
      suggestedNextPersona: "designer" as const,
      meta: {
        mediationType: "ai" as const,
        processedAt: new Date().toISOString(),
        inputLength: 250,
        model: "deepseek-v4-flash",
        tokensUsed: 450,
      },
    },
    context: {
      ticketId: "TIX-001",
      personaId: "engineer",
      consensusReached: false,
      approvedCount: 1,
      totalPersonas: 4,
      sessionHistory: [],
    },
  };
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/prompt");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), { method: "GET" });
}

const validPostBody = {
  ticketId: "TIX-001",
  personaId: "engineer",
  message: "What do you think about this feature?",
};

// ========================================================================
// POST /api/prompt tests
// ========================================================================

describe("POST /api/prompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitBuckets();
  });

  it("returns 400 when required fields are missing", async () => {
    const request = createPostRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Missing required fields");
  });

  it("returns 400 for invalid ticket ID format", async () => {
    const request = createPostRequest({ ...validPostBody, ticketId: "INVALID" });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid ticket ID format");
  });

  it("returns 400 for invalid persona ID", async () => {
    const request = createPostRequest({ ...validPostBody, personaId: "ceo" });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid persona ID");
  });

  it("returns 404 when ticket not found", async () => {
    (mediate as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = createPostRequest({ ...validPostBody, ticketId: "TIX-999" });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Ticket not found");
  });

  it("returns 200 with mediation result on success", async () => {
    const mockResult = makeMockMediationResult();
    (mediate as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    const request = createPostRequest(validPostBody);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.refinedFeedback).toBe("This feature looks technically feasible.");
    expect(body.concerns).toContain("Performance at scale");
    expect(body.recommendations).toContain("Add caching layer");
    expect(body.context.ticketId).toBe("TIX-001");
    expect(body.context.personaId).toBe("engineer");
  });

  it("calls continueMediation when previousResponse is provided", async () => {
    const mockResult = makeMockMediationResult();
    (continueMediation as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    const bodyWithPrev = {
      ...validPostBody,
      previousResponse: {
        refinedFeedback: "Previous feedback",
        concerns: [],
        recommendations: [],
        followUpQuestions: [],
        suggestApproval: false,
        approvalReasoning: "",
        suggestedNextPersona: null,
      },
    };

    const request = createPostRequest(bodyWithPrev);
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(continueMediation).toHaveBeenCalled();
    expect(mediate).not.toHaveBeenCalled();
  });

  // --- Rate Limit Tests ---

  it("11th request from same IP returns 429", async () => {
    const mockResult = makeMockMediationResult();
    (mediate as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    // First 10 requests should succeed
    for (let i = 0; i < 10; i++) {
      const request = createPostRequest(validPostBody);
      const response = await POST(request);
      expect(response.status).toBe(200);
    }

    // 11th request should be rate-limited
    const blockedRequest = createPostRequest(validPostBody);
    const blockedResponse = await POST(blockedRequest);

    expect(blockedResponse.status).toBe(429);
  });

  it("429 body contains { error: 'Too many requests', retryAfter: number }", async () => {
    // Exhaust the rate limit
    for (let i = 0; i < 10; i++) {
      const request = createPostRequest(validPostBody);
      await POST(request);
    }

    const request = createPostRequest(validPostBody);
    const response = await POST(request);

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toHaveProperty("error", "Too many requests");
    expect(body).toHaveProperty("retryAfter");
    expect(typeof body.retryAfter).toBe("number");
    expect(body.retryAfter).toBeGreaterThanOrEqual(0);
  });

  it("rate-limit headers present on success response", async () => {
    const mockResult = makeMockMediationResult();
    (mediate as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    const request = createPostRequest(validPostBody);
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("X-RateLimit-Remaining")).toBeTruthy();
    expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("rate-limit headers present on 429 response", async () => {
    // Exhaust the rate limit
    for (let i = 0; i < 10; i++) {
      const request = createPostRequest(validPostBody);
      await POST(request);
    }

    const request = createPostRequest(validPostBody);
    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("different IPs have independent limits", async () => {
    const mockResult = makeMockMediationResult();
    (mediate as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    // Exhaust the limit from "default" IP (all createPostRequest use same headers)
    for (let i = 0; i < 10; i++) {
      const request = createPostRequest(validPostBody);
      await POST(request);
    }

    // Default IP is now blocked
    const blocked = await POST(createPostRequest(validPostBody));
    expect(blocked.status).toBe(429);

    // A request with a simulated different IP (x-forwarded-for header)
    const otherIpRequest = new NextRequest("http://localhost:3000/api/prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.42",
      },
      body: JSON.stringify(validPostBody),
    });

    const otherResponse = await POST(otherIpRequest);
    expect(otherResponse.status).toBe(200);
  });
});

// ========================================================================
// GET /api/prompt tests
// ========================================================================

describe("GET /api/prompt", () => {
  it("GET requests are NOT rate-limited (all succeed)", async () => {
    // Send many GET requests — none should be blocked by POST rate limiting
    for (let i = 0; i < 15; i++) {
      const request = createGetRequest({ ticketId: "TIX-001", personaId: "engineer" });
      const response = await GET(request);
      // GET returns 404 because ticket doesn't exist in our mock, but it should
      // NOT return 429. Rate limiting only applies to POST.
      expect(response.status).not.toBe(429);
    }
  });

  it("returns 400 when ticketId or personaId is missing", async () => {
    const request = createGetRequest({});
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("required");
  });

  it("returns 400 for invalid persona ID", async () => {
    const request = createGetRequest({ ticketId: "TIX-001", personaId: "invalid" });
    const response = await GET(request);

    expect(response.status).toBe(400);
  });
});
