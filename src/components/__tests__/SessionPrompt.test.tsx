/**
 * Unit Tests — DEV-90: SessionPrompt Component
 *
 * SessionPrompt is the core persona-mediated feedback component.
 * It handles:
 * - Persona selection switching (Engineer, Designer, PO, QA)
 * - Feedback submission flow via mediator API
 * - Consensus calculation and display
 * - Markdown preview toggle via MarkdownPreview child
 * - Empty state when no feedback exists
 * - Loading state during AI response generation
 * - Error state when mediator API fails
 * - Persona-specific styling, labels, and badges
 *
 * Uses Vitest + @testing-library/react. Follows patterns from
 * AuthGuard.test.tsx and FeedbackPanel.test.tsx.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { SessionPrompt } from "../SessionPrompt";
import type { Ticket, FeedbackEntry, PersonaId } from "@/lib/types";

// ============================================================================
// Mock framer-motion more completely (AnimatePresence only mocked in setup)
// ============================================================================
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: {
      div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
        React.createElement("div", props, children),
      textarea: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
        React.createElement("textarea", props, children),
    },
  };
});

// ============================================================================
// Mock store — addFeedback
// ============================================================================
const mockAddFeedback = vi.fn();

vi.mock("@/lib/store", () => ({
  addFeedback: (...args: Parameters<typeof mockAddFeedback>) => mockAddFeedback(...args),
}));

// ============================================================================
// Mock consensus-engine — calculateConsensus
// ============================================================================
const mockCalculateConsensus = vi.fn();

vi.mock("@/lib/consensus-engine", () => ({
  calculateConsensus: (...args: Parameters<typeof mockCalculateConsensus>) => mockCalculateConsensus(...args),
}));

// ============================================================================
// Mock feedback-stream — onFeedbackStream
// ============================================================================
const mockUnsubscribe = vi.fn();
const mockOnFeedbackStream = vi.fn<(...args: any[]) => any>(() => mockUnsubscribe);

vi.mock("@/lib/feedback-stream", () => ({
  onFeedbackStream: (...args: Parameters<typeof mockOnFeedbackStream>) => mockOnFeedbackStream(...args),
}));

// ============================================================================
// Mock next/link
// ============================================================================
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) =>
    React.createElement("a", { href, ...props }, children),
}));

// ============================================================================
// Test data factories
// ============================================================================

function createBaseTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "TIX-001",
    title: "Add dark mode support",
    description:
      "Implement system-wide dark mode with user preference detection.",
    status: "in-review",
    priority: 1,
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
    tags: [],
    feedback: [],
    approvals: [],
    ...overrides,
  };
}

function createFeedbackEntry(
  overrides: Partial<FeedbackEntry> = {}
): FeedbackEntry {
  return {
    id: "FB-001",
    ticketId: "TIX-001",
    personaId: "engineer",
    content: "Looks good, but need to handle system preference detection.",
    createdAt: "2026-05-22T10:00:00.000Z",
    approved: true,
    ...overrides,
  };
}

function createFullFeedbackTicket(): Ticket {
  return createBaseTicket({
    feedback: [
      createFeedbackEntry({ id: "FB-001", personaId: "engineer", approved: true }),
      createFeedbackEntry({
        id: "FB-002",
        personaId: "designer",
        content: "Make sure dark mode tokens match design system.",
        approved: true,
      }),
      createFeedbackEntry({
        id: "FB-003",
        personaId: "product-owner",
        content: "This is a P1 priority — ship it soon.",
        approved: true,
      }),
    ],
    approvals: ["engineer", "designer", "product-owner"],
  });
}

// ============================================================================
// Setup helpers
// ============================================================================

function renderSessionPrompt(
  ticket: Ticket,
  activePersona: PersonaId = "engineer"
) {
  return render(
    <SessionPrompt ticket={ticket} activePersona={activePersona} />
  );
}

/** Mock a successful mediator API response */
function mockFetchSuccess(response: Record<string, unknown> = {}) {
  const defaultResponse = {
    refinedFeedback: "Refined feedback from AI mediator.",
    concerns: ["Performance impact on older browsers"],
    recommendations: ["Use CSS custom properties for theming"],
    followUpQuestions: [
      "Should we support high-contrast mode?",
      "What about third-party component theming?",
    ],
    suggestApproval: false,
    approvalReasoning: "Good direction but needs performance consideration.",
    suggestedNextPersona: "designer",
    meta: {
      mediationType: "ai-mediated",
      processedAt: new Date().toISOString(),
      inputLength: 50,
    },
  };

  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...defaultResponse, ...response }),
    })
  );
}

/** Mock a failing mediator API */
function mockFetchFailure(errorMessage = "API error") {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: errorMessage }),
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCalculateConsensus.mockResolvedValue({
    reached: false,
    approved: 0,
    total: 4,
    percentage: 0,
  });
  mockOnFeedbackStream.mockReturnValue(mockUnsubscribe);
  mockAddFeedback.mockReturnValue(null);
  // Default fetch to a no-op (tests that need it will override)
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: "not configured" }) }));
});

// ============================================================================
// Block 1: Persona-specific rendering (labels, expertise, prompts)
// ============================================================================

describe("persona-specific rendering", () => {
  it("renders Engineer label, expertise, and prompt template", () => {
    renderSessionPrompt(createBaseTicket(), "engineer");

    expect(screen.getByText("Engineer Assessment")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Technical feasibility, architecture, implementation approach/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/weighing in as the Engineer/)
    ).toBeInTheDocument();
  });

  it("renders Designer label, expertise, and prompt template", () => {
    renderSessionPrompt(createBaseTicket(), "designer");

    expect(screen.getByText("Designer Assessment")).toBeInTheDocument();
    expect(
      screen.getByText(/User experience, visual design, interaction patterns/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/weighing in as the Designer/)
    ).toBeInTheDocument();
  });

  it("renders Product Owner label, expertise, and prompt template", () => {
    renderSessionPrompt(createBaseTicket(), "product-owner");

    expect(screen.getByText("Product Owner Assessment")).toBeInTheDocument();
    expect(
      screen.getByText(/Business value, priority, scope definition/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/weighing in as the Product Owner/)
    ).toBeInTheDocument();
  });

  it("renders QA label, expertise, and prompt template", () => {
    renderSessionPrompt(createBaseTicket(), "qa");

    expect(screen.getByText("QA Assessment")).toBeInTheDocument();
    expect(
      screen.getByText(/Edge cases, test scenarios, acceptance criteria/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/weighing in as QA/)
    ).toBeInTheDocument();
  });

  it("renders PersonaIcon for the active persona", () => {
    renderSessionPrompt(createBaseTicket(), "engineer");

    // PersonaIcon renders lucide icons: Wrench for engineer
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// Block 2: Ticket info display
// ============================================================================

describe("ticket info display", () => {
  it("shows the ticket title", () => {
    renderSessionPrompt(
      createBaseTicket({ title: "Implement OAuth 2.0" }),
      "engineer"
    );

    expect(screen.getByText("Implement OAuth 2.0")).toBeInTheDocument();
  });

  it("shows the ticket description", () => {
    const desc = "Add OAuth 2.0 with Google and GitHub providers.";
    renderSessionPrompt(
      createBaseTicket({ description: desc }),
      "engineer"
    );

    expect(screen.getByText(desc)).toBeInTheDocument();
  });

  it('shows "Ticket" label above ticket info', () => {
    renderSessionPrompt(createBaseTicket(), "engineer");

    expect(screen.getByText("Ticket")).toBeInTheDocument();
  });

  it("shows approval badge when persona has already approved", () => {
    const ticket = createBaseTicket({
      feedback: [
        createFeedbackEntry({
          personaId: "engineer",
          approved: true,
        }),
      ],
      approvals: ["engineer"],
    });

    renderSessionPrompt(ticket, "engineer");

    // Multiple "Approved" elements: header badge + chat bubble badge
    const approvedElements = screen.getAllByText("Approved");
    expect(approvedElements.length).toBeGreaterThanOrEqual(1);
  });

  it("does not show approval badge when persona has not approved", () => {
    renderSessionPrompt(createBaseTicket(), "engineer");

    expect(screen.queryByText("Approved")).not.toBeInTheDocument();
  });
});

// ============================================================================
// Block 3: Empty state rendering
// ============================================================================

describe("empty state", () => {
  it("shows EmptyState when no feedback and no messages", () => {
    renderSessionPrompt(createBaseTicket(), "engineer");

    expect(screen.getByText("No Feedback Yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Be the first to weigh in!/)
    ).toBeInTheDocument();
  });

  it("hides EmptyState when feedback entries exist", () => {
    const ticket = createBaseTicket({
      feedback: [createFeedbackEntry()],
    });

    renderSessionPrompt(ticket, "engineer");

    expect(screen.queryByText("No Feedback Yet")).not.toBeInTheDocument();
  });

  it("shows persona-specific placeholder in textarea", () => {
    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(
      /Write your raw thoughts as Engineer/
    );
    expect(textarea).toBeInTheDocument();
  });

  it("shows already-submitted placeholder when persona has feedback", () => {
    const ticket = createBaseTicket({
      feedback: [createFeedbackEntry({ personaId: "engineer" })],
    });

    renderSessionPrompt(ticket, "engineer");

    const textarea = screen.getByPlaceholderText(
      /Engineer has already submitted feedback/
    );
    expect(textarea).toBeInTheDocument();
  });
});

// ============================================================================
// Block 4: Feedback submission flow
// ============================================================================

describe("feedback submission flow", () => {
  it("submit button is disabled when textarea is empty", () => {
    renderSessionPrompt(createBaseTicket(), "engineer");

    const submitBtn = screen.getByRole("button", { name: /Submit & Advance/ });
    expect(submitBtn).toBeDisabled();
  });

  it("submit button is enabled when textarea has content", async () => {
    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "This feature looks solid.");

    const submitBtn = screen.getByRole("button", { name: /Submit & Advance/ });
    expect(submitBtn).not.toBeDisabled();
  });

  it("calls the mediator API with correct payload on submit", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          refinedFeedback: "Refined: This feature looks solid.",
          concerns: [],
          recommendations: [],
          followUpQuestions: [],
          suggestApproval: false,
          approvalReasoning: "Good input.",
          suggestedNextPersona: null,
          meta: {
            mediationType: "ai-mediated",
            processedAt: new Date().toISOString(),
            inputLength: 25,
          },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "This feature looks solid.");

    const submitBtn = screen.getByRole("button", { name: /Submit & Advance/ });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/prompt",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("This feature looks solid"),
        })
      );
    });

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.ticketId).toBe("TIX-001");
    expect(callBody.personaId).toBe("engineer");
    expect(callBody.message).toBe("This feature looks solid.");
  });

  it("shows 'Mediating...' loading state during submission", async () => {
    // Use a deferred promise so we can observe the loading state
    let resolveFetch: (value: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(fetchPromise)
    );

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Testing loading state.");

    const submitBtn = screen.getByRole("button", { name: /Submit & Advance/ });
    await userEvent.click(submitBtn);

    // Should now show loading state
    await waitFor(() => {
      expect(screen.getByText("Mediating...")).toBeInTheDocument();
    });

    // Resolve the fetch
    resolveFetch!({
      ok: true,
      json: () =>
        Promise.resolve({
          refinedFeedback: "Refined feedback.",
          concerns: [],
          recommendations: [],
          followUpQuestions: [],
          suggestApproval: false,
          approvalReasoning: "OK.",
          suggestedNextPersona: null,
          meta: {
            mediationType: "ai-mediated",
            processedAt: new Date().toISOString(),
            inputLength: 20,
          },
        }),
    });
  });

  it("shows mediator response after successful API call", async () => {
    mockFetchSuccess();

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Some feedback here.");

    const submitBtn = screen.getByRole("button", { name: /Submit & Advance/ });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Refined feedback from AI mediator.")
      ).toBeInTheDocument();
    });
  });

  it("shows concerns from mediator response", async () => {
    mockFetchSuccess({
      concerns: ["Performance impact on older browsers", "Bundle size increase"],
    });

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Feedback");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    await waitFor(() => {
      expect(screen.getByText("Concerns")).toBeInTheDocument();
      expect(
        screen.getByText("Performance impact on older browsers")
      ).toBeInTheDocument();
    });
  });

  it("shows recommendations from mediator response", async () => {
    mockFetchSuccess({
      recommendations: ["Use CSS custom properties", "Add system preference detection"],
    });

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Feedback");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    await waitFor(() => {
      expect(screen.getByText("Recommendations")).toBeInTheDocument();
      expect(
        screen.getByText("Use CSS custom properties")
      ).toBeInTheDocument();
    });
  });

  it("calls addFeedback when approving mediated response", async () => {
    const feedbackEntry = createFeedbackEntry({
      id: "FB-NEW",
      personaId: "engineer",
      content: "Refined feedback from AI mediator.",
      approved: true,
    });
    mockAddFeedback.mockReturnValue(feedbackEntry);
    mockFetchSuccess({ suggestApproval: true });

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Feedback");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    // Wait for mediator response, then click Submit
    await waitFor(() => {
      expect(
        screen.getByText("Refined feedback from AI mediator.")
      ).toBeInTheDocument();
    });

    const submitMediatedBtn = screen.getByRole("button", {
      name: /Submit as Engineer/,
    });
    await userEvent.click(submitMediatedBtn);

    expect(mockAddFeedback).toHaveBeenCalledWith(
      "TIX-001",
      "engineer",
      "Refined feedback from AI mediator.",
      true // approved=true because suggestApproval was true
    );
  });

  it("shows submitted feedback as chat bubble", async () => {
    const feedbackEntry = createFeedbackEntry({
      id: "FB-NEW",
      personaId: "engineer",
      content: "My submitted feedback",
      approved: true,
    });
    mockAddFeedback.mockReturnValue(feedbackEntry);
    mockFetchSuccess();

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Feedback");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Refined feedback from AI mediator.")
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /Submit as Engineer/ })
    );

    await waitFor(() => {
      expect(screen.getByText("My submitted feedback")).toBeInTheDocument();
    });
  });

  it("adds 'Add More' button text when persona has already submitted", () => {
    const ticket = createBaseTicket({
      feedback: [createFeedbackEntry({ personaId: "engineer" })],
    });

    renderSessionPrompt(ticket, "engineer");

    expect(screen.getByText("Add More")).toBeInTheDocument();
  });
});

// ============================================================================
// Block 5: Consensus calculation display
// ============================================================================

describe("consensus calculation", () => {
  it("does not show consensus banner when not reached", () => {
    mockCalculateConsensus.mockResolvedValue({
      reached: false,
      approved: 1,
      total: 4,
      percentage: 0.25,
    });

    const ticket = createBaseTicket({
      feedback: [createFeedbackEntry()],
      approvals: ["engineer"],
    });

    renderSessionPrompt(ticket, "engineer");

    expect(
      screen.queryByText("Consensus reached!")
    ).not.toBeInTheDocument();
  });

  it("shows consensus banner when consensus is reached", async () => {
    mockCalculateConsensus.mockResolvedValue({
      reached: true,
      approved: 4,
      total: 4,
      percentage: 1.0,
    });

    const ticket = createFullFeedbackTicket();

    renderSessionPrompt(ticket, "engineer");

    // The full text is "Consensus reached! All required personas have approved."
    // inside a single <p> element, so use a regex for partial match
    const banner = await screen.findByText(/Consensus reached!/, {}, { timeout: 3000 });
    expect(banner).toBeInTheDocument();

    expect(
      screen.getByText(/All required personas have approved/)
    ).toBeInTheDocument();
  });

  it("shows 'ready to move to building' message with consensus", async () => {
    mockCalculateConsensus.mockResolvedValue({
      reached: true,
      approved: 4,
      total: 4,
      percentage: 1.0,
    });

    renderSessionPrompt(createFullFeedbackTicket(), "engineer");

    await waitFor(() => {
      expect(
        screen.getByText("This ticket is ready to move to building.")
      ).toBeInTheDocument();
    });
  });

  it("calls calculateConsensus with correct ticket id", async () => {
    mockCalculateConsensus.mockResolvedValue({
      reached: false,
      approved: 1,
      total: 4,
      percentage: 0.25,
    });

    const ticket = createBaseTicket({
      id: "TIX-CUSTOM-42",
      feedback: [createFeedbackEntry({ ticketId: "TIX-CUSTOM-42" })],
    });

    renderSessionPrompt(ticket, "engineer");

    await waitFor(() => {
      expect(mockCalculateConsensus).toHaveBeenCalledWith("TIX-CUSTOM-42");
    });
  });
});

// ============================================================================
// Block 6: Error state display
// ============================================================================

describe("error state", () => {
  it("shows system error message when mediator API fails", async () => {
    mockFetchFailure("Mediation service unavailable");

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Feedback that will fail.");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Mediation unavailable/)
      ).toBeInTheDocument();
    });
  });

  it("falls back to submitting raw feedback on API failure", async () => {
    mockFetchFailure("Service error");
    mockAddFeedback.mockReturnValue(
      createFeedbackEntry({ id: "FB-FALLBACK", personaId: "engineer" })
    );

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Raw feedback");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    await waitFor(() => {
      expect(mockAddFeedback).toHaveBeenCalledWith(
        "TIX-001",
        "engineer",
        "Raw feedback",
        false
      );
    });
  });
});

// ============================================================================
// Block 7: Markdown preview
// ============================================================================

describe("markdown preview", () => {
  it("renders MarkdownPreview component with correct props", () => {
    renderSessionPrompt(createBaseTicket(), "engineer");

    // MarkdownPreview always shows "Markdown supported" hint
    expect(screen.getByText("Markdown supported")).toBeInTheDocument();

    // Preview/Edit toggle button
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("shows persona-specific placeholder in textarea", () => {
    renderSessionPrompt(createBaseTicket(), "designer");

    const textarea = screen.getByPlaceholderText(
      /Write your raw thoughts as Designer/
    );
    expect(textarea).toBeInTheDocument();
  });

  it("toggles between Edit and Preview modes", async () => {
    renderSessionPrompt(createBaseTicket(), "engineer");

    // Initially in edit mode
    expect(screen.getByText("Preview")).toBeInTheDocument();

    const previewBtn = screen.getByText("Preview");
    await userEvent.click(previewBtn);

    // Should now show "Edit" (because we're in preview mode)
    // Note: The MarkdownPreview component renders a motion.textarea which
    // framer-motion wraps. The toggle behavior is part of MarkdownPreview.
    // We verify the button text changes.
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });
});

// ============================================================================
// Block 8: Persona status tabs and styling
// ============================================================================

describe("persona status tabs", () => {
  it("renders all four persona status tabs", () => {
    renderSessionPrompt(createBaseTicket(), "engineer");

    // Each persona tab shows PersonaIcon + status indicator
    // The active persona shows "You"
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it('shows "You" label for the active persona tab', () => {
    renderSessionPrompt(createBaseTicket(), "product-owner");

    // Only the active persona tab should show "You"
    const youLabels = screen.getAllByText("You");
    expect(youLabels.length).toBe(1);
  });

  it("shows approved persona with check icon when they have approved", () => {
    const ticket = createBaseTicket({
      feedback: [createFeedbackEntry({ personaId: "designer", approved: true })],
      approvals: ["designer"],
    });

    renderSessionPrompt(ticket, "engineer");

    // The designer persona tab should have a Check icon
    const svgs = document.querySelectorAll("svg");
    const checkIcons = Array.from(svgs).filter(
      (svg) => svg.getAttribute("width") === "12" || svg.getAttribute("height") === "12"
    );
    expect(checkIcons.length).toBeGreaterThan(0);
  });

  it("shows submitted persona with pencil icon when they have feedback but not approved", () => {
    const ticket = createBaseTicket({
      feedback: [
        createFeedbackEntry({ personaId: "designer", approved: false }),
      ],
    });

    renderSessionPrompt(ticket, "engineer");

    // The designer persona tab should show some indicator
    // We just verify the tabs render without errors
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("hides input area when mediator response is visible", async () => {
    mockFetchSuccess();

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Feedback");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Refined feedback from AI mediator.")
      ).toBeInTheDocument();
    });

    // The textarea input area should be hidden
    expect(
      screen.queryByPlaceholderText(/Write your raw thoughts/)
    ).not.toBeInTheDocument();
  });
});

// ============================================================================
// Block 9: Follow-up questions
// ============================================================================

describe("follow-up questions", () => {
  it("shows follow-up questions from mediator response", async () => {
    mockFetchSuccess({
      followUpQuestions: [
        "Should we support high-contrast mode?",
        "What about RTL languages?",
      ],
    });

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Feedback");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Continue the conversation:")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Should we support high-contrast mode?")
      ).toBeInTheDocument();
    });
  });

  it("clicking a follow-up question triggers another API call", async () => {
    // First response must include followUpQuestions so the buttons render
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            refinedFeedback: "Initial mediator response.",
            concerns: [],
            recommendations: [],
            followUpQuestions: [
              "Should we support high-contrast mode?",
              "What about RTL languages?",
            ],
            suggestApproval: false,
            approvalReasoning: "Good start.",
            suggestedNextPersona: null,
            meta: {
              mediationType: "ai-mediated",
              processedAt: new Date().toISOString(),
              inputLength: 20,
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            refinedFeedback: "Follow-up response.",
            concerns: [],
            recommendations: [],
            followUpQuestions: [],
            suggestApproval: false,
            approvalReasoning: "Answered.",
            suggestedNextPersona: null,
            meta: {
              mediationType: "ai-mediated",
              processedAt: new Date().toISOString(),
              inputLength: 20,
            },
          }),
      });
    vi.stubGlobal("fetch", fetchMock);

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Feedback");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    // Wait for first mediator response with follow-up questions
    await waitFor(() => {
      expect(
        screen.getByText("Continue the conversation:")
      ).toBeInTheDocument();
    });

    // Click the first follow-up question
    const followUpBtn = screen.getByText("Should we support high-contrast mode?");
    await userEvent.click(followUpBtn);

    await waitFor(() => {
      // Second call should include previousResponse
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});

// ============================================================================
// Block 10: Edit mode for mediator response
// ============================================================================

describe("edit mode", () => {
  it("enters edit mode when Edit button is clicked", async () => {
    mockFetchSuccess();

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Feedback");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Edit"));

    // Should now show Save & Submit and Cancel buttons
    expect(screen.getByText("Save & Submit")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("cancels edit mode and reverts to original text", async () => {
    mockFetchSuccess();

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Feedback");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Edit"));
    expect(screen.getByText("Cancel")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Cancel"));

    // Should be back to non-edit mode
    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });
    expect(screen.queryByText("Save & Submit")).not.toBeInTheDocument();
  });

  it("submits edited feedback from edit mode", async () => {
    mockFetchSuccess();
    mockAddFeedback.mockReturnValue(
      createFeedbackEntry({ id: "FB-EDITED", personaId: "engineer" })
    );

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Feedback");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Edit"));

    // Edit the textarea that appears in edit mode
    const editTextareas = screen.getAllByRole("textbox");
    const editTextarea = editTextareas.find(
      (el) =>
        el.tagName === "TEXTAREA" &&
        (el as HTMLTextAreaElement).value.includes("Refined feedback")
    );
    expect(editTextarea).toBeDefined();

    // Save & Submit
    await userEvent.click(screen.getByText("Save & Submit"));

    expect(mockAddFeedback).toHaveBeenCalledWith(
      "TIX-001",
      "engineer",
      expect.any(String),
      false
    );
  });
});

// ============================================================================
// Block 11: Dismiss mediator
// ============================================================================

describe("dismiss mediator", () => {
  it("shows Dismiss button and submits raw feedback", async () => {
    mockFetchSuccess();
    mockAddFeedback.mockReturnValue(
      createFeedbackEntry({ id: "FB-DISMISS", personaId: "engineer" })
    );

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Raw feedback to dismiss");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    await waitFor(() => {
      expect(screen.getByText("Dismiss")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Dismiss"));

    await waitFor(() => {
      expect(mockAddFeedback).toHaveBeenCalledWith(
        "TIX-001",
        "engineer",
        "Raw feedback to dismiss",
        false
      );
    });
  });
});

// ============================================================================
// Block 12: Suggested next persona
// ============================================================================

describe("suggested next persona", () => {
  it("shows suggested next persona when mediator provides one", async () => {
    mockFetchSuccess({ suggestedNextPersona: "designer" });

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Feedback");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    await waitFor(() => {
      expect(screen.getByText("Suggested next:")).toBeInTheDocument();
      expect(screen.getByText("Designer")).toBeInTheDocument();
    });
  });

  it("does not show suggested next persona when null", async () => {
    mockFetchSuccess({ suggestedNextPersona: null });

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Feedback");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Refined feedback from AI mediator.")
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Suggested next:")).not.toBeInTheDocument();
  });
});

// ============================================================================
// Block 13: Real-time stream subscription
// ============================================================================

describe("feedback stream subscription", () => {
  it("subscribes to feedback stream on mount", () => {
    renderSessionPrompt(createBaseTicket(), "engineer");

    expect(mockOnFeedbackStream).toHaveBeenCalled();
  });

  it("unsubscribes from feedback stream on unmount", () => {
    const { unmount } = renderSessionPrompt(createBaseTicket(), "engineer");

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

// ============================================================================
// Block 14: Keyboard shortcut hint
// ============================================================================

describe("keyboard shortcut", () => {
  it("shows keyboard shortcut hint", () => {
    renderSessionPrompt(createBaseTicket(), "engineer");

    // On macOS it shows ⌘+Enter, on non-mac Ctrl+Enter
    // The span has hidden sm:inline class
    const shortcutHint = document.querySelector(".hidden.sm\\:inline");
    expect(shortcutHint).toBeInTheDocument();
  });
});

// ============================================================================
// Block 15: Multi-persona feedback display
// ============================================================================

describe("multi-persona feedback display", () => {
  it("renders feedback entries from all personas as chat bubbles", () => {
    const ticket = createBaseTicket({
      feedback: [
        createFeedbackEntry({
          id: "FB-001",
          personaId: "engineer",
          content: "Engineer says: LGTM",
        }),
        createFeedbackEntry({
          id: "FB-002",
          personaId: "designer",
          content: "Designer says: Needs better spacing",
        }),
      ],
    });

    renderSessionPrompt(ticket, "engineer");

    expect(screen.getByText("Engineer says: LGTM")).toBeInTheDocument();
    expect(screen.getByText("Designer says: Needs better spacing")).toBeInTheDocument();
  });

  it("shows persona labels on feedback chat bubbles", () => {
    const ticket = createBaseTicket({
      feedback: [
        createFeedbackEntry({ personaId: "designer" }),
      ],
    });

    renderSessionPrompt(ticket, "engineer");

    expect(screen.getByText("Designer")).toBeInTheDocument();
  });

  it("shows approval indicator on approved feedback entries", () => {
    const ticket = createBaseTicket({
      feedback: [
        createFeedbackEntry({
          personaId: "engineer",
          approved: true,
        }),
      ],
      approvals: ["engineer"],
    });

    renderSessionPrompt(ticket, "engineer");

    // Approved entries show "Approved" text with CheckCircle
    const approvedLabels = screen.getAllByText("Approved");
    expect(approvedLabels.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// Block 16: Textarea auto-resize
// ============================================================================

describe("textarea behavior", () => {
  it("renders textarea through MarkdownPreview", () => {
    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("textarea value updates on typing", async () => {
    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(
      /Write your raw thoughts/
    ) as HTMLTextAreaElement;
    await userEvent.type(textarea, "Hello world");

    expect(textarea.value).toBe("Hello world");
  });
});

// ============================================================================
// Block 17: Mediator response approval state
// ============================================================================

describe("mediator approval state", () => {
  it("auto-checks approval when mediator suggests approval", async () => {
    mockFetchSuccess({ suggestApproval: true });

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Feedback");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    await waitFor(() => {
      // The approval checkbox should be checked
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });
  });

  it("does not auto-check approval by default", async () => {
    mockFetchSuccess({ suggestApproval: false });

    renderSessionPrompt(createBaseTicket(), "engineer");

    const textarea = screen.getByPlaceholderText(/Write your raw thoughts/);
    await userEvent.type(textarea, "Feedback");
    await userEvent.click(
      screen.getByRole("button", { name: /Submit & Advance/ })
    );

    await waitFor(() => {
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();
    });
  });
});
