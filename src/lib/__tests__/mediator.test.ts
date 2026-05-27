import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock factories using vi.hoisted (hoisted before module evaluation)
const { mockGetTicket, mockGetFeedbackHistory, mockCallDeepSeek, mockGetAllPersonas, mockGetPersona, mockCheckConsensusThreshold } = vi.hoisted(() => ({
  mockGetTicket: vi.fn(),
  mockGetFeedbackHistory: vi.fn(),
  mockCallDeepSeek: vi.fn(),
  mockGetAllPersonas: vi.fn(),
  mockGetPersona: vi.fn(),
  mockCheckConsensusThreshold: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
  getTicket: mockGetTicket,
  getFeedbackHistory: mockGetFeedbackHistory,
}));

vi.mock("@/lib/llm", () => ({
  callDeepSeek: mockCallDeepSeek,
}));

vi.mock("@/lib/personas", () => ({
  getAllPersonas: mockGetAllPersonas,
  getPersona: mockGetPersona,
}));

vi.mock("@/lib/consensus-threshold", () => ({
  checkConsensusThreshold: mockCheckConsensusThreshold,
}));

import { mediate, continueMediation } from "../mediator";
import type { Ticket, FeedbackEntry, Persona } from "../types";

// --- Helpers ---

const allPersonas: Persona[] = [
  { id: "engineer", label: "Engineer", emoji: "⚙️", expertise: "Engineering", color: "bg-blue-600", promptTemplate: "Engineer prompt" },
  { id: "designer", label: "Designer", emoji: "🎨", expertise: "Design", color: "bg-purple-600", promptTemplate: "Designer prompt" },
  { id: "product-owner", label: "Product Owner", emoji: "📋", expertise: "Product", color: "bg-emerald-600", promptTemplate: "PO prompt" },
  { id: "qa", label: "QA", emoji: "🧪", expertise: "Quality", color: "bg-amber-600", promptTemplate: "QA prompt" },
];

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "TIX-001",
    title: "Test feature ticket",
    description: "A ticket for testing the mediator engine",
    status: "in-review",
    priority: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    dueDate: undefined,
    feedback: [],
    approvals: [],
    tags: [],
    ...overrides,
  };
}

function makeLLMResponse(overrides: Record<string, unknown> = {}) {
  return {
    content: JSON.stringify({
      refinedFeedback: "This feature looks technically feasible.",
      concerns: ["Potential complexity in the state management layer"],
      recommendations: ["Start with a prototype"],
      followUpQuestions: ["What is the expected user load?"],
      suggestApproval: true,
      approvalReasoning: "Well-considered proposal with clear scope.",
      ...overrides,
    }),
    usage: { totalTokens: 350, promptTokens: 200, completionTokens: 150 },
  };
}

describe("mediate()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllPersonas.mockReturnValue(allPersonas);
    mockGetPersona.mockImplementation((id: string) =>
      allPersonas.find((p) => p.id === id) ?? null
    );
    mockCheckConsensusThreshold.mockReturnValue({ reached: false, approved: 0, total: 4, threshold: 0.75 });
    mockGetFeedbackHistory.mockReturnValue([]);
  });

  it("returns null for a nonexistent ticket ID", async () => {
    mockGetTicket.mockReturnValue(null);

    const result = await mediate("TIX-NONEXISTENT", "engineer", "Test message");
    expect(result).toBeNull();
  });

  it("returns a structured response for a valid ticket and persona", async () => {
    const ticket = makeTicket();
    mockGetTicket.mockReturnValue(ticket);
    mockCallDeepSeek.mockResolvedValue(makeLLMResponse());

    const result = await mediate("TIX-001", "engineer", "We should add dark mode");

    expect(result).not.toBeNull();
    expect(result!.response.refinedFeedback).toBe("This feature looks technically feasible.");
    expect(Array.isArray(result!.response.concerns)).toBe(true);
    expect(Array.isArray(result!.response.recommendations)).toBe(true);
    expect(Array.isArray(result!.response.followUpQuestions)).toBe(true);
    expect(typeof result!.response.suggestApproval).toBe("boolean");
    expect(typeof result!.response.approvalReasoning).toBe("string");
    expect(result!.response.meta.mediationType).toBe("ai");
    expect(result!.response.meta.model).toBe("deepseek-v4-flash");
    expect(typeof result!.response.meta.processedAt).toBe("string");
    expect(result!.response.meta.inputLength).toBe("We should add dark mode".length);
  });

  it("includes context with ticket details", async () => {
    const ticket = makeTicket();
    mockGetTicket.mockReturnValue(ticket);
    mockGetFeedbackHistory.mockReturnValue([
      { id: "FB-001", ticketId: "TIX-001", personaId: "designer", content: "Looks good", createdAt: "2026-01-01T00:00:00.000Z", approved: true },
    ]);
    mockCallDeepSeek.mockResolvedValue(makeLLMResponse());

    const result = await mediate("TIX-001", "engineer", "Test message");

    expect(result).not.toBeNull();
    expect(result!.context.ticketId).toBe("TIX-001");
    expect(result!.context.personaId).toBe("engineer");
    expect(result!.context.sessionHistory).toHaveLength(1);
    expect(result!.context.consensusReached).toBe(false);
  });

  it("handles LLM response with malformed JSON gracefully", async () => {
    const ticket = makeTicket();
    mockGetTicket.mockReturnValue(ticket);
    mockCallDeepSeek.mockResolvedValue({
      content: "Some raw text that is not valid JSON",
      usage: { totalTokens: 50, promptTokens: 30, completionTokens: 20 },
    });

    const result = await mediate("TIX-001", "engineer", "Test message");

    expect(result).not.toBeNull();
    expect(result!.response.refinedFeedback).toBeTruthy();
    expect(result!.response.concerns).toContain(
      "Could not parse structured response — see feedback for details."
    );
    expect(result!.response.suggestApproval).toBe(false);
  });

  it("extracts JSON from markdown code fences when top-level parse fails", async () => {
    const ticket = makeTicket();
    mockGetTicket.mockReturnValue(ticket);
    mockCallDeepSeek.mockResolvedValue({
      content: 'Here is my analysis:\n```json\n{"refinedFeedback":"From code fence","concerns":[],"recommendations":[],"followUpQuestions":[],"suggestApproval":true,"approvalReasoning":"Looks good"}\n```',
      usage: { totalTokens: 100, promptTokens: 60, completionTokens: 40 },
    });

    const result = await mediate("TIX-001", "engineer", "Test");

    expect(result).not.toBeNull();
    expect(result!.response.refinedFeedback).toBe("From code fence");
    expect(result!.response.suggestApproval).toBe(true);
  });

  it("passes the correct system prompt to callDeepSeek", async () => {
    const ticket = makeTicket();
    mockGetTicket.mockReturnValue(ticket);
    mockCallDeepSeek.mockResolvedValue(makeLLMResponse());

    await mediate("TIX-001", "engineer", "Add dark mode support");

    expect(mockCallDeepSeek).toHaveBeenCalledTimes(1);
    const callArgs = mockCallDeepSeek.mock.calls[0][0];
    expect(callArgs.systemPrompt).toContain("Engineer");
    expect(callArgs.systemPrompt).toContain("⚙️");
    expect(callArgs.expectJson).toBe(true);
  });

  it("suggests next persona based on who hasn't provided feedback", async () => {
    const ticket = makeTicket();
    mockGetTicket.mockReturnValue(ticket);
    mockGetFeedbackHistory.mockReturnValue([
      { id: "FB-001", ticketId: "TIX-001", personaId: "engineer", content: "Looks good", createdAt: "2026-01-01T00:00:00.000Z", approved: true },
    ]);
    mockCallDeepSeek.mockResolvedValue(makeLLMResponse());

    const result = await mediate("TIX-001", "designer", "Test message");

    expect(result).not.toBeNull();
    expect(result!.response.suggestedNextPersona).toBe("product-owner");
  });

  it("suggests unapproved persona when all have provided feedback", async () => {
    const ticket = makeTicket({
      approvals: ["engineer", "designer", "product-owner"],
    });
    mockGetTicket.mockReturnValue(ticket);
    mockGetFeedbackHistory.mockReturnValue([
      { id: "FB-001", ticketId: "TIX-001", personaId: "engineer", content: "OK", createdAt: "2026-01-01T00:00:00.000Z", approved: true },
      { id: "FB-002", ticketId: "TIX-001", personaId: "designer", content: "OK", createdAt: "2026-01-01T00:00:00.000Z", approved: true },
      { id: "FB-003", ticketId: "TIX-001", personaId: "product-owner", content: "OK", createdAt: "2026-01-01T00:00:00.000Z", approved: true },
      { id: "FB-004", ticketId: "TIX-001", personaId: "qa", content: "OK", createdAt: "2026-01-01T00:00:00.000Z", approved: true },
    ]);
    mockCallDeepSeek.mockResolvedValue(makeLLMResponse());

    const result = await mediate("TIX-001", "engineer", "Test");

    expect(result).not.toBeNull();
    expect(result!.response.suggestedNextPersona).toBe("qa");
  });

  it("returns null for suggestedNextPersona when all personas have approved", async () => {
    const ticket = makeTicket({
      approvals: ["engineer", "designer", "product-owner", "qa"],
    });
    mockGetTicket.mockReturnValue(ticket);
    mockGetFeedbackHistory.mockReturnValue(
      allPersonas.map((p) => ({
        id: `FB-${p.id}`,
        ticketId: "TIX-001",
        personaId: p.id,
        content: "Approved",
        createdAt: "2026-01-01T00:00:00.000Z",
        approved: true,
      }))
    );
    mockCallDeepSeek.mockResolvedValue(makeLLMResponse());

    const result = await mediate("TIX-001", "engineer", "Test");

    expect(result).not.toBeNull();
    expect(result!.response.suggestedNextPersona).toBeNull();
  });

  it("handles empty arrays gracefully in LLM response", async () => {
    const ticket = makeTicket();
    mockGetTicket.mockReturnValue(ticket);
    mockCallDeepSeek.mockResolvedValue(
      makeLLMResponse({
        concerns: [],
        recommendations: [],
        followUpQuestions: [],
      })
    );

    const result = await mediate("TIX-001", "engineer", "Test");

    expect(result).not.toBeNull();
    expect(result!.response.concerns).toEqual([]);
    expect(result!.response.recommendations).toEqual([]);
    expect(result!.response.followUpQuestions).toEqual([]);
  });
});

describe("continueMediation()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllPersonas.mockReturnValue(allPersonas);
    mockGetPersona.mockImplementation((id: string) =>
      allPersonas.find((p) => p.id === id) ?? null
    );
    mockCheckConsensusThreshold.mockReturnValue({ reached: false, approved: 0, total: 4, threshold: 0.75 });
    mockGetFeedbackHistory.mockReturnValue([]);
  });

  it("returns null for nonexistent ticket", async () => {
    mockGetTicket.mockReturnValue(null);

    const result = await continueMediation(
      "TIX-NONEXISTENT",
      "engineer",
      "Follow up message",
      {} as any
    );
    expect(result).toBeNull();
  });

  it("returns structured response for continuation", async () => {
    const ticket = makeTicket();
    mockGetTicket.mockReturnValue(ticket);
    mockCallDeepSeek.mockResolvedValue(makeLLMResponse());

    const previousResponse = {
      refinedFeedback: "Initial analysis",
      concerns: ["Complexity"],
      recommendations: ["Prototype first"],
      followUpQuestions: ["What load?"],
      suggestApproval: false,
      approvalReasoning: "Need more info",
      suggestedNextPersona: null,
      meta: {
        mediationType: "ai" as const,
        processedAt: "2026-01-01T00:00:00.000Z",
        inputLength: 10,
        model: "deepseek-v4-flash",
        tokensUsed: 200,
      },
    };

    const result = await continueMediation(
      "TIX-001",
      "engineer",
      "Let me address those concerns",
      previousResponse
    );

    expect(result).not.toBeNull();
    expect(result!.response.refinedFeedback).toBe("This feature looks technically feasible.");

    expect(mockCallDeepSeek).toHaveBeenCalledTimes(1);
    const callArgs = mockCallDeepSeek.mock.calls[0][0];
    expect(callArgs.userPrompt).toContain("Previous Mediation Round");
    expect(callArgs.userPrompt).toContain("User Follow-up");
    expect(callArgs.userPrompt).toContain("Let me address those concerns");
  });
});

describe("LLM error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllPersonas.mockReturnValue(allPersonas);
    mockGetPersona.mockImplementation((id: string) =>
      allPersonas.find((p) => p.id === id) ?? null
    );
    mockCheckConsensusThreshold.mockReturnValue({ reached: false, approved: 0, total: 4, threshold: 0.75 });
    mockGetFeedbackHistory.mockReturnValue([]);
    mockGetTicket.mockReturnValue(makeTicket());
  });

  it("recovers gracefully when LLM returns JSON in plain code fences (no language)", async () => {
    mockCallDeepSeek.mockResolvedValue({
      content: "```\n{\"refinedFeedback\":\"Works with triple backticks\",\"concerns\":[],\"recommendations\":[],\"followUpQuestions\":[],\"suggestApproval\":true,\"approvalReasoning\":\"OK\"}\n```",
      usage: { totalTokens: 80, promptTokens: 50, completionTokens: 30 },
    });

    const result = await mediate("TIX-001", "engineer", "Test");
    expect(result!.response.refinedFeedback).toBe("Works with triple backticks");
    expect(result!.response.suggestApproval).toBe(true);
  });

  it("recovers gracefully when LLM returns incomplete JSON", async () => {
    mockCallDeepSeek.mockResolvedValue({
      content: JSON.stringify({
        refinedFeedback: "Partial response",
      }),
      usage: { totalTokens: 60, promptTokens: 40, completionTokens: 20 },
    });

    const result = await mediate("TIX-001", "engineer", "Test");
    expect(result!.response.refinedFeedback).toBe("Partial response");
    expect(result!.response.concerns).toEqual([]);
    expect(result!.response.recommendations).toEqual([]);
    expect(result!.response.followUpQuestions).toEqual([]);
    expect(result!.response.suggestApproval).toBe(false);
  });

  it("includes token usage metadata", async () => {
    mockCallDeepSeek.mockResolvedValue(makeLLMResponse());

    const result = await mediate("TIX-001", "engineer", "Test message");
    expect(result!.response.meta.tokensUsed).toBe(350);
    expect(result!.response.meta.inputLength).toBe("Test message".length);
  });
});
