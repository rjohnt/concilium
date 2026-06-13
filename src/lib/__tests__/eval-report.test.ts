import { describe, it, expect } from "vitest";
import { buildDashboardData, EvalResultRow } from "../eval-report";

function row(partial: Partial<EvalResultRow>): EvalResultRow {
  return {
    recorded_at: "2026-06-11T04:00:00Z",
    model: "deepseek-v4-flash",
    judge_model: "deepseek-v4-pro",
    prompt_version: "2026-06-11.1",
    suite: "persona-catch",
    scenario: "designer-destructive-no-confirm",
    subject: "designer",
    caught: true,
    in_role: 5,
    grounding: 0,
    actionability: 0,
    expectations: 5,
    overall: 5,
    rationale: "",
    ...partial,
  };
}

describe("buildDashboardData", () => {
  it("returns an empty shape for no rows", () => {
    const d = buildDashboardData([]);
    expect(d.totalRecords).toBe(0);
    expect(d.series).toEqual([]);
    expect(d.suites).toEqual([]);
    expect(d.roles).toEqual([]);
    expect(d.latestModel).toBeNull();
  });

  it("buckets the time series by model and day with catch rate", () => {
    const rows = [
      row({ recorded_at: "2026-06-10T01:00:00Z", caught: true, overall: 4 }),
      row({ recorded_at: "2026-06-10T02:00:00Z", caught: false, overall: 2, scenario: "s2", subject: "qa" }),
      row({ recorded_at: "2026-06-11T01:00:00Z", caught: true, overall: 5, scenario: "s3" }),
      row({ recorded_at: "2026-06-11T01:00:00Z", model: "other-model", caught: true, overall: 3, scenario: "s4" }),
    ];
    const d = buildDashboardData(rows);

    expect(d.models).toEqual(["deepseek-v4-flash", "other-model"]);
    const flash = d.series.find((s) => s.model === "deepseek-v4-flash")!;
    expect(flash.points.map((p) => p.date)).toEqual(["2026-06-10", "2026-06-11"]);
    expect(flash.points[0].overall).toBe(3); // (4+2)/2
    expect(flash.points[0].catchRate).toBe(0.5);
    expect(flash.points[1].catchRate).toBe(1);

    const other = d.series.find((s) => s.model === "other-model")!;
    expect(other.points).toHaveLength(1);
  });

  it("excludes non-applicable records from catch rate (caught=null)", () => {
    const rows = [
      row({ caught: null, scenario: "lane-control" }),
      row({ caught: true, scenario: "s1" }),
    ];
    const d = buildDashboardData(rows);
    expect(d.series[0].points[0].catchRate).toBe(1); // null excluded, not counted as miss
  });

  it("dedupes re-runs in the scorecard (latest record per case wins)", () => {
    const rows = [
      row({ recorded_at: "2026-06-11T01:00:00Z", caught: false, overall: 1 }),
      // same case re-run later — should replace, not add
      row({ recorded_at: "2026-06-11T02:00:00Z", caught: true, overall: 5 }),
    ];
    const d = buildDashboardData(rows);
    const suite = d.suites[0];
    expect(suite.n).toBe(1);
    expect(suite.caught).toBe(1);
    expect(suite.catchApplicable).toBe(1);
    expect(suite.overall).toBe(5);
  });

  it("groups the scorecard by model × prompt version × suite", () => {
    const rows = [
      row({ suite: "persona-catch" }),
      row({ suite: "standin", caught: null, scenario: "cold", grounding: 4, actionability: 4 }),
      row({ prompt_version: "2026-06-12.1", scenario: "v2-case" }),
    ];
    const d = buildDashboardData(rows);
    expect(d.suites).toHaveLength(3);
    expect(d.promptVersions).toEqual(["2026-06-11.1", "2026-06-12.1"]);
  });

  it("builds the per-role breakdown from the latest model + prompt version only", () => {
    const rows = [
      // old prompt version — must be excluded from roles
      row({ recorded_at: "2026-06-09T00:00:00Z", prompt_version: "2026-06-09.1", subject: "designer", in_role: 1, caught: false }),
      // latest
      row({ recorded_at: "2026-06-11T01:00:00Z", subject: "designer", in_role: 5, caught: true }),
      row({ recorded_at: "2026-06-11T01:00:00Z", subject: "engineer", scenario: "eng-trap", in_role: 4, caught: true }),
      row({
        recorded_at: "2026-06-11T01:00:00Z",
        suite: "persona-differentiation",
        scenario: "multitrap",
        subject: "engineer",
        in_role: 5,
        caught: true,
      }),
    ];
    const d = buildDashboardData(rows);

    expect(d.latestPromptVersion).toBe("2026-06-11.1");
    const designer = d.roles.find((r) => r.subject === "designer")!;
    expect(designer.inLane).toBe(5); // the v1 row was excluded
    const engineer = d.roles.find((r) => r.subject === "engineer")!;
    expect(engineer.n).toBe(2);
    expect(engineer.inLane).toBe(4.5);
    expect(engineer.caught).toBe(2);
  });
});
