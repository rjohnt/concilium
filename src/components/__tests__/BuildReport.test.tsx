import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BuildReport } from "../BuildReport";
import { BuildReport as BuildReportType } from "@/lib/types";

function createBuildReport(
  overrides: Partial<BuildReportType> = {}
): BuildReportType {
  return {
    id: "BLD-001",
    ticketId: "TIX-001",
    createdAt: "2026-05-27T10:00:00Z",
    status: "completed",
    requirements: ["Add dark mode toggle"],
    designDecisions: ["Use cool gray palette"],
    qaCriteria: ["Test across browsers"],
    implementationPlan: "## Steps\n\n1. Build it",
    consensusSummary: "All 4 personas approved.",
    ...overrides,
  };
}

describe("BuildReport", () => {
  describe("failure state", () => {
    it("renders BuildRetryCard when no report and ticketStatus is building", () => {
      render(
        <BuildReport
          report={undefined}
          ticketStatus="building"
          isRetrying={false}
          onRetry={vi.fn()}
        />
      );
      expect(
        screen.getByText("Build Generation Failed")
      ).toBeInTheDocument();
      expect(screen.getByText("Retry Build")).toBeInTheDocument();
    });

    it("renders empty state when no report and ticketStatus is not building", () => {
      render(
        <BuildReport
          report={undefined}
          ticketStatus="consensus"
          isRetrying={false}
        />
      );
      expect(
        screen.getByText("No build report available.")
      ).toBeInTheDocument();
    });

    it("renders failed badge + retry card when report status is failed", () => {
      render(
        <BuildReport
          report={createBuildReport({
            status: "failed",
            errorMessage: "API error",
          })}
          buildRetryCount={2}
          isRetrying={false}
          onRetry={vi.fn()}
        />
      );
      expect(screen.getByText("Failed")).toBeInTheDocument();
      expect(screen.getByText("Build Generation Failed")).toBeInTheDocument();
      expect(screen.getByText("API error")).toBeInTheDocument();
    });
  });

  describe("normal report rendering", () => {
    it("renders completed badge and report content", () => {
      render(
        <BuildReport report={createBuildReport({ status: "completed" })} />
      );
      expect(screen.getByText("Completed")).toBeInTheDocument();
      expect(screen.getByText("BLD-001")).toBeInTheDocument();
      expect(screen.getByText("Consensus Summary")).toBeInTheDocument();
      expect(
        screen.getByText("All 4 personas approved.")
      ).toBeInTheDocument();
    });

    it("renders building badge and content", () => {
      render(
        <BuildReport report={createBuildReport({ status: "building" })} />
      );
      expect(screen.getByText("Building")).toBeInTheDocument();
    });

    it("renders report sections", () => {
      render(
        <BuildReport
          report={createBuildReport({
            requirements: ["Req A", "Req B"],
            designDecisions: ["Design 1"],
            qaCriteria: ["QA 1", "QA 2", "QA 3"],
          })}
        />
      );
      expect(screen.getByText("Technical Requirements")).toBeInTheDocument();
      expect(screen.getByText("Design Decisions")).toBeInTheDocument();
      expect(screen.getByText("QA Criteria")).toBeInTheDocument();
      expect(screen.getByText("Implementation Plan")).toBeInTheDocument();
    });
  });

  describe("retry UI", () => {
    it("shows attempt count when buildRetryCount is set and failed", () => {
      render(
        <BuildReport
          report={createBuildReport({ status: "failed" })}
          buildRetryCount={1}
          isRetrying={true}
          onRetry={vi.fn()}
        />
      );
      expect(
        screen.getByText(/Retrying build\.\.\. Attempt 2 of 3/)
      ).toBeInTheDocument();
    });
  });
});
