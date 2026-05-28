import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BuildReportInline } from "../BuildReportInline";
import { Ticket, BuildReport } from "@/lib/types";

// Mock next/navigation Link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className} data-testid="link">
      {children}
    </a>
  ),
}));

// Mock store — must not reference outer variables (vi.mock factory is hoisted)
vi.mock("@/lib/store", () => ({
  seedData: vi.fn(),
  getTicket: vi.fn(),
}));

// Import after mock so we can reference the mocked versions
import { seedData, getTicket } from "@/lib/store";

// Create a minimal build report factory for tests
function createBuildReport(
  overrides: Partial<BuildReport> = {}
): BuildReport {
  return {
    id: "BLD-001",
    ticketId: "TIX-001",
    createdAt: "2026-05-27T10:00:00Z",
    status: "completed",
    requirements: ["Add dark mode toggle", "Persist preference in localStorage"],
    designDecisions: ["Use cool gray palette", "Sun/moon icon toggle"],
    qaCriteria: ["Works in all themes", "Accessible via keyboard"],
    implementationPlan: "## Steps\n\n1. Add toggle component\n2. Wire up theme context\n3. Test across browsers",
    consensusSummary: "All 4 personas approved. Ready to build.",
    ...overrides,
  };
}

function createTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "TIX-001",
    title: "Dark mode toggle",
    description: "Add a dark mode toggle to settings.",
    status: "done",
    priority: 1,
    createdAt: "2026-05-27T09:00:00Z",
    updatedAt: "2026-05-27T10:00:00Z",
    dueDate: undefined,
    tags: [],
    feedback: [],
    approvals: ["engineer", "designer", "qa", "product-owner"],
    buildReport: createBuildReport(),
    ...overrides,
  };
}

describe("BuildReportInline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // Status badges
  // ==========================================================================

  describe("status badges", () => {
    it("renders completed badge for completed report", () => {
      const ticket = createTicket({
        buildReport: createBuildReport({ status: "completed" }),
      });
      render(<BuildReportInline ticket={ticket} />);
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    it("renders building badge with spinner for building report", () => {
      const ticket = createTicket({
        buildReport: createBuildReport({ status: "building" }),
      });
      render(<BuildReportInline ticket={ticket} />);
      expect(screen.getByText("Building")).toBeInTheDocument();
    });

    it("renders failed badge for failed report", () => {
      const ticket = createTicket({
        buildReport: createBuildReport({ status: "failed" }),
      });
      render(<BuildReportInline ticket={ticket} />);
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    it("shows build report ID", () => {
      const ticket = createTicket({
        buildReport: createBuildReport({ id: "BLD-042" }),
      });
      render(<BuildReportInline ticket={ticket} />);
      expect(screen.getByText("BLD-042")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Consensus summary
  // ==========================================================================

  describe("consensus summary", () => {
    it("renders consensus summary text", () => {
      const ticket = createTicket({
        buildReport: createBuildReport({
          consensusSummary: "All personas approved unanimously.",
        }),
      });
      render(<BuildReportInline ticket={ticket} />);
      expect(
        screen.getByText("All personas approved unanimously.")
      ).toBeInTheDocument();
    });

    it("renders consensus summary heading", () => {
      const ticket = createTicket();
      render(<BuildReportInline ticket={ticket} />);
      expect(screen.getByText("Consensus Summary")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // View Full Report link
  // ==========================================================================

  describe("view full report link", () => {
    it("renders View Full Report link pointing to /build/[ticketId]", () => {
      const ticket = createTicket();
      render(<BuildReportInline ticket={ticket} />);
      const link = screen.getByTestId("link");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/build/TIX-001");
      expect(screen.getByText("View Full Report")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Collapsible sections
  // ==========================================================================

  describe("collapsible sections", () => {
    it("renders Requirements, Design Decisions, QA Criteria section headers", () => {
      const ticket = createTicket();
      render(<BuildReportInline ticket={ticket} />);
      expect(screen.getByText("Requirements")).toBeInTheDocument();
      expect(screen.getByText("Design Decisions")).toBeInTheDocument();
      expect(screen.getByText("QA Criteria")).toBeInTheDocument();
    });

    it("shows item count for each section", () => {
      const ticket = createTicket({
        buildReport: createBuildReport({
          requirements: ["Req 1", "Req 2"],
          designDecisions: ["Design 1", "Design 2", "Design 3"],
          qaCriteria: ["QA 1"],
        }),
      });
      render(<BuildReportInline ticket={ticket} />);

      // Count badges: the count is next to each section label
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("expands a collapsed section on click", () => {
      const ticket = createTicket({
        buildReport: createBuildReport({
          requirements: ["Add dark mode toggle"],
        }),
      });
      render(<BuildReportInline ticket={ticket} />);

      // Items should NOT be visible initially (collapsed)
      expect(
        screen.queryByText("Add dark mode toggle")
      ).not.toBeInTheDocument();

      // Click "Requirements" to expand
      fireEvent.click(screen.getByText("Requirements"));

      // Item should now be visible
      expect(screen.getByText("Add dark mode toggle")).toBeInTheDocument();
    });

    it("collapses an expanded section on second click", () => {
      const ticket = createTicket({
        buildReport: createBuildReport({
          requirements: ["Add dark mode toggle"],
        }),
      });
      render(<BuildReportInline ticket={ticket} />);

      // Expand
      fireEvent.click(screen.getByText("Requirements"));
      expect(screen.getByText("Add dark mode toggle")).toBeInTheDocument();

      // Collapse
      fireEvent.click(screen.getByText("Requirements"));
      expect(
        screen.queryByText("Add dark mode toggle")
      ).not.toBeInTheDocument();
    });

    it("shows empty text when section has no items", () => {
      const ticket = createTicket({
        buildReport: createBuildReport({
          designDecisions: [],
        }),
      });
      render(<BuildReportInline ticket={ticket} />);

      // Expand the empty section
      fireEvent.click(screen.getByText("Design Decisions"));

      expect(
        screen.getByText("No design decisions documented.")
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Implementation plan
  // ==========================================================================

  describe("implementation plan", () => {
    it("renders implementation plan section header", () => {
      const ticket = createTicket();
      render(<BuildReportInline ticket={ticket} />);
      expect(screen.getByText("Implementation Plan")).toBeInTheDocument();
    });

    it("renders markdown implementation plan content", () => {
      const ticket = createTicket({
        buildReport: createBuildReport({
          implementationPlan: "## Steps\n\n1. Do the thing",
        }),
      });
      render(<BuildReportInline ticket={ticket} />);
      // parseMarkdown renders h2 and li
      expect(screen.getByText("Steps")).toBeInTheDocument();
      expect(screen.getByText("Do the thing")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Polling while building
  // ==========================================================================

  describe("polling while building", () => {
    it("starts polling when status is building", () => {
      const onBuildUpdated = vi.fn();
      vi.mocked(getTicket).mockReturnValue(
        createTicket({
          buildReport: createBuildReport({ status: "building" }),
        })
      );

      const ticket = createTicket({
        buildReport: createBuildReport({ status: "building" }),
      });
      render(
        <BuildReportInline ticket={ticket} onBuildUpdated={onBuildUpdated} />
      );

      // Advance timers to trigger polling
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // seedData and getTicket should have been called
      expect(seedData).toHaveBeenCalled();
      expect(getTicket).toHaveBeenCalledWith("TIX-001");
    });

    it("calls onBuildUpdated when status changes during polling", () => {
      const onBuildUpdated = vi.fn();
      vi.mocked(getTicket).mockReturnValue(
        createTicket({
          buildReport: createBuildReport({ status: "completed" }),
        })
      );

      const ticket = createTicket({
        buildReport: createBuildReport({ status: "building" }),
      });
      render(
        <BuildReportInline ticket={ticket} onBuildUpdated={onBuildUpdated} />
      );

      // Advance past polling interval
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onBuildUpdated).toHaveBeenCalled();
    });

    it("does not poll when status is not building", () => {
      const onBuildUpdated = vi.fn();

      const ticket = createTicket({
        buildReport: createBuildReport({ status: "completed" }),
      });
      render(
        <BuildReportInline ticket={ticket} onBuildUpdated={onBuildUpdated} />
      );

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(seedData).not.toHaveBeenCalled();
    });

    it("cleans up interval on unmount", () => {
      const onBuildUpdated = vi.fn();
      vi.mocked(getTicket).mockReturnValue(
        createTicket({
          buildReport: createBuildReport({ status: "building" }),
        })
      );

      const ticket = createTicket({
        buildReport: createBuildReport({ status: "building" }),
      });
      const { unmount } = render(
        <BuildReportInline ticket={ticket} onBuildUpdated={onBuildUpdated} />
      );

      unmount();

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Should not trigger additional calls after unmount
      const callCount = vi.mocked(seedData).mock.calls.length;
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(vi.mocked(seedData).mock.calls.length).toBe(callCount);
    });
  });

  // ==========================================================================
  // Edge cases
  // ==========================================================================

  describe("edge cases", () => {
    it("returns null when no build report on ticket and not building", () => {
      const ticket = createTicket({ buildReport: undefined });
      const { container } = render(<BuildReportInline ticket={ticket} />);
      expect(container.firstChild).toBeNull();
    });

    it("handles build report with all empty fields", () => {
      const ticket = createTicket({
        buildReport: createBuildReport({
          requirements: [],
          designDecisions: [],
          qaCriteria: [],
          implementationPlan: "",
          consensusSummary: "",
        }),
      });
      render(<BuildReportInline ticket={ticket} />);
      // Should still render without errors
      expect(screen.getByText("View Full Report")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Retry UI
  // ==========================================================================

  describe("retry UI", () => {
    it("renders failure card when status is building and no buildReport", () => {
      const ticket = createTicket({
        status: "building",
        buildReport: undefined,
      });
      render(<BuildReportInline ticket={ticket} />);
      expect(
        screen.getByText("Build Generation Failed")
      ).toBeInTheDocument();
      expect(screen.getByText("Retry Build")).toBeInTheDocument();
    });

    it("renders failure card when report status is failed", () => {
      const ticket = createTicket({
        status: "building",
        buildReport: createBuildReport({
          status: "failed",
          errorMessage: "LLM overload",
        }),
      });
      render(<BuildReportInline ticket={ticket} />);
      expect(screen.getByText("Build Generation Failed")).toBeInTheDocument();
      expect(screen.getByText("LLM overload")).toBeInTheDocument();
    });

    it("calls onRetry when retry button is clicked", () => {
      const onRetry = vi.fn();
      const ticket = createTicket({
        status: "building",
        buildReport: undefined,
      });
      render(
        <BuildReportInline ticket={ticket} onRetry={onRetry} />
      );
      fireEvent.click(screen.getByText("Retry Build"));
      expect(onRetry).toHaveBeenCalledWith("TIX-001");
    });

    it("does not show failure card when ticket is done with no report", () => {
      const ticket = createTicket({
        status: "done",
        buildReport: undefined,
      });
      const { container } = render(<BuildReportInline ticket={ticket} />);
      expect(container.firstChild).toBeNull();
    });
  });
});
