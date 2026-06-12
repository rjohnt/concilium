import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import EvalsPage from "../evals/page";
import type { EvalDashboardData } from "@/lib/eval-report";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const sampleData: EvalDashboardData = {
  totalRecords: 15,
  models: ["deepseek-v4-flash"],
  promptVersions: ["2026-06-11.1"],
  latestModel: "deepseek-v4-flash",
  latestPromptVersion: "2026-06-11.1",
  lastRunAt: "2026-06-11T05:00:00Z",
  series: [
    {
      model: "deepseek-v4-flash",
      points: [
        { date: "2026-06-10", overall: 4.2, inLane: 4.5, catchRate: 0.75, n: 8 },
        { date: "2026-06-11", overall: 4.8, inLane: 5, catchRate: 1, n: 7 },
      ],
    },
  ],
  suites: [
    {
      model: "deepseek-v4-flash",
      promptVersion: "2026-06-11.1",
      suite: "persona-catch",
      n: 5,
      caught: 4,
      catchApplicable: 4,
      inLane: 5,
      overall: 4.2,
      judgeModel: "deepseek-v4-pro",
      lastRunAt: "2026-06-11T05:00:00Z",
    },
  ],
  roles: [
    { subject: "designer", inLane: 5, caught: 2, catchApplicable: 2, n: 3 },
    { subject: "engineer", inLane: 4.5, caught: 1, catchApplicable: 2, n: 3 },
  ],
};

beforeEach(() => {
  fetchMock.mockReset();
});

describe("EvalsPage", () => {
  it("renders headline stats, charts, roles, and scorecard from the API", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ source: "supabase", data: sampleData }),
    });

    render(<EvalsPage />);

    await waitFor(() => {
      expect(screen.getByText("Agent Evals")).toBeInTheDocument();
    });

    // Headline catch stat (4/4 — appears in the stat card and the scorecard)
    expect(screen.getAllByText("4/4").length).toBeGreaterThanOrEqual(1);
    // Charts rendered (two SVGs with aria labels)
    expect(screen.getByRole("img", { name: "Overall score" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Catch rate" })).toBeInTheDocument();
    // Role rows with persona colors
    expect(screen.getByTestId("role-row-designer")).toHaveTextContent("5.0/5");
    expect(screen.getByTestId("role-row-engineer")).toHaveTextContent("1/2 caught");
    // Scorecard row ("Targeted catch" also labels the stat card)
    expect(screen.getAllByText("Targeted catch").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("deepseek-v4-pro")).toBeInTheDocument();
  });

  it("shows an empty state when no runs are recorded", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        source: "local",
        data: {
          totalRecords: 0,
          models: [],
          promptVersions: [],
          latestModel: null,
          latestPromptVersion: null,
          lastRunAt: null,
          series: [],
          suites: [],
          roles: [],
        },
      }),
    });

    render(<EvalsPage />);

    await waitFor(() => {
      expect(screen.getByText("No eval runs recorded yet.")).toBeInTheDocument();
    });
  });

  it("surfaces API failures", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    render(<EvalsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load eval results \(500\)/)).toBeInTheDocument();
    });
  });
});
