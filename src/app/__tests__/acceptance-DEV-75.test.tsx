/**
 * Acceptance Tests — DEV-75: Rate Limiting for /api/build and /api/prompt
 *
 * Tests are written from the user's perspective: they call handler functions
 * directly with mock NextRequest objects and verify status, body, and headers.
 *
 * Uses vi.doMock + dynamic imports for clean isolation between describe blocks.
 *
 * Rule: NEVER modify backend or frontend code. If a test fails, report it.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import * as fs from "node:fs";
import * as path from "node:path";

// ============================================================================
// AC1 — Rate-limit utility exists at src/lib/rateLimit.ts,
//       provides checkRateLimit function
// ============================================================================

describe("AC1 — Rate-limit utility module", () => {
  it("src/lib/rateLimit.ts exports checkRateLimit as a function", async () => {
    const mod = await import("@/lib/rateLimit");
    expect(mod.checkRateLimit).toBeDefined();
    expect(typeof mod.checkRateLimit).toBe("function");
  });

  it("also exports extractIp, applyRateLimitHeaders, resetRateLimitBuckets", async () => {
    const mod = await import("@/lib/rateLimit");
    expect(typeof mod.extractIp).toBe("function");
    expect(typeof mod.applyRateLimitHeaders).toBe("function");
    expect(typeof mod.resetRateLimitBuckets).toBe("function");
  });
});

// ============================================================================
// AC2 — /api/build POST limited to 5 req/min, 6th returns 429 with
//       { error: "Too many requests", retryAfter: number }
// ============================================================================

describe("AC2 — /api/build rate limit (5 req/min)", () => {
  let POST: (req: NextRequest) => Promise<Response>;
  let resetRateLimitBuckets: () => void;

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("@/lib/llm", () => ({
      callDeepSeek: vi.fn(),
      DEEPSEEK_PRO_MODEL: "deepseek-v4-pro",
      isLLMConfigured: () => true,
      AI_NOT_CONFIGURED_MESSAGE: "AI not configured",
      }));

    vi.doMock("@/lib/store", () => {
      const mockTickets: Map<string, Record<string, unknown>> = new Map();
      const mockTicket = {
        id: "TIX-001",
        title: "Test Feature",
        description: "Test description",
        status: "consensus",
        priority: 2,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        tags: [],
        feedback: [
          { id: "FB-001", ticketId: "TIX-001", personaId: "engineer", content: "OK.", createdAt: "2026-01-01T00:00:00.000Z", approved: true },
          { id: "FB-002", ticketId: "TIX-001", personaId: "designer", content: "Looks good.", createdAt: "2026-01-01T00:00:00.000Z", approved: true },
          { id: "FB-003", ticketId: "TIX-001", personaId: "product-owner", content: "High value.", createdAt: "2026-01-01T00:00:00.000Z", approved: true },
        ],
        approvals: ["engineer", "designer", "product-owner"],
      };
      mockTickets.set("TIX-001", mockTicket as any);
      return {
        getTicket: vi.fn((id: string) => mockTickets.get(id) ?? undefined),
        getFeedbackHistory: vi.fn(() => []),
        setBuildReport: vi.fn(),
      };
    });

    vi.doMock("@/lib/personas", () => ({
      getAllPersonas: vi.fn(() => [
        { id: "engineer", label: "Engineer", emoji: "⚙️", color: "bg-blue-600", expertise: "Tech", promptTemplate: "" },
        { id: "designer", label: "Designer", emoji: "🎨", color: "bg-purple-600", expertise: "UX", promptTemplate: "" },
        { id: "product-owner", label: "PO", emoji: "📋", color: "bg-emerald-600", expertise: "Biz", promptTemplate: "" },
        { id: "qa", label: "QA", emoji: "🧪", color: "bg-amber-600", expertise: "Tests", promptTemplate: "" },
      ]),
    }));

    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      checkConsensusThreshold: vi.fn(() => ({ reached: true, progress: 0.75, threshold: 0.75 })),
      generateBuildSummary: vi.fn(() => "# Build Summary\n\nTest summary."),
    }));

    const buildModule = await import("../api/build/route");
    POST = buildModule.POST;

    const rateLimitModule = await import("@/lib/rateLimit");
    resetRateLimitBuckets = rateLimitModule.resetRateLimitBuckets;
    resetRateLimitBuckets();

    // Setup LLM mock to return success
    const { callDeepSeek } = await import("@/lib/llm");
    (callDeepSeek as any).mockResolvedValue({
      content: JSON.stringify({
        requirements: ["Req 1", "Req 2"],
        designDecisions: ["Design 1"],
        qaCriteria: ["QA 1"],
        implementationPlan: "## Plan",
        consensusSummary: "Consensus reached.",
      }),
      model: "deepseek-v4-pro",
      usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
    });
  });

  function createBuildRequest(ticketId = "TIX-001"): NextRequest {
    return new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId }),
    });
  }

  it("first 5 requests return 200, 6th returns 429", async () => {
    for (let i = 0; i < 5; i++) {
      const req = createBuildRequest();
      const res = await POST(req);
      expect(res.status, `Request ${i + 1} should succeed`).toBe(200);
    }

    const blockedReq = createBuildRequest();
    const blockedRes = await POST(blockedReq);
    expect(blockedRes.status).toBe(429);
    const body = await blockedRes.json();
    expect(body.error).toBe("Too many requests");
    expect(typeof body.retryAfter).toBe("number");
    expect(body.retryAfter).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// AC3 — /api/prompt POST limited to 10 req/min, 11th returns 429
// ============================================================================

describe("AC3 — /api/prompt rate limit (10 req/min)", () => {
  let POST: (req: NextRequest) => Promise<Response>;
  let resetRateLimitBuckets: () => void;

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("@/lib/mediator", () => ({
      mediate: vi.fn(),
      continueMediation: vi.fn(),
    }));

    const promptModule = await import("../api/prompt/route");
    POST = promptModule.POST;

    const rateLimitModule = await import("@/lib/rateLimit");
    resetRateLimitBuckets = rateLimitModule.resetRateLimitBuckets;
    resetRateLimitBuckets();

    const { mediate } = await import("@/lib/mediator");
    (mediate as any).mockResolvedValue({
      response: {
        refinedFeedback: "Looks good.",
        concerns: [],
        recommendations: [],
        followUpQuestions: [],
        suggestApproval: true,
        approvalReasoning: "Clear requirements.",
        suggestedNextPersona: "designer",
        meta: { mediationType: "ai", processedAt: new Date().toISOString(), inputLength: 100, model: "deepseek-v4-flash", tokensUsed: 200 },
      },
      context: {
        ticketId: "TIX-001",
        personaId: "engineer",
        consensusReached: false,
        approvedCount: 1,
        totalPersonas: 4,
        sessionHistory: [],
      },
    });
  });

  function createPromptRequest(): NextRequest {
    return new NextRequest("http://localhost:3000/api/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: "TIX-001",
        personaId: "engineer",
        message: "What do you think about this feature?",
      }),
    });
  }

  it("first 10 requests return 200, 11th returns 429", async () => {
    for (let i = 0; i < 10; i++) {
      const req = createPromptRequest();
      const res = await POST(req);
      expect(res.status, `Request ${i + 1} should succeed`).toBe(200);
    }

    const blockedReq = createPromptRequest();
    const blockedRes = await POST(blockedReq);
    expect(blockedRes.status).toBe(429);
  });

  it("429 body contains error and retryAfter", async () => {
    for (let i = 0; i < 10; i++) {
      await POST(createPromptRequest());
    }

    const blockedRes = await POST(createPromptRequest());
    expect(blockedRes.status).toBe(429);
    const body = await blockedRes.json();
    expect(body.error).toBe("Too many requests");
    expect(typeof body.retryAfter).toBe("number");
    expect(body.retryAfter).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// AC4 — GET /api/prompt is NOT rate-limited
//       (succeeds regardless of POST limit)
// ============================================================================

describe("AC4 — GET /api/prompt is not rate-limited", () => {
  let POST: (req: NextRequest) => Promise<Response>;
  let GET: (req: NextRequest) => Promise<Response>;
  let resetRateLimitBuckets: () => void;

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("@/lib/mediator", () => ({
      mediate: vi.fn(),
      continueMediation: vi.fn(),
    }));

    // The GET handler dynamically imports these modules
    vi.doMock("@/lib/store", () => ({
      getTicket: vi.fn(() => ({
        id: "TIX-001",
        title: "Test Ticket",
        description: "Test",
        status: "consensus",
        priority: 2,
        approvals: [],
      })),
      getFeedbackHistory: vi.fn(() => []),
    }));

    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      checkConsensusThreshold: vi.fn(() => ({ reached: false, progress: 0.25, threshold: 0.75 })),
    }));

    vi.doMock("@/lib/personas", () => ({
      getPersona: vi.fn((id: string) => ({
        id,
        label: id === "engineer" ? "Engineer" : "Unknown",
        emoji: "⚙️",
        expertise: "Tech",
        promptTemplate: "",
      })),
      getAllPersonas: vi.fn(() => [
        { id: "engineer", label: "Engineer", emoji: "⚙️" },
        { id: "designer", label: "Designer", emoji: "🎨" },
        { id: "product-owner", label: "PO", emoji: "📋" },
        { id: "qa", label: "QA", emoji: "🧪" },
      ]),
    }));

    const promptModule = await import("../api/prompt/route");
    POST = promptModule.POST;
    GET = promptModule.GET;

    const rateLimitModule = await import("@/lib/rateLimit");
    resetRateLimitBuckets = rateLimitModule.resetRateLimitBuckets;
    resetRateLimitBuckets();

    const { mediate } = await import("@/lib/mediator");
    (mediate as any).mockResolvedValue({
      response: {
        refinedFeedback: "OK.",
        concerns: [],
        recommendations: [],
        followUpQuestions: [],
        suggestApproval: true,
        approvalReasoning: "Clear.",
        suggestedNextPersona: null,
        meta: { mediationType: "ai", processedAt: new Date().toISOString(), inputLength: 50, model: "deepseek-v4-flash", tokensUsed: 100 },
      },
      context: {
        ticketId: "TIX-001",
        personaId: "engineer",
        consensusReached: false,
        approvedCount: 1,
        totalPersonas: 4,
        sessionHistory: [],
      },
    });
  });

  function createPostRequest(): NextRequest {
    return new NextRequest("http://localhost:3000/api/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: "TIX-001",
        personaId: "engineer",
        message: "Test message",
      }),
    });
  }

  function createGetRequest(): NextRequest {
    const url = new URL("http://localhost:3000/api/prompt");
    url.searchParams.set("ticketId", "TIX-001");
    url.searchParams.set("personaId", "engineer");
    return new NextRequest(url.toString(), { method: "GET" });
  }

  it("GET succeeds even after POST limit is exhausted", async () => {
    // Exhaust POST limit (10 req/min for /api/prompt)
    for (let i = 0; i < 10; i++) {
      await POST(createPostRequest());
    }

    // POST is now blocked
    const blockedPost = await POST(createPostRequest());
    expect(blockedPost.status).toBe(429);

    // GET should still work — NOT rate-limited
    const getReq = createGetRequest();
    const getRes = await GET(getReq);
    expect(getRes.status).not.toBe(429);
  });

  it("multiple GET requests in a row are all fine", async () => {
    for (let i = 0; i < 15; i++) {
      const getReq = createGetRequest();
      const getRes = await GET(getReq);
      expect(getRes.status, `GET request ${i + 1} should not be 429`).not.toBe(429);
    }
  });
});

// ============================================================================
// AC5 — Rate-limit headers (X-RateLimit-Remaining, X-RateLimit-Reset)
//       on ALL POST responses
// ============================================================================

describe("AC5 — Rate-limit headers on all POST responses", () => {
  let POST: (req: NextRequest) => Promise<Response>;
  let resetRateLimitBuckets: () => void;

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("@/lib/mediator", () => ({
      mediate: vi.fn(),
      continueMediation: vi.fn(),
    }));

    const promptModule = await import("../api/prompt/route");
    POST = promptModule.POST;

    const rateLimitModule = await import("@/lib/rateLimit");
    resetRateLimitBuckets = rateLimitModule.resetRateLimitBuckets;
    resetRateLimitBuckets();

    const { mediate } = await import("@/lib/mediator");
    (mediate as any).mockResolvedValue({
      response: {
        refinedFeedback: "OK.",
        concerns: [],
        recommendations: [],
        followUpQuestions: [],
        suggestApproval: true,
        approvalReasoning: "Clear.",
        suggestedNextPersona: null,
        meta: { mediationType: "ai", processedAt: new Date().toISOString(), inputLength: 50, model: "deepseek-v4-flash", tokensUsed: 100 },
      },
      context: {
        ticketId: "TIX-001",
        personaId: "engineer",
        consensusReached: false,
        approvedCount: 1,
        totalPersonas: 4,
        sessionHistory: [],
      },
    });
  });

  function createPromptRequest(): NextRequest {
    return new NextRequest("http://localhost:3000/api/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: "TIX-001",
        personaId: "engineer",
        message: "Test",
      }),
    });
  }

  it("headers present on 200 success response", async () => {
    const res = await POST(createPromptRequest());
    expect(res.status).toBe(200);
    const remaining = res.headers.get("X-RateLimit-Remaining");
    const reset = res.headers.get("X-RateLimit-Reset");
    expect(remaining, "X-RateLimit-Remaining must be present on 200").toBeTruthy();
    expect(reset, "X-RateLimit-Reset must be present on 200").toBeTruthy();
    expect(remaining).toBe("9");
    expect(Number(reset)).toBeGreaterThan(0);
  });

  it("headers present on 429 rate-limited response", async () => {
    for (let i = 0; i < 10; i++) {
      await POST(createPromptRequest());
    }

    const blocked = await POST(createPromptRequest());
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(blocked.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("headers present on 400 error response (bad request but rate-limit tracked)", async () => {
    const badReq = new NextRequest("http://localhost:3000/api/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(badReq);
    expect(res.status).toBe(400);
    expect(res.headers.get("X-RateLimit-Remaining")).toBeTruthy();
    expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });
});

// ============================================================================
// AC6 — Robust IP extraction:
//       request.ip → x-forwarded-for → "unknown"
// ============================================================================

describe("AC6 — Robust IP extraction", () => {
  let extractIp: (req: NextRequest) => string;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/lib/rateLimit");
    extractIp = mod.extractIp;
  });

  it("uses request.ip as highest priority", () => {
    const req = new NextRequest("http://localhost:3000/api/test");
    Object.defineProperty(req, "ip", { value: "192.0.2.1", writable: false });
    expect(extractIp(req)).toBe("192.0.2.1");
  });

  it("falls back to x-forwarded-for when request.ip is absent (comma-separated)", () => {
    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1, 192.168.1.1" },
    });
    expect(extractIp(req)).toBe("203.0.113.1");
  });

  it("falls back to x-forwarded-for (single IP) when request.ip is absent", () => {
    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "198.51.100.42" },
    });
    expect(extractIp(req)).toBe("198.51.100.42");
  });

  it("returns 'unknown' when neither request.ip nor x-forwarded-for is present", () => {
    const req = new NextRequest("http://localhost:3000/api/test");
    expect(extractIp(req)).toBe("unknown");
  });

  it("prefers request.ip over x-forwarded-for when both are present", () => {
    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "203.0.113.50, 10.0.0.2" },
    });
    Object.defineProperty(req, "ip", { value: "10.0.0.1", writable: false });
    expect(extractIp(req)).toBe("10.0.0.1");
  });
});

// ============================================================================
// AC7 — Check occurs synchronously before any await
//       (rate limit enforced even on bad requests)
// ============================================================================

describe("AC7 — Rate-limit check is synchronous, enforced before body parsing", () => {
  let BuildPOST: (req: NextRequest) => Promise<Response>;
  let PromptPOST: (req: NextRequest) => Promise<Response>;
  let resetRateLimitBuckets: () => void;
  let callDeepSeek: any;

  beforeEach(async () => {
    vi.resetModules();

    // Mocks for build handler
    vi.doMock("@/lib/llm", () => ({
      callDeepSeek: vi.fn(),
      DEEPSEEK_PRO_MODEL: "deepseek-v4-pro",
      isLLMConfigured: () => true,
      AI_NOT_CONFIGURED_MESSAGE: "AI not configured",
      }));

    vi.doMock("@/lib/store", () => {
      const mockTicket = {
        id: "TIX-001",
        title: "Test",
        description: "Test",
        status: "consensus",
        priority: 2,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        tags: [],
        feedback: [],
        approvals: ["engineer", "designer", "product-owner"],
      };
      return {
        getTicket: vi.fn(() => mockTicket),
        getFeedbackHistory: vi.fn(() => []),
        setBuildReport: vi.fn(),
      };
    });

    vi.doMock("@/lib/personas", () => ({
      getAllPersonas: vi.fn(() => [
        { id: "engineer", label: "Engineer", emoji: "⚙️", color: "bg-blue-600", expertise: "Tech", promptTemplate: "" },
        { id: "designer", label: "Designer", emoji: "🎨", color: "bg-purple-600", expertise: "UX", promptTemplate: "" },
        { id: "product-owner", label: "PO", emoji: "📋", color: "bg-emerald-600", expertise: "Biz", promptTemplate: "" },
        { id: "qa", label: "QA", emoji: "🧪", color: "bg-amber-600", expertise: "Tests", promptTemplate: "" },
      ]),
    }));

    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      checkConsensusThreshold: vi.fn(() => ({ reached: true, progress: 0.75, threshold: 0.75 })),
      generateBuildSummary: vi.fn(() => "# Build Summary"),
    }));

    vi.doMock("@/lib/mediator", () => ({
      mediate: vi.fn(),
      continueMediation: vi.fn(),
    }));

    const buildModule = await import("../api/build/route");
    BuildPOST = buildModule.POST;

    const promptModule = await import("../api/prompt/route");
    PromptPOST = promptModule.POST;

    const rateLimitModule = await import("@/lib/rateLimit");
    resetRateLimitBuckets = rateLimitModule.resetRateLimitBuckets;
    resetRateLimitBuckets();

    // Setup LLM mock
    const llm = await import("@/lib/llm");
    callDeepSeek = llm.callDeepSeek;
    (callDeepSeek as any).mockResolvedValue({
      content: JSON.stringify({ requirements: [], designDecisions: [], qaCriteria: [], implementationPlan: "", consensusSummary: "" }),
      model: "deepseek-v4-pro",
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
    });

    // Setup mediator mock
    const { mediate } = await import("@/lib/mediator");
    (mediate as any).mockResolvedValue({
      response: {
        refinedFeedback: "OK",
        concerns: [],
        recommendations: [],
        followUpQuestions: [],
        suggestApproval: true,
        approvalReasoning: "Clear",
        suggestedNextPersona: null,
        meta: { mediationType: "ai", processedAt: new Date().toISOString(), inputLength: 50, model: "deepseek-v4-flash", tokensUsed: 100 },
      },
      context: { ticketId: "TIX-001", personaId: "engineer", consensusReached: false, approvedCount: 1, totalPersonas: 4, sessionHistory: [] },
    });
  });

  function createBuildRequest(): NextRequest {
    return new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: "TIX-001" }),
    });
  }

  function createPromptRequest(): NextRequest {
    return new NextRequest("http://localhost:3000/api/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: "TIX-001",
        personaId: "engineer",
        message: "Test",
      }),
    });
  }

  it("rate limit enforced on /api/build even with invalid request body (before json parsing)", async () => {
    // Exhaust the build rate limit (5 requests)
    for (let i = 0; i < 5; i++) {
      await BuildPOST(createBuildRequest());
    }

    // 6th request — with a body missing required fields (would normally be 400)
    // Rate-limit check happens synchronously before await request.json(), so this must be 429
    const badReq = new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await BuildPOST(badReq);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("Too many requests");
  });

  it("rate limit enforced on /api/prompt even with missing required fields", async () => {
    // Exhaust the prompt rate limit (10 requests)
    for (let i = 0; i < 10; i++) {
      await PromptPOST(createPromptRequest());
    }

    // 11th request — with missing all required fields (would normally be 400)
    // Rate-limit check is synchronous, so this should be 429
    const badReq = new NextRequest("http://localhost:3000/api/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await PromptPOST(badReq);
    expect(res.status).toBe(429);
  });
});

// ============================================================================
// AC8 — Unit tests cover utility at src/lib/__tests__/rateLimit.test.ts
// ============================================================================

describe("AC8 — Unit tests for rate-limit utility", () => {
  const testFilePath = path.resolve(
    __dirname,
    "../../lib/__tests__/rateLimit.test.ts"
  );

  it("file exists at src/lib/__tests__/rateLimit.test.ts", () => {
    const exists = fs.existsSync(testFilePath);
    expect(exists, `Expected test file at ${testFilePath}`).toBe(true);
  });

  it("file contains tests for checkRateLimit", () => {
    const content = fs.readFileSync(testFilePath, "utf-8");
    expect(content).toContain("checkRateLimit");
  });

  it("file contains tests for extractIp", () => {
    const content = fs.readFileSync(testFilePath, "utf-8");
    expect(content).toContain("extractIp");
  });

  it("file contains tests for applyRateLimitHeaders", () => {
    const content = fs.readFileSync(testFilePath, "utf-8");
    expect(content).toContain("applyRateLimitHeaders");
  });

  it("file contains tests for resetRateLimitBuckets", () => {
    const content = fs.readFileSync(testFilePath, "utf-8");
    expect(content).toContain("resetRateLimitBuckets");
  });
});

// ============================================================================
// AC9 — Endpoint integration tests at build.test.ts and prompt.test.ts
// ============================================================================

describe("AC9 — Endpoint integration tests", () => {
  const buildTestPath = path.resolve(
    __dirname,
    "../api/__tests__/build.test.ts"
  );
  const promptTestPath = path.resolve(
    __dirname,
    "../api/__tests__/prompt.test.ts"
  );

  it("build.test.ts exists", () => {
    expect(fs.existsSync(buildTestPath), `Expected ${buildTestPath}`).toBe(true);
  });

  it("build.test.ts contains rate-limit tests", () => {
    const content = fs.readFileSync(buildTestPath, "utf-8");
    expect(content).toContain("429");
    expect(content).toContain("rate-limit");
  });

  it("prompt.test.ts exists", () => {
    expect(fs.existsSync(promptTestPath), `Expected ${promptTestPath}`).toBe(true);
  });

  it("prompt.test.ts contains rate-limit tests", () => {
    const content = fs.readFileSync(promptTestPath, "utf-8");
    expect(content).toContain("429");
    expect(content).toContain("rate-limit");
  });
});

// ============================================================================
// AC10 (retired): asserted a frozen package.json dependency list as proof that
// rate limiting added no deps — a point-in-time claim that broke whenever any
// legitimate dependency landed later. Rate limiting itself is covered by AC1–AC7.
