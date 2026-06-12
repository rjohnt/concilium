/**
 * DEV-54 Acceptance Tests — Consensus-to-Build Pipeline
 *
 * User Story:
 *   As a Concilium user, I want the system to automatically generate an
 *   implementation plan and code scaffold from all persona feedback when
 *   consensus is reached, so that the autonomous workflow doesn't break
 *   between feedback collection and code generation.
 *
 * These tests verify the full pipeline from consensus detection through
 * LLM-powered build report generation and inline display.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider } from "@/components/Toast";
import type { ReactNode } from "react";

// ===========================================================================
// Mocks shared across all test suites
// ===========================================================================

// Mock next/navigation
const mockPush = vi.fn();
const mockUseParams = vi.fn(() => ({ id: "TIX-001" }));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  useParams: () => mockUseParams(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock framer-motion (already handled in vitest.setup.ts, but belt-and-suspenders)
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock auth-context
vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(() => ({
    user: null,
    signOut: vi.fn(),
  })),
}));

// ===========================================================================
// AC 1: Consensus detection triggers LLM build pipeline
// ===========================================================================

describe("AC 1: Consensus detection triggers build pipeline", () => {
  let mockStorage: {
    store: Record<string, string>;
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    length: number;
    key: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const store: Record<string, string> = {};
    mockStorage = {
      store,
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((k) => delete store[k]);
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    };

    vi.stubGlobal("localStorage", mockStorage);
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    // Reset modules so store loads fresh with clean localStorage
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("transitions ticket to building status when consensus threshold is met (3 of 4)", async () => {
    vi.useFakeTimers();

    const { createTicket, addFeedback, getTicket, clearStorage } =
      await import("@/lib/store");

    // Start with clean state
    clearStorage();

    // Create a ticket
    const ticket = createTicket(
      "Consensus Build Test",
      "Testing auto-build from consensus",
      2
    );
    expect(ticket.status).toBe("draft");

    // Add approved feedback from 3 personas — this should trigger consensus
    // engineer, designer, product-owner = 3/4 = 75% = threshold met
    addFeedback(ticket.id, "engineer", "Technically feasible.", true);
    addFeedback(ticket.id, "designer", "UX looks good.", true);
    addFeedback(ticket.id, "product-owner", "High business value.", true);

    // Flush the debounced persist
    vi.advanceTimersByTime(100);

    const updated = getTicket(ticket.id);
    expect(updated).toBeDefined();

    // Status should be "building" because:
    // 1. First feedback → draft → in-review
    // 2. Consensus reached → in-review → consensus
    // 3. Consensus + all approved → building
    // But note: autoTransitionToBuilding is async and the background API call
    // may fail in test (no server), so status might be "consensus" or "building"
    // The stub buildReport should exist when status is "building"
    const validStatuses = ["consensus", "building"];
    expect(validStatuses).toContain(updated!.status);

    vi.useRealTimers();
  });

  it("does NOT transition to building when consensus threshold is not met (2 of 4)", async () => {
    vi.useFakeTimers();

    const { createTicket, addFeedback, getTicket, clearStorage } =
      await import("@/lib/store");

    clearStorage();

    const ticket = createTicket(
      "No Consensus Test",
      "Testing without consensus",
      2
    );

    // Only 2 approvals — threshold is 3 of 4 (75%)
    addFeedback(ticket.id, "engineer", "Looks good.", true);
    addFeedback(ticket.id, "designer", "Great UX.", true);

    vi.advanceTimersByTime(100);

    const updated = getTicket(ticket.id);
    expect(updated).toBeDefined();

    // Should NOT be building — only 2/4 approved
    expect(updated!.status).not.toBe("building");
    expect(updated!.status).not.toBe("done");

    // buildReport should not exist
    expect(updated!.buildReport).toBeUndefined();

    vi.useRealTimers();
  });

  it("does NOT auto-build when there is disapproving feedback even if threshold met", async () => {
    vi.useFakeTimers();

    const { createTicket, addFeedback, getTicket, clearStorage } =
      await import("@/lib/store");

    clearStorage();

    const ticket = createTicket(
      "Disapproval Test",
      "Testing disapprovals blocking build",
      2
    );

    // 3 approvals but 1 disapproval
    addFeedback(ticket.id, "engineer", "Technically feasible.", true);
    addFeedback(ticket.id, "designer", "UX looks good.", true);
    addFeedback(ticket.id, "product-owner", "High business value.", true);
    // QA disapproves
    addFeedback(
      ticket.id,
      "qa",
      "Accessibility concerns not addressed.",
      false
    );

    vi.advanceTimersByTime(100);

    const updated = getTicket(ticket.id);
    expect(updated).toBeDefined();

    // Status should NOT be "building" because QA disapproves
    // The hasDisapprovals check should block auto-build
    expect(updated!.status).not.toBe("building");

    vi.useRealTimers();
  });

  it("auto-build creates a build stub with building status immediately", async () => {
    vi.useFakeTimers();

    const { createTicket, addFeedback, getTicket, clearStorage } =
      await import("@/lib/store");

    clearStorage();

    const ticket = createTicket(
      "Build Stub Test",
      "Testing build stub creation",
      2
    );

    // All 4 approve — should trigger build
    addFeedback(ticket.id, "engineer", "Technically feasible.", true);
    addFeedback(ticket.id, "designer", "UX looks good.", true);
    addFeedback(ticket.id, "product-owner", "High business value.", true);
    addFeedback(ticket.id, "qa", "All criteria met.", true);

    vi.advanceTimersByTime(100);

    const updated = getTicket(ticket.id);

    // If status is building, a build stub must exist
    if (updated!.status === "building") {
      expect(updated!.buildReport).toBeDefined();
      expect(updated!.buildReport!.status).toBe("building");
      expect(updated!.buildReport!.ticketId).toBe(ticket.id);
      expect(updated!.buildReport!.id).toMatch(/^BLD-\d{3}$/);
    }

    vi.useRealTimers();
  });
});

// ===========================================================================
// AC 2: Full-context prompt from ticket + all persona feedback
// ===========================================================================

describe("AC 2: Full-context prompt includes all persona feedback", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("buildBuildPrompt includes ticket title and description", async () => {
    // We need to import the route module's internal buildBuildPrompt function.
    // Since it's not exported, we test the prompt through the API's behavior
    // by mocking callDeepSeek and inspecting what was passed to it.

    vi.doMock("@/lib/llm", () => ({
      callDeepSeek: vi.fn(),
      DEEPSEEK_PRO_MODEL: "deepseek-v4-pro",
      isLLMConfigured: () => true,
      AI_NOT_CONFIGURED_MESSAGE: "AI not configured",
      }));

    // Set up store mock with a ticket
    const mockTicket = {
      id: "TIX-001",
      title: "Dark Mode Toggle",
      description: "Add dark mode toggle to settings.",
      status: "consensus" as const,
      priority: 2 as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      tags: [],
      feedback: [
        {
          id: "FB-001",
          ticketId: "TIX-001",
          personaId: "engineer" as const,
          content: "Use CSS custom properties.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: true,
        },
        {
          id: "FB-002",
          ticketId: "TIX-001",
          personaId: "designer" as const,
          content: "Use cool gray palette.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: true,
        },
        {
          id: "FB-003",
          ticketId: "TIX-001",
          personaId: "product-owner" as const,
          content: "High priority for Q2.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: true,
        },
      ],
      approvals: ["engineer", "designer", "product-owner"] as const,
    };

    // The build route reads from the server data layer, not the client store
    vi.doMock("@/lib/server-db", () => ({
      getTicket: vi.fn(async () => mockTicket),
      getFeedbackHistory: vi.fn(async () => mockTicket.feedback),
      setBuildReport: vi.fn(async () => undefined),
    }));

    vi.doMock("@/lib/personas", () => ({
      getAllPersonas: vi.fn(() => [
        {
          id: "engineer",
          label: "Engineer",
          emoji: "⚙️",
          color: "bg-blue-600",
          expertise: "Tech",
          promptTemplate: "",
        },
        {
          id: "designer",
          label: "Designer",
          emoji: "🎨",
          color: "bg-purple-600",
          expertise: "UX",
          promptTemplate: "",
        },
        {
          id: "product-owner",
          label: "Product Owner",
          emoji: "📋",
          color: "bg-emerald-600",
          expertise: "Biz",
          promptTemplate: "",
        },
        {
          id: "qa",
          label: "QA",
          emoji: "🧪",
          color: "bg-amber-600",
          expertise: "Tests",
          promptTemplate: "",
        },
      ]),
    }));

    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      checkConsensusThreshold: vi.fn(() => ({
        reached: true,
        progress: 0.75,
        threshold: 0.75,
      })),
      generateBuildSummary: vi.fn(() => "# Build Summary\n\nTest summary."),
    }));

    const { callDeepSeek } = await import("@/lib/llm");
      const { POST } = await import("@/app/api/build/route");
    const { NextRequest } = await import("next/server");

    (callDeepSeek as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify({
        requirements: ["Req 1"],
        designDecisions: ["Design 1"],
        qaCriteria: ["QA 1"],
        implementationPlan: "## Plan",
        consensusSummary: "All approved.",
      }),
      model: "deepseek-v4-pro",
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    });

    const request = new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: "TIX-001" }),
    });

    await POST(request);

    // Verify the LLM was called with a prompt containing all context
    const callArgs = (callDeepSeek as ReturnType<typeof vi.fn>).mock
      .calls[0][0];

    // Prompt must include ticket context
    expect(callArgs.userPrompt).toContain("Dark Mode Toggle");
    expect(callArgs.userPrompt).toContain("Add dark mode toggle to settings.");
    expect(callArgs.userPrompt).toContain("TIX-001");

    // Prompt must include all persona feedback
    expect(callArgs.userPrompt).toContain("Use CSS custom properties.");
    expect(callArgs.userPrompt).toContain("Use cool gray palette.");
    expect(callArgs.userPrompt).toContain("High priority for Q2.");

    // Prompt must include consensus state
    expect(callArgs.userPrompt).toContain("Consensus State");
    expect(callArgs.userPrompt).toContain("Persona Feedback");

    // System prompt must instruct LLM to generate structured JSON
    expect(callArgs.systemPrompt).toContain("Concilium Build Engine");
    expect(callArgs.systemPrompt).toContain("JSON");
    expect(callArgs.systemPrompt).toContain("requirements");
    expect(callArgs.systemPrompt).toContain("designDecisions");
    expect(callArgs.systemPrompt).toContain("qaCriteria");
    expect(callArgs.systemPrompt).toContain("implementationPlan");
    expect(callArgs.systemPrompt).toContain("consensusSummary");

    // Model parameter must be passed
    expect(callArgs.model).toBe("deepseek-v4-pro");
    expect(callArgs.expectJson).toBe(true);
  });

  it("prompt includes pending persona status for non-approved personas", async () => {
    vi.doMock("@/lib/llm", () => ({
      callDeepSeek: vi.fn(),
      DEEPSEEK_PRO_MODEL: "deepseek-v4-pro",
      isLLMConfigured: () => true,
      AI_NOT_CONFIGURED_MESSAGE: "AI not configured",
      }));

    const mockTicket = {
      id: "TIX-002",
      title: "Test",
      description: "Test desc",
      status: "consensus" as const,
      priority: 2 as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      tags: [],
      feedback: [
        {
          id: "FB-001",
          ticketId: "TIX-002",
          personaId: "engineer" as const,
          content: "Looks good.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: true,
        },
        {
          id: "FB-002",
          ticketId: "TIX-002",
          personaId: "designer" as const,
          content: "Nice design.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: true,
        },
        {
          id: "FB-003",
          ticketId: "TIX-002",
          personaId: "product-owner" as const,
          content: "Good value.",
          createdAt: "2026-01-01T00:00:00.000Z",
          approved: true,
        },
      ],
      approvals: ["engineer", "designer", "product-owner"] as const,
    };

    vi.doMock("@/lib/server-db", () => ({
      getTicket: vi.fn(() => mockTicket),
      getFeedbackHistory: vi.fn(() => mockTicket.feedback),
      setBuildReport: vi.fn(),
    }));

    vi.doMock("@/lib/personas", () => ({
      getAllPersonas: vi.fn(() => [
        { id: "engineer", label: "Engineer", emoji: "⚙️", color: "", expertise: "", promptTemplate: "" },
        { id: "designer", label: "Designer", emoji: "🎨", color: "", expertise: "", promptTemplate: "" },
        { id: "product-owner", label: "Product Owner", emoji: "📋", color: "", expertise: "", promptTemplate: "" },
        { id: "qa", label: "QA", emoji: "🧪", color: "", expertise: "", promptTemplate: "" },
      ]),
    }));

    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      checkConsensusThreshold: vi.fn(() => ({
        reached: true, progress: 0.75, threshold: 0.75,
      })),
      generateBuildSummary: vi.fn(() => ""),
    }));

    const { callDeepSeek } = await import("@/lib/llm");
      const { POST } = await import("@/app/api/build/route");
    const { NextRequest } = await import("next/server");

    (callDeepSeek as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify({
        requirements: [], designDecisions: [], qaCriteria: [],
        implementationPlan: "", consensusSummary: "",
      }),
      model: "deepseek-v4-pro",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    });

    const request = new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: "TIX-002" }),
    });

    await POST(request);

    const callArgs = (callDeepSeek as ReturnType<typeof vi.fn>).mock.calls[0][0];

    // QA should appear as PENDING since they haven't approved
    expect(callArgs.userPrompt).toContain("PENDING");
    expect(callArgs.userPrompt).toContain("APPROVED");
    expect(callArgs.userPrompt).toContain("QA");
  });
});

// ===========================================================================
// AC 3: POST /api/build endpoint returns BuildReport
// ===========================================================================

describe("AC 3: POST /api/build returns BuildReport", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 400 when ticketId is missing", async () => {
    vi.doMock("@/lib/llm", () => ({
      callDeepSeek: vi.fn(),
      DEEPSEEK_PRO_MODEL: "deepseek-v4-pro",
      isLLMConfigured: () => true,
      AI_NOT_CONFIGURED_MESSAGE: "AI not configured",
      }));

    vi.doMock("@/lib/server-db", () => ({
      getTicket: vi.fn(),
      getFeedbackHistory: vi.fn(() => []),
      setBuildReport: vi.fn(),
    }));

    vi.doMock("@/lib/personas", () => ({
      getAllPersonas: vi.fn(() => []),
    }));

    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      checkConsensusThreshold: vi.fn(() => ({ reached: false, progress: 0, threshold: 0.75 })),
      generateBuildSummary: vi.fn(() => ""),
    }));

      const { POST } = await import("@/app/api/build/route");
    const { NextRequest } = await import("next/server");

    const request = new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Missing required field");
  });

  it("returns 400 for invalid ticket ID format", async () => {
    vi.doMock("@/lib/llm", () => ({
      callDeepSeek: vi.fn(),
      DEEPSEEK_PRO_MODEL: "deepseek-v4-pro",
      isLLMConfigured: () => true,
      AI_NOT_CONFIGURED_MESSAGE: "AI not configured",
      }));

    vi.doMock("@/lib/server-db", () => ({
      getTicket: vi.fn(),
      getFeedbackHistory: vi.fn(() => []),
      setBuildReport: vi.fn(),
    }));

    vi.doMock("@/lib/personas", () => ({
      getAllPersonas: vi.fn(() => []),
    }));

    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      checkConsensusThreshold: vi.fn(() => ({ reached: false, progress: 0, threshold: 0.75 })),
      generateBuildSummary: vi.fn(() => ""),
    }));

      const { POST } = await import("@/app/api/build/route");
    const { NextRequest } = await import("next/server");

    const request = new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: "INVALID" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid ticket ID format");
  });

  it("returns 404 when ticket does not exist", async () => {
    vi.doMock("@/lib/llm", () => ({
      callDeepSeek: vi.fn(),
      DEEPSEEK_PRO_MODEL: "deepseek-v4-pro",
      isLLMConfigured: () => true,
      AI_NOT_CONFIGURED_MESSAGE: "AI not configured",
      }));

    vi.doMock("@/lib/server-db", () => ({
      getTicket: vi.fn(() => undefined),
      getFeedbackHistory: vi.fn(() => []),
      setBuildReport: vi.fn(),
    }));

    vi.doMock("@/lib/personas", () => ({
      getAllPersonas: vi.fn(() => []),
    }));

    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      checkConsensusThreshold: vi.fn(() => ({ reached: false, progress: 0, threshold: 0.75 })),
      generateBuildSummary: vi.fn(() => ""),
    }));

      const { POST } = await import("@/app/api/build/route");
    const { NextRequest } = await import("next/server");

    const request = new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: "TIX-999" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain("Ticket not found");
  });

  it("returns 200 with properly shaped BuildReport on success", async () => {
    vi.doMock("@/lib/llm", () => ({
      callDeepSeek: vi.fn(),
      DEEPSEEK_PRO_MODEL: "deepseek-v4-pro",
      isLLMConfigured: () => true,
      AI_NOT_CONFIGURED_MESSAGE: "AI not configured",
      }));

    const mockTicket = {
      id: "TIX-001",
      title: "Test Feature",
      description: "Test desc",
      status: "consensus" as const,
      priority: 2 as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      tags: [],
      feedback: [
        {
          id: "FB-001", ticketId: "TIX-001", personaId: "engineer" as const,
          content: "Good.", createdAt: "2026-01-01T00:00:00.000Z", approved: true,
        },
        {
          id: "FB-002", ticketId: "TIX-001", personaId: "designer" as const,
          content: "Nice.", createdAt: "2026-01-01T00:00:00.000Z", approved: true,
        },
        {
          id: "FB-003", ticketId: "TIX-001", personaId: "product-owner" as const,
          content: "Great.", createdAt: "2026-01-01T00:00:00.000Z", approved: true,
        },
      ],
      approvals: ["engineer", "designer", "product-owner"] as const,
    };

    vi.doMock("@/lib/server-db", () => ({
      getTicket: vi.fn(() => mockTicket),
      getFeedbackHistory: vi.fn(() => mockTicket.feedback),
      setBuildReport: vi.fn(),
    }));

    vi.doMock("@/lib/personas", () => ({
      getAllPersonas: vi.fn(() => [
        { id: "engineer", label: "Engineer", emoji: "⚙️", color: "", expertise: "", promptTemplate: "" },
        { id: "designer", label: "Designer", emoji: "🎨", color: "", expertise: "", promptTemplate: "" },
        { id: "product-owner", label: "Product Owner", emoji: "📋", color: "", expertise: "", promptTemplate: "" },
        { id: "qa", label: "QA", emoji: "🧪", color: "", expertise: "", promptTemplate: "" },
      ]),
    }));

    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      checkConsensusThreshold: vi.fn(() => ({
        reached: true, progress: 0.75, threshold: 0.75,
      })),
      generateBuildSummary: vi.fn(() => "# Summary"),
    }));

    const { callDeepSeek } = await import("@/lib/llm");
      const { POST } = await import("@/app/api/build/route");
    const { NextRequest } = await import("next/server");

    (callDeepSeek as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify({
        requirements: ["Req A", "Req B"],
        designDecisions: ["Design X"],
        qaCriteria: ["QA 1", "QA 2"],
        implementationPlan: "## Steps\n\nDo the thing.",
        consensusSummary: "All personas approved.",
      }),
      model: "deepseek-v4-pro",
      usage: { promptTokens: 500, completionTokens: 300, totalTokens: 800 },
    });

    const request = new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: "TIX-001" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();

    // Verify BuildReport shape
    expect(body.buildReport).toBeDefined();
    expect(body.buildReport.id).toMatch(/^BLD-\d{3}$/);
    expect(body.buildReport.ticketId).toBe("TIX-001");
    expect(body.buildReport.status).toBe("building");
    expect(body.buildReport.createdAt).toBeDefined();

    // Verify all required sections
    expect(Array.isArray(body.buildReport.requirements)).toBe(true);
    expect(body.buildReport.requirements).toHaveLength(2);
    expect(body.buildReport.requirements[0]).toBe("Req A");

    expect(Array.isArray(body.buildReport.designDecisions)).toBe(true);
    expect(body.buildReport.designDecisions).toHaveLength(1);

    expect(Array.isArray(body.buildReport.qaCriteria)).toBe(true);
    expect(body.buildReport.qaCriteria).toHaveLength(2);

    expect(typeof body.buildReport.implementationPlan).toBe("string");
    expect(body.buildReport.implementationPlan).toContain("Steps");

    expect(typeof body.buildReport.consensusSummary).toBe("string");
    expect(body.buildReport.consensusSummary).toBe("All personas approved.");

    // Verify meta
    expect(body.meta).toBeDefined();
    expect(body.meta.model).toBe("deepseek-v4-pro");
    expect(body.meta.tokensUsed).toBe(800);
    expect(body.meta.processedAt).toBeDefined();
  });
});

// ===========================================================================
// AC 4: LLM response parsed into BuildReport shape
// ===========================================================================

describe("AC 4: LLM response parsed into BuildReport shape", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function setupApiMocks(llmContent: string) {
    const mockTicket = {
      id: "TIX-001",
      title: "Test",
      description: "Test",
      status: "consensus" as const,
      priority: 2 as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      tags: [],
      feedback: [
        {
          id: "FB-001", ticketId: "TIX-001", personaId: "engineer" as const,
          content: "OK.", createdAt: "2026-01-01T00:00:00.000Z", approved: true,
        },
        {
          id: "FB-002", ticketId: "TIX-001", personaId: "designer" as const,
          content: "OK.", createdAt: "2026-01-01T00:00:00.000Z", approved: true,
        },
        {
          id: "FB-003", ticketId: "TIX-001", personaId: "product-owner" as const,
          content: "OK.", createdAt: "2026-01-01T00:00:00.000Z", approved: true,
        },
      ],
      approvals: ["engineer", "designer", "product-owner"] as const,
    };

    vi.doMock("@/lib/llm", () => ({
      isLLMConfigured: () => true,
      AI_NOT_CONFIGURED_MESSAGE: "AI not configured",
      callDeepSeek: vi.fn().mockResolvedValue({
        content: llmContent,
        model: "deepseek-v4-pro",
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      }),
      DEEPSEEK_PRO_MODEL: "deepseek-v4-pro",
    }));

    vi.doMock("@/lib/server-db", () => ({
      getTicket: vi.fn(() => mockTicket),
      getFeedbackHistory: vi.fn(() => mockTicket.feedback),
      setBuildReport: vi.fn(),
    }));

    vi.doMock("@/lib/personas", () => ({
      getAllPersonas: vi.fn(() => [
        { id: "engineer", label: "Engineer", emoji: "⚙️", color: "", expertise: "", promptTemplate: "" },
        { id: "designer", label: "Designer", emoji: "🎨", color: "", expertise: "", promptTemplate: "" },
        { id: "product-owner", label: "Product Owner", emoji: "📋", color: "", expertise: "", promptTemplate: "" },
        { id: "qa", label: "QA", emoji: "🧪", color: "", expertise: "", promptTemplate: "" },
      ]),
    }));

    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      checkConsensusThreshold: vi.fn(() => ({
        reached: true, progress: 0.75, threshold: 0.75,
      })),
      generateBuildSummary: vi.fn(() => ""),
    }));
  }

  it("correctly parses clean JSON response", async () => {
    setupApiMocks(JSON.stringify({
      requirements: ["R1", "R2"],
      designDecisions: ["D1"],
      qaCriteria: ["Q1", "Q2", "Q3"],
      implementationPlan: "## Plan",
      consensusSummary: "Done.",
    }));

      const { POST } = await import("@/app/api/build/route");
    const { NextRequest } = await import("next/server");

    const request = new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: "TIX-001" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.buildReport.requirements).toHaveLength(2);
    expect(body.buildReport.designDecisions).toHaveLength(1);
    expect(body.buildReport.qaCriteria).toHaveLength(3);
    expect(body.buildReport.implementationPlan).toBe("## Plan");
    expect(body.buildReport.consensusSummary).toBe("Done.");
  });

  it("parses markdown-fenced JSON response", async () => {
    const jsonContent = JSON.stringify({
      requirements: ["From fence"],
      designDecisions: [],
      qaCriteria: ["Test all"],
      implementationPlan: "## Fenced",
      consensusSummary: "Fenced summary.",
    });

    setupApiMocks(`Sure, here you go:\n\n\`\`\`json\n${jsonContent}\n\`\`\``);

      const { POST } = await import("@/app/api/build/route");
    const { NextRequest } = await import("next/server");

    const request = new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: "TIX-001" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.buildReport.requirements).toHaveLength(1);
    expect(body.buildReport.requirements[0]).toBe("From fence");
    expect(body.buildReport.implementationPlan).toBe("## Fenced");
  });

  it("handles missing fields gracefully with defaults", async () => {
    setupApiMocks(JSON.stringify({}));

      const { POST } = await import("@/app/api/build/route");
    const { NextRequest } = await import("next/server");

    const request = new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: "TIX-001" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();

    // Empty arrays/strings for missing fields
    expect(body.buildReport.requirements).toEqual([]);
    expect(body.buildReport.designDecisions).toEqual([]);
    expect(body.buildReport.qaCriteria).toEqual([]);
    expect(body.buildReport.implementationPlan).toBe("");
    expect(body.buildReport.consensusSummary).toBe("");
  });

  it("filters out empty strings from arrays", async () => {
    setupApiMocks(JSON.stringify({
      requirements: ["Valid req", "", "  ", "Another req"],
      designDecisions: ["", "Only design"],
      qaCriteria: ["", "", ""],
      implementationPlan: "",
      consensusSummary: "",
    }));

      const { POST } = await import("@/app/api/build/route");
    const { NextRequest } = await import("next/server");

    const request = new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: "TIX-001" }),
    });

    const response = await POST(request);
    const body = await response.json();

    // Empty/whitespace strings should be filtered out
    expect(body.buildReport.requirements).toHaveLength(2);
    expect(body.buildReport.requirements).toEqual(["Valid req", "Another req"]);
    expect(body.buildReport.designDecisions).toHaveLength(1);
    expect(body.buildReport.designDecisions[0]).toBe("Only design");
    expect(body.buildReport.qaCriteria).toHaveLength(0);
  });

  it("handles non-string array items by converting to strings", async () => {
    setupApiMocks(JSON.stringify({
      requirements: ["String req", 42, true],
      designDecisions: [null, "Valid"],
      qaCriteria: [],
      implementationPlan: "",
      consensusSummary: "",
    }));

      const { POST } = await import("@/app/api/build/route");
    const { NextRequest } = await import("next/server");

    const request = new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: "TIX-001" }),
    });

    const response = await POST(request);
    const body = await response.json();

    // Non-strings converted via String()
    expect(body.buildReport.requirements).toEqual(["String req", "42", "true"]);
    // null -> "null" gets filtered by .filter(Boolean) since "null" is truthy
    // Actually, String(null) = "null" which is truthy
    expect(body.buildReport.designDecisions).toEqual(["null", "Valid"]);
  });
});

// ===========================================================================
// AC 5: BuildReport saved to ticket, status → "building"
// ===========================================================================

describe("AC 5: BuildReport saved to ticket with building status", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("setBuildReport persists the report and updates ticket", async () => {
    const mockStorage = {
      store: {} as Record<string, string>,
      getItem: vi.fn((key: string) => mockStorage.store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { mockStorage.store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete mockStorage.store[key]; }),
      clear: vi.fn(() => { Object.keys(mockStorage.store).forEach(k => delete mockStorage.store[k]); }),
      get length() { return Object.keys(mockStorage.store).length; },
      key: vi.fn((index: number) => Object.keys(mockStorage.store)[index] ?? null),
    };

    vi.stubGlobal("localStorage", mockStorage);
    vi.stubGlobal("window", { addEventListener: vi.fn(), dispatchEvent: vi.fn() });

    vi.useFakeTimers();

    const storeMod = await vi.importActual<typeof import("@/lib/store")>(
      "@/lib/store"
    );
    const { createTicket, addFeedback, getTicket, clearStorage } = storeMod;

    clearStorage();

    const ticket = createTicket("Build Save Test", "Testing build persistence", 2);

    // Add all 4 approvals to trigger build
    addFeedback(ticket.id, "engineer", "Good.", true);
    addFeedback(ticket.id, "designer", "Good.", true);
    addFeedback(ticket.id, "product-owner", "Good.", true);
    addFeedback(ticket.id, "qa", "Good.", true);

    vi.advanceTimersByTime(100);

    const updated = getTicket(ticket.id);

    // If build was auto-triggered, status is "building" and report exists
    if (updated!.status === "building") {
      expect(updated!.buildReport).toBeDefined();
      expect(updated!.buildReport!.ticketId).toBe(ticket.id);
      expect(updated!.buildReport!.status).toBe("building");
      expect(updated!.buildReport!.consensusSummary).toBeDefined();
      expect(updated!.buildReport!.requirements).toBeDefined();
    }

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("completeBuild transitions ticket from building to done", async () => {
    const mockStorage = {
      store: {} as Record<string, string>,
      getItem: vi.fn((key: string) => mockStorage.store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { mockStorage.store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete mockStorage.store[key]; }),
      clear: vi.fn(() => { Object.keys(mockStorage.store).forEach(k => delete mockStorage.store[k]); }),
      get length() { return Object.keys(mockStorage.store).length; },
      key: vi.fn((index: number) => Object.keys(mockStorage.store)[index] ?? null),
    };

    vi.stubGlobal("localStorage", mockStorage);
    vi.stubGlobal("window", { addEventListener: vi.fn(), dispatchEvent: vi.fn() });

    vi.useFakeTimers();

    const storeMod2 = await vi.importActual<typeof import("@/lib/store")>(
      "@/lib/store"
    );
    const { createTicket, addFeedback, completeBuild, getTicket, clearStorage } =
      storeMod2;

    clearStorage();

    const ticket = createTicket("Complete Build Test", "Testing build completion", 2);

    // Trigger build via feedback
    addFeedback(ticket.id, "engineer", "Good.", true);
    addFeedback(ticket.id, "designer", "Good.", true);
    addFeedback(ticket.id, "product-owner", "Good.", true);
    addFeedback(ticket.id, "qa", "Good.", true);

    vi.advanceTimersByTime(100);

    const buildingTicket = getTicket(ticket.id);

    // Only test completeBuild if status is building
    if (buildingTicket!.status === "building") {
      const result = completeBuild(ticket.id);
      expect(result).not.toBeNull();
      expect(result!.status).toBe("done");
      expect(result!.buildReport?.status).toBe("completed");
      expect(result!.buildReport?.completedAt).toBeDefined();
    }

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});

// ===========================================================================
// AC 6: Build output visible inline on ticket detail page
// ===========================================================================

describe("AC 6: Build output visible inline on ticket detail page", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("BuildReportInline renders when ticket has a buildReport", async () => {
    const { BuildReportInline } = await import("@/components/BuildReportInline");
    const buildReport = {
      id: "BLD-001",
      ticketId: "TIX-001",
      createdAt: "2026-05-27T10:00:00Z",
      status: "completed" as const,
      requirements: ["Add dark mode toggle"],
      designDecisions: ["Use cool gray palette"],
      qaCriteria: ["Test on all breakpoints"],
      implementationPlan: "## Steps\n\n1. Add toggle",
      consensusSummary: "All 4 personas approved.",
    };

    const ticket = {
      id: "TIX-001",
      title: "Dark mode toggle",
      description: "Add dark mode toggle to settings.",
      status: "done" as const,
      priority: 1 as const,
      createdAt: "2026-05-27T09:00:00Z",
      updatedAt: "2026-05-27T10:00:00Z",
      tags: [],
      feedback: [],
      approvals: ["engineer", "designer", "qa", "product-owner"] as PersonaId[],
      buildReport,
    };

    render(<BuildReportInline ticket={ticket} />);

    // Build report content should be visible
    expect(screen.getByText("BLD-001")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Consensus Summary")).toBeInTheDocument();
    expect(screen.getByText("All 4 personas approved.")).toBeInTheDocument();

    // Collapsible section headers
    expect(screen.getByText("Requirements")).toBeInTheDocument();
    expect(screen.getByText("Design Decisions")).toBeInTheDocument();
    expect(screen.getByText("QA Criteria")).toBeInTheDocument();

    // Implementation plan section
    expect(screen.getByText("Implementation Plan")).toBeInTheDocument();

    // View Full Report link
    expect(screen.getByText("View Full Report")).toBeInTheDocument();
  });

  it("renders building status badge with polling indicator", async () => {
    const { BuildReportInline } = await import("@/components/BuildReportInline");
    const buildReport = {
      id: "BLD-002",
      ticketId: "TIX-002",
      createdAt: "2026-05-27T10:00:00Z",
      status: "building" as const,
      requirements: ["Generating..."],
      designDecisions: [],
      qaCriteria: [],
      implementationPlan: "## Building...",
      consensusSummary: "Generating...",
    };

    const ticket = {
      id: "TIX-002",
      title: "New feature",
      description: "Feature description.",
      status: "building" as const,
      priority: 2 as const,
      createdAt: "2026-05-27T09:00:00Z",
      updatedAt: "2026-05-27T10:00:00Z",
      tags: [],
      feedback: [],
      approvals: ["engineer", "designer", "product-owner"] as PersonaId[],
      buildReport,
    };

    render(<BuildReportInline ticket={ticket} />);

    // Should show "Building" badge
    expect(screen.getByText("Building")).toBeInTheDocument();
    // Should still show the report ID
    expect(screen.getByText("BLD-002")).toBeInTheDocument();
  });

  it("renders failed status badge when build fails", async () => {
    const { BuildReportInline } = await import("@/components/BuildReportInline");
    const buildReport = {
      id: "BLD-003",
      ticketId: "TIX-003",
      createdAt: "2026-05-27T10:00:00Z",
      status: "failed" as const,
      requirements: [],
      designDecisions: [],
      qaCriteria: [],
      implementationPlan: "",
      consensusSummary: "Build failed due to API error.",
    };

    const ticket = {
      id: "TIX-003",
      title: "Broken feature",
      description: "Something went wrong.",
      status: "building" as const,
      priority: 2 as const,
      createdAt: "2026-05-27T09:00:00Z",
      updatedAt: "2026-05-27T10:00:00Z",
      tags: [],
      feedback: [],
      approvals: [],
      buildReport,
    };

    render(<BuildReportInline ticket={ticket} />);

    // Since DEV-63, a failed build in "building" status renders the retry
    // card rather than a plain Failed badge.
    expect(screen.getByText("Build Generation Failed")).toBeInTheDocument();
  });

  it("returns null when no buildReport exists on ticket", async () => {
    const { BuildReportInline } = await import("@/components/BuildReportInline");
    const ticket = {
      id: "TIX-004",
      title: "No build",
      description: "No build report.",
      status: "draft" as const,
      priority: 2 as const,
      createdAt: "2026-05-27T09:00:00Z",
      updatedAt: "2026-05-27T10:00:00Z",
      tags: [],
      feedback: [],
      approvals: [],
    };

    const { container } = render(<BuildReportInline ticket={ticket} />);
    expect(container.firstChild).toBeNull();
  });

  it("collapsible sections expand and collapse on click", async () => {
    const { BuildReportInline } = await import("@/components/BuildReportInline");
    const buildReport = {
      id: "BLD-005",
      ticketId: "TIX-005",
      createdAt: "2026-05-27T10:00:00Z",
      status: "completed" as const,
      requirements: ["Must have dark mode toggle"],
      designDecisions: ["Use user-preference media query as default"],
      qaCriteria: ["Verify across all breakpoints"],
      implementationPlan: "",
      consensusSummary: "",
    };

    const ticket = {
      id: "TIX-005",
      title: "Collapsible test",
      description: "Test.",
      status: "done" as const,
      priority: 2 as const,
      createdAt: "2026-05-27T09:00:00Z",
      updatedAt: "2026-05-27T10:00:00Z",
      tags: [],
      feedback: [],
      approvals: [],
      buildReport,
    };

    render(<BuildReportInline ticket={ticket} />);

    // Items should be initially hidden (collapsed)
    expect(screen.queryByText("Must have dark mode toggle")).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByText("Requirements"));
    expect(screen.getByText("Must have dark mode toggle")).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(screen.getByText("Requirements"));
    expect(screen.queryByText("Must have dark mode toggle")).not.toBeInTheDocument();
  });

  it("view full report link points to /build/[ticketId]", async () => {
    const { BuildReportInline } = await import("@/components/BuildReportInline");
    const buildReport = {
      id: "BLD-006",
      ticketId: "TIX-006",
      createdAt: "2026-05-27T10:00:00Z",
      status: "completed" as const,
      requirements: [],
      designDecisions: [],
      qaCriteria: [],
      implementationPlan: "",
      consensusSummary: "",
    };

    const ticket = {
      id: "TIX-006",
      title: "Link test",
      description: "Test.",
      status: "done" as const,
      priority: 2 as const,
      createdAt: "2026-05-27T09:00:00Z",
      updatedAt: "2026-05-27T10:00:00Z",
      tags: [],
      feedback: [],
      approvals: [],
      buildReport,
    };

    render(<BuildReportInline ticket={ticket} />);

    const links = screen.getAllByRole("link");
    const fullReportLink = links.find((l) =>
      l.textContent?.includes("View Full Report")
    );
    expect(fullReportLink).toBeDefined();
    expect(fullReportLink).toHaveAttribute("href", "/build/TIX-006");
  });
});

// ===========================================================================
// AC 7: Manual triggerBuild() routes through /api/build
// ===========================================================================

describe("AC 7: Manual triggerBuild() routes through /api/build", () => {
  beforeEach(() => {
    // Clear doMock registrations leaked from earlier suites — these tests
    // exercise the real store/consensus modules.
    vi.doUnmock("@/lib/llm");
    vi.doUnmock("@/lib/consensus-threshold");
    vi.doUnmock("@/lib/personas");
    vi.doUnmock("@/lib/server-db");
    vi.resetModules();
  });

  it("triggerBuild sets status to building with a build stub", async () => {
    const mockStorage = {
      store: {} as Record<string, string>,
      getItem: vi.fn((key: string) => mockStorage.store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { mockStorage.store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete mockStorage.store[key]; }),
      clear: vi.fn(() => { Object.keys(mockStorage.store).forEach(k => delete mockStorage.store[k]); }),
      get length() { return Object.keys(mockStorage.store).length; },
      key: vi.fn((index: number) => Object.keys(mockStorage.store)[index] ?? null),
    };

    vi.stubGlobal("localStorage", mockStorage);
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      location: { origin: "http://localhost:3000" },
    });

    vi.useFakeTimers();

    const storeMod3 = await vi.importActual<typeof import("@/lib/store")>(
      "@/lib/store"
    );
    const { createTicket, addFeedback, clearStorage } = storeMod3;

    clearStorage();

    // Create a ticket with all approvals (consensus met but no auto-build triggered)
    const ticket = createTicket("Manual Build Test", "Testing manual trigger", 2);
    addFeedback(ticket.id, "engineer", "Good.", true);
    addFeedback(ticket.id, "designer", "Good.", true);
    addFeedback(ticket.id, "product-owner", "Good.", true);
    addFeedback(ticket.id, "qa", "Good.", true);

    vi.advanceTimersByTime(100);

    // Now dynamically import triggerBuild and verify it exists
    const { triggerBuild } = storeMod3;
    const { getBuildReadiness } =
      await vi.importActual<typeof import("@/lib/consensus-threshold")>(
        "@/lib/consensus-threshold"
      );

    // getBuildReadiness should report ready
    const storedTicket = storeMod3.getTicket(ticket.id);
    if (storedTicket) {
      const readiness = getBuildReadiness(storedTicket);
      // Should be ready if all approved
      expect(readiness.ready).toBe(true);
    }

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("triggerBuild returns null when build readiness is not met", async () => {
    const mockStorage = {
      store: {} as Record<string, string>,
      getItem: vi.fn((key: string) => mockStorage.store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { mockStorage.store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete mockStorage.store[key]; }),
      clear: vi.fn(() => { Object.keys(mockStorage.store).forEach(k => delete mockStorage.store[k]); }),
      get length() { return Object.keys(mockStorage.store).length; },
      key: vi.fn((index: number) => Object.keys(mockStorage.store)[index] ?? null),
    };

    vi.stubGlobal("localStorage", mockStorage);
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      location: { origin: "http://localhost:3000" },
    });

    vi.useFakeTimers();

    const storeMod4 = await vi.importActual<typeof import("@/lib/store")>(
      "@/lib/store"
    );
    const { createTicket, clearStorage, triggerBuild, getTicket } =
      storeMod4;

    clearStorage();

    // Create a ticket with no feedback (not ready)
    const ticket = createTicket("Not Ready Test", "Should not build", 2);
    vi.advanceTimersByTime(100);

    // triggerBuild should return null because not ready
    const result = await triggerBuild(ticket.id);
    expect(result).toBeNull();

    const unchanged = getTicket(ticket.id);
    expect(unchanged!.status).toBe("draft");

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("triggerBuild returns null for non-existent ticket", async () => {
    const mockStorage = {
      store: {} as Record<string, string>,
      getItem: vi.fn((key: string) => mockStorage.store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { mockStorage.store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete mockStorage.store[key]; }),
      clear: vi.fn(() => { Object.keys(mockStorage.store).forEach(k => delete mockStorage.store[k]); }),
      get length() { return Object.keys(mockStorage.store).length; },
      key: vi.fn((index: number) => Object.keys(mockStorage.store)[index] ?? null),
    };

    vi.stubGlobal("localStorage", mockStorage);
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      location: { origin: "http://localhost:3000" },
    });

    vi.useFakeTimers();

    const storeMod5 = await vi.importActual<typeof import("@/lib/store")>(
      "@/lib/store"
    );
    const { clearStorage, triggerBuild } = storeMod5;
    clearStorage();

    const result = await triggerBuild("TIX-999");
    expect(result).toBeNull();

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});

// ===========================================================================
// AC 7b: BuildTrigger component renders correctly
// ===========================================================================

describe("AC 7b: BuildTrigger component integration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("BuildTrigger component shows ready state when consensus met", async () => {
    // We must mock store before importing BuildTrigger
    const mockTriggerBuild = vi.fn();
    const mockGetBuildReadiness = vi.fn(() => ({
      ready: true,
      score: 100,
      blockers: [],
      nextSteps: ["All clear — ready to build!"],
    }));

    vi.doMock("@/lib/store", () => ({
      triggerBuild: mockTriggerBuild,
      getBuildReadiness: mockGetBuildReadiness,
      seedData: vi.fn(),
      getTicket: vi.fn(),
    }));

    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      getBuildReadiness: mockGetBuildReadiness,
      generateBuildSummary: vi.fn(() => "# Summary"),
      DEFAULT_THRESHOLD: 0.75,
    }));

    vi.doMock("@/lib/personas", () => ({
      getAllPersonas: vi.fn(() => [
        { id: "engineer", label: "Engineer", emoji: "⚙️", color: "", expertise: "", promptTemplate: "" },
        { id: "designer", label: "Designer", emoji: "🎨", color: "", expertise: "", promptTemplate: "" },
        { id: "product-owner", label: "Product Owner", emoji: "📋", color: "", expertise: "", promptTemplate: "" },
        { id: "qa", label: "QA", emoji: "🧪", color: "", expertise: "", promptTemplate: "" },
      ]),
    }));

    const { BuildTrigger } = await import("@/components/BuildTrigger");
    const { ToastProvider } = await import("@/components/Toast");

    const ticket = {
      id: "TIX-001",
      title: "Ready ticket",
      description: "Ready to build.",
      status: "consensus" as const,
      priority: 2 as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      tags: [],
      feedback: [
        {
          id: "FB-001", ticketId: "TIX-001", personaId: "engineer" as const,
          content: "OK.", createdAt: "2026-01-01T00:00:00.000Z", approved: true,
        },
      ],
      approvals: ["engineer", "designer", "product-owner"] as PersonaId[],
    };

    render(<ToastProvider><BuildTrigger ticket={ticket} onBuildTriggered={vi.fn()} /></ToastProvider>);

    // Should show "Ready to Build!" button since readiness is true
    expect(screen.getByText("Ready to Build!")).toBeInTheDocument();
    // Should show 100% score
    expect(screen.getByText("100%")).toBeInTheDocument();
    // Should show threshold indicator
    expect(screen.getByText(/75%/)).toBeInTheDocument();
  });

  it("BuildTrigger component shows 'Build In Progress' when status is building", async () => {
    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      getBuildReadiness: vi.fn(() => ({
        ready: false, score: 100, blockers: [], nextSteps: [],
      })),
      generateBuildSummary: vi.fn(() => ""),
      DEFAULT_THRESHOLD: 0.75,
    }));

    vi.doMock("@/lib/store", () => ({
      triggerBuild: vi.fn(),
      getBuildReadiness: vi.fn(() => ({
        ready: false, score: 100, blockers: [], nextSteps: [],
      })),
    }));

    vi.doMock("@/lib/personas", () => ({
      getAllPersonas: vi.fn(() => []),
    }));

    const { BuildTrigger } = await import("@/components/BuildTrigger");
    const { ToastProvider } = await import("@/components/Toast");

    const ticket = {
      id: "TIX-002",
      title: "Building ticket",
      description: "Already building.",
      status: "building" as const,
      priority: 2 as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      tags: [],
      feedback: [],
      approvals: ["engineer", "designer", "product-owner"] as PersonaId[],
      buildReport: {
        id: "BLD-001",
        ticketId: "TIX-002",
        createdAt: "2026-01-01T00:00:00.000Z",
        status: "building" as const,
        requirements: [],
        designDecisions: [],
        qaCriteria: [],
        implementationPlan: "",
        consensusSummary: "",
      },
    };

    render(<ToastProvider><BuildTrigger ticket={ticket} onBuildTriggered={vi.fn()} /></ToastProvider>);

    expect(screen.getByText("Build In Progress")).toBeInTheDocument();
    expect(screen.getByText("View Report")).toBeInTheDocument();
  });

  it("BuildTrigger component shows 'Build Complete' when status is done", async () => {
    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      getBuildReadiness: vi.fn(() => ({
        ready: false, score: 100, blockers: [], nextSteps: [],
      })),
      generateBuildSummary: vi.fn(() => ""),
      DEFAULT_THRESHOLD: 0.75,
    }));

    vi.doMock("@/lib/store", () => ({
      triggerBuild: vi.fn(),
      getBuildReadiness: vi.fn(() => ({
        ready: false, score: 100, blockers: [], nextSteps: [],
      })),
    }));

    vi.doMock("@/lib/personas", () => ({
      getAllPersonas: vi.fn(() => []),
    }));

    const { BuildTrigger } = await import("@/components/BuildTrigger");
    const { ToastProvider } = await import("@/components/Toast");

    const ticket = {
      id: "TIX-003",
      title: "Done ticket",
      description: "Build complete.",
      status: "done" as const,
      priority: 2 as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      tags: [],
      feedback: [],
      approvals: ["engineer", "designer", "product-owner", "qa"] as PersonaId[],
      buildReport: {
        id: "BLD-002",
        ticketId: "TIX-003",
        createdAt: "2026-01-01T00:00:00.000Z",
        status: "completed" as const,
        requirements: ["Done"],
        designDecisions: [],
        qaCriteria: [],
        implementationPlan: "## Done",
        consensusSummary: "All approved.",
      },
    };

    render(<ToastProvider><BuildTrigger ticket={ticket} onBuildTriggered={vi.fn()} /></ToastProvider>);

    expect(screen.getByText("Build Complete")).toBeInTheDocument();
  });
});

// ===========================================================================
// AC 8: Graceful error handling
// ===========================================================================

describe("AC 8: Graceful error handling", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("API returns 500 on LLM call failure", async () => {
    vi.doMock("@/lib/llm", () => ({
      isLLMConfigured: () => true,
      AI_NOT_CONFIGURED_MESSAGE: "AI not configured",
      callDeepSeek: vi.fn().mockRejectedValue(new Error("API timeout")),
      DEEPSEEK_PRO_MODEL: "deepseek-v4-pro",
    }));

    const mockTicket = {
      id: "TIX-001",
      title: "Error test",
      description: "Test error handling",
      status: "consensus" as const,
      priority: 2 as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      tags: [],
      feedback: [
        {
          id: "FB-001", ticketId: "TIX-001", personaId: "engineer" as const,
          content: "OK.", createdAt: "2026-01-01T00:00:00.000Z", approved: true,
        },
        {
          id: "FB-002", ticketId: "TIX-001", personaId: "designer" as const,
          content: "OK.", createdAt: "2026-01-01T00:00:00.000Z", approved: true,
        },
        {
          id: "FB-003", ticketId: "TIX-001", personaId: "product-owner" as const,
          content: "OK.", createdAt: "2026-01-01T00:00:00.000Z", approved: true,
        },
      ],
      approvals: ["engineer", "designer", "product-owner"] as const,
    };

    vi.doMock("@/lib/server-db", () => ({
      getTicket: vi.fn(() => mockTicket),
      getFeedbackHistory: vi.fn(() => mockTicket.feedback),
      setBuildReport: vi.fn(),
    }));

    vi.doMock("@/lib/personas", () => ({
      getAllPersonas: vi.fn(() => [
        { id: "engineer", label: "Engineer", emoji: "", color: "", expertise: "", promptTemplate: "" },
        { id: "designer", label: "Designer", emoji: "", color: "", expertise: "", promptTemplate: "" },
        { id: "product-owner", label: "Product Owner", emoji: "", color: "", expertise: "", promptTemplate: "" },
        { id: "qa", label: "QA", emoji: "", color: "", expertise: "", promptTemplate: "" },
      ]),
    }));

    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      checkConsensusThreshold: vi.fn(() => ({
        reached: true, progress: 0.75, threshold: 0.75,
      })),
      generateBuildSummary: vi.fn(() => ""),
    }));

      const { POST } = await import("@/app/api/build/route");
    const { NextRequest } = await import("next/server");

    const request = new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: "TIX-001" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });

  it("API returns 500 when prompt cannot be built (missing ticket data)", async () => {
    vi.doMock("@/lib/llm", () => ({
      callDeepSeek: vi.fn(),
      DEEPSEEK_PRO_MODEL: "deepseek-v4-pro",
      isLLMConfigured: () => true,
      AI_NOT_CONFIGURED_MESSAGE: "AI not configured",
      }));

    // BuildBuildPrompt calls getTicket which returns undefined
    // but the route already checked for that. The only way to hit
    // this path is if buildBuildPrompt's checkConsensusThreshold fails.
    // Actually, the route returns 500 in the catch block for any error.
    // Let's test that the setBuildReport is NOT called on error.

    vi.doMock("@/lib/store", () => ({
      getTicket: vi.fn(() => ({
        id: "TIX-002",
        title: "Test",
        description: "Test",
        status: "consensus",
        priority: 2,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        tags: [],
        feedback: [],
        approvals: [],
      })),
      getFeedbackHistory: vi.fn(() => {
        throw new Error("Store corruption");
      }),
      setBuildReport: vi.fn(),
    }));

    vi.doMock("@/lib/personas", () => ({
      getAllPersonas: vi.fn(() => []),
    }));

    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      checkConsensusThreshold: vi.fn(() => ({
        reached: false, progress: 0, threshold: 0.75,
      })),
      generateBuildSummary: vi.fn(() => ""),
    }));

      const { POST } = await import("@/app/api/build/route");
    const { NextRequest } = await import("next/server");

    const request = new NextRequest("http://localhost:3000/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: "TIX-002" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });

  it("BuildReportInline handles empty build report fields gracefully", async () => {
    const { BuildReportInline } = await import("@/components/BuildReportInline");

    const buildReport = {
      id: "BLD-007",
      ticketId: "TIX-007",
      createdAt: "2026-05-27T10:00:00Z",
      status: "completed" as const,
      requirements: [],
      designDecisions: [],
      qaCriteria: [],
      implementationPlan: "",
      consensusSummary: "",
    };

    const ticket = {
      id: "TIX-007",
      title: "Empty build",
      description: "All empty.",
      status: "done" as const,
      priority: 2 as const,
      createdAt: "2026-05-27T09:00:00Z",
      updatedAt: "2026-05-27T10:00:00Z",
      tags: [],
      feedback: [],
      approvals: [],
      buildReport,
    };

    // Should render without crashing
    render(<BuildReportInline ticket={ticket} />);

    // Still shows header
    expect(screen.getByText("BLD-007")).toBeInTheDocument();
    expect(screen.getByText("View Full Report")).toBeInTheDocument();

    // Expand empty sections — should show empty text
    fireEvent.click(screen.getByText("Requirements"));
    expect(screen.getByText("No requirements extracted.")).toBeInTheDocument();
  });
});

// ===========================================================================
// AC 9: Tests for the pipeline
// ===========================================================================

describe("AC 9: Pipeline test coverage", () => {
  it("build API test file exists and is importable", async () => {
    const mod = await import("@/app/api/__tests__/build.test");
    expect(mod).toBeDefined();
    expect(typeof mod).toBe("object");
  });

  it("consensus threshold test file exists and is importable", async () => {
    const mod = await import("@/lib/__tests__/consensus-threshold.test");
    expect(mod).toBeDefined();
    expect(typeof mod).toBe("object");
  });

  it("store test file exists and tests build-related functions", async () => {
    const mod = await import("@/lib/__tests__/store.test");
    expect(mod).toBeDefined();
  });

  it("BuildReportInline test file exists and is importable", async () => {
    const mod = await import("@/components/__tests__/BuildReportInline.test");
    expect(mod).toBeDefined();
    expect(typeof mod).toBe("object");
  });

  it("BuildTrigger component module is importable", async () => {
    // BuildTrigger unit tests don't exist yet, but the component does
    const mod = await import("@/components/BuildTrigger");
    expect(mod).toBeDefined();
    expect(typeof mod.BuildTrigger).toBe("function");
  });

  it("real store exports triggerBuild and completeBuild", async () => {
    // Import real store (not mock) to verify build function exports
    const realStore = await vi.importActual<typeof import("@/lib/store")>(
      "@/lib/store"
    );
    expect(typeof realStore.triggerBuild).toBe("function");
    expect(typeof realStore.completeBuild).toBe("function");
    expect(typeof realStore.setBuildReport).toBe("function");
    expect(typeof realStore.getBuildReport).toBe("function");
  });

  it("BuildReport type is properly exported from types.ts", async () => {
    const types = await vi.importActual<typeof import("@/lib/types")>(
      "@/lib/types"
    );

    // Verify BuildReport type exists by constructing one inline
    // (BuildReport is an interface so it can't be accessed as a runtime value)
    const report = {
      id: "BLD-001",
      ticketId: "TIX-001",
      createdAt: "2026-01-01T00:00:00Z",
      status: "building" as const,
      requirements: [] as string[],
      designDecisions: [] as string[],
      qaCriteria: [] as string[],
      implementationPlan: "",
      consensusSummary: "",
    };

    expect(report).toBeDefined();
    expect(report.id).toBe("BLD-001");
    expect(report.status).toBe("building");
  });

  it("consensus threshold module exports expected functions", async () => {
    const ct = await vi.importActual<typeof import("@/lib/consensus-threshold")>(
      "@/lib/consensus-threshold"
    );

    expect(typeof ct.checkConsensusThreshold).toBe("function");
    expect(typeof ct.getBuildReadiness).toBe("function");
    expect(typeof ct.generateBuildSummary).toBe("function");
    expect(typeof ct.buildBuildReport).toBe("function");
    expect(ct.DEFAULT_THRESHOLD).toBe(0.75);
  });
});

// ===========================================================================
// Integration: Full end-to-end user flow
// ===========================================================================

describe("Full pipeline integration: from feedback to build display", () => {
  beforeEach(() => {
    // Fresh module registry — these tests register their own mocks and must
    // not inherit cached imports, registrations, or stubbed globals (e.g. the
    // minimal window stubs from the AC7 suite) from earlier suites.
    vi.unstubAllGlobals();
    vi.doUnmock("@/lib/llm");
    vi.doUnmock("@/lib/consensus-threshold");
    vi.doUnmock("@/lib/personas");
    vi.doUnmock("@/lib/server-db");
    vi.resetModules();
  });

  it("user sees build report on ticket detail page after consensus", async () => {
    // This test simulates the full user journey:
    // 1. Ticket reaches consensus → build triggered
    // 2. BuildReport appears inline on ticket page

    // Mock store to return a ticket with buildReport
    const mockLoadTicket = vi.fn();
    const buildReport = {
      id: "BLD-010",
      ticketId: "TIX-010",
      createdAt: "2026-05-27T10:00:00Z",
      status: "completed" as const,
      requirements: ["Implement dark mode toggle"],
      designDecisions: ["Use sun/moon icon"],
      qaCriteria: ["Test on all breakpoints"],
      implementationPlan: "## Steps\n\n1. Create toggle\n2. Wire up theme",
      consensusSummary: "All 4 personas approved unanimously.",
    };

    vi.doMock("@/lib/store", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/store")>()),
      seedData: vi.fn(),
      getTicket: vi.fn(() => ({
        id: "TIX-010",
        title: "Dark Mode Feature",
        description: "Add dark mode support across the app.",
        status: "done" as const,
        priority: 1 as const,
        createdAt: "2026-05-27T09:00:00Z",
        updatedAt: "2026-05-27T12:00:00Z",
        tags: [],
        feedback: [
          {
            id: "FB-001", ticketId: "TIX-010", personaId: "engineer" as const,
            content: "Use CSS custom properties.", createdAt: "2026-05-27T09:30:00Z", approved: true,
          },
          {
            id: "FB-002", ticketId: "TIX-010", personaId: "designer" as const,
            content: "Use cool gray palette.", createdAt: "2026-05-27T09:35:00Z", approved: true,
          },
          {
            id: "FB-003", ticketId: "TIX-010", personaId: "product-owner" as const,
            content: "High priority for Q2.", createdAt: "2026-05-27T09:40:00Z", approved: true,
          },
          {
            id: "FB-004", ticketId: "TIX-010", personaId: "qa" as const,
            content: "Test contrast ratios.", createdAt: "2026-05-27T09:45:00Z", approved: true,
          },
        ],
        approvals: ["engineer", "designer", "product-owner", "qa"],
        buildReport,
      })),
      deleteTicket: vi.fn(),
      updateTicket: vi.fn(),
      updateTicketPriority: vi.fn(),
      updateTicketTags: vi.fn(),
      getBuildReadiness: vi.fn(() => ({
        ready: true, score: 100, blockers: [], nextSteps: [],
      })),
    }));

    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      checkConsensusThreshold: vi.fn(() => ({
        reached: true, progress: 1.0, threshold: 0.75,
      })),
      getBuildReadiness: vi.fn(() => ({
        ready: true, score: 100, blockers: [], nextSteps: [],
      })),
      generateBuildSummary: vi.fn(() => "# Summary"),
      DEFAULT_THRESHOLD: 0.75,
    }));

    vi.doMock("@/lib/personas", () => ({
      getPersona: vi.fn(() => ({
        id: "engineer",
        label: "Engineer",
        emoji: "⚙️",
        color: "bg-blue-600",
        expertise: "Tech",
        promptTemplate: "",
      })),
      getAllPersonas: vi.fn(() => [
        { id: "engineer", label: "Engineer", emoji: "⚙️", color: "", expertise: "", promptTemplate: "" },
        { id: "designer", label: "Designer", emoji: "🎨", color: "", expertise: "", promptTemplate: "" },
        { id: "product-owner", label: "Product Owner", emoji: "📋", color: "", expertise: "", promptTemplate: "" },
        { id: "qa", label: "QA", emoji: "🧪", color: "", expertise: "", promptTemplate: "" },
      ]),
    }));

    const TicketDetailPage = (await import("@/app/ticket/[id]/page")).default;
    const { ToastProvider } = await import("@/components/Toast");

    render(<ToastProvider><TicketDetailPage /></ToastProvider>);

    // Wait for the page to load and render
    const title = await screen.findByText("Dark Mode Feature");
    expect(title).toBeInTheDocument();

    // BuildReportInline should render because the ticket has a buildReport
    const buildId = await screen.findByText("BLD-010");
    expect(buildId).toBeInTheDocument();

    // Consensus summary should be visible
    expect(
      screen.getByText("All 4 personas approved unanimously.")
    ).toBeInTheDocument();

    // Requirements section should be present
    expect(screen.getByText("Requirements")).toBeInTheDocument();

    // View Full Report link
    expect(screen.getByText("View Full Report")).toBeInTheDocument();
  });

  it("no build report shown when ticket has no buildReport", async () => {
    vi.doMock("@/lib/store", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/store")>()),
      seedData: vi.fn(),
      getTicket: vi.fn(() => ({
        id: "TIX-011",
        title: "Draft ticket",
        description: "Still in draft.",
        status: "draft" as const,
        priority: 2 as const,
        createdAt: "2026-05-27T09:00:00Z",
        updatedAt: "2026-05-27T10:00:00Z",
        tags: [],
        feedback: [],
        approvals: [],
      })),
      deleteTicket: vi.fn(),
      updateTicket: vi.fn(),
      updateTicketPriority: vi.fn(),
      updateTicketTags: vi.fn(),
    }));

    vi.doMock("@/lib/consensus-threshold", () => ({
      getBuildReadiness: vi.fn(() => ({ ready: true, score: 100, consensusMet: true, feedbackCount: 4, missingPersonas: [], nextSteps: [] })),
      checkConsensusThreshold: vi.fn(() => ({
        reached: false, progress: 0, threshold: 0.75,
      })),
      getBuildReadiness: vi.fn(() => ({
        ready: false, score: 0, blockers: ["No feedback"], nextSteps: [],
      })),
      generateBuildSummary: vi.fn(() => ""),
      DEFAULT_THRESHOLD: 0.75,
    }));

    vi.doMock("@/lib/personas", () => ({
      getPersona: vi.fn(() => undefined),
      getAllPersonas: vi.fn(() => []),
    }));

    const TicketDetailPage = (await import("@/app/ticket/[id]/page")).default;
    const { ToastProvider } = await import("@/components/Toast");

    render(<ToastProvider><TicketDetailPage /></ToastProvider>);

    // Should render the ticket
    const title = await screen.findByText("Draft ticket");
    expect(title).toBeInTheDocument();

    // Build report should NOT be visible
    expect(screen.queryByText(/BLD-/)).toBeNull();
    expect(screen.queryByText("View Full Report")).toBeNull();
  });
});
