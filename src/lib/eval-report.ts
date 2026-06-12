/**
 * eval-report.ts — Pure aggregation for the /evals dashboard.
 *
 * Takes raw rows from the eval_results table (or the local JSONL fallback)
 * and shapes them into the dashboard's view model: score-over-time series per
 * model, a latest scorecard per (model × prompt version × suite), and a
 * per-role breakdown for the current model/prompt. No I/O here — the API
 * route does the fetching, tests feed fixtures. See EVALS.md for what the
 * metrics mean and why they matter.
 */

export interface EvalResultRow {
  recorded_at: string;
  model: string;
  judge_model: string;
  prompt_version: string;
  suite: string;
  scenario: string;
  subject: string;
  /** Seeded-trap suites only; null where catching doesn't apply. */
  caught: boolean | null;
  in_role: number | null;
  grounding: number | null;
  actionability: number | null;
  expectations: number | null;
  overall: number;
  rationale: string;
}

export interface EvalTimePoint {
  /** Calendar day (YYYY-MM-DD). */
  date: string;
  /** Mean overall score (1–5) across that day's records. */
  overall: number;
  /** Mean in-role score (1–5). */
  inLane: number;
  /** Fraction caught among records where catching applies; null if none. */
  catchRate: number | null;
  /** Records aggregated into this point. */
  n: number;
}

export interface ModelSeries {
  model: string;
  points: EvalTimePoint[];
}

export interface SuiteSummary {
  model: string;
  promptVersion: string;
  suite: string;
  n: number;
  /** caught / applicable (catch suites only). */
  caught: number;
  catchApplicable: number;
  inLane: number;
  overall: number;
  judgeModel: string;
  lastRunAt: string;
}

export interface RoleSummary {
  subject: string;
  /** Mean in-role score across the role's latest seeded-trap records. */
  inLane: number;
  caught: number;
  catchApplicable: number;
  n: number;
}

export interface EvalDashboardData {
  totalRecords: number;
  models: string[];
  promptVersions: string[];
  /** The most recently exercised model + prompt version. */
  latestModel: string | null;
  latestPromptVersion: string | null;
  lastRunAt: string | null;
  series: ModelSeries[];
  suites: SuiteSummary[];
  /** Per-role breakdown for the latest model + prompt version. */
  roles: RoleSummary[];
}

const avg = (xs: number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

const round = (x: number): number => Math.round(x * 100) / 100;

function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Latest record per logical case (model, version, suite, scenario, subject) —
 * re-runs shouldn't double-count in scorecards.
 */
function dedupeLatest(rows: EvalResultRow[]): EvalResultRow[] {
  const latest = new Map<string, EvalResultRow>();
  for (const r of rows) {
    const key = [r.model, r.prompt_version, r.suite, r.scenario, r.subject].join("|");
    const prev = latest.get(key);
    if (!prev || new Date(r.recorded_at) > new Date(prev.recorded_at)) {
      latest.set(key, r);
    }
  }
  return Array.from(latest.values());
}

export function buildDashboardData(rows: EvalResultRow[]): EvalDashboardData {
  if (rows.length === 0) {
    return {
      totalRecords: 0,
      models: [],
      promptVersions: [],
      latestModel: null,
      latestPromptVersion: null,
      lastRunAt: null,
      series: [],
      suites: [],
      roles: [],
    };
  }

  const sorted = [...rows].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );
  const newest = sorted[sorted.length - 1];

  // ── Time series per model (daily buckets — trends over time) ──────────────
  const byModel = new Map<string, EvalResultRow[]>();
  for (const r of sorted) {
    const list = byModel.get(r.model) ?? [];
    list.push(r);
    byModel.set(r.model, list);
  }

  const series: ModelSeries[] = Array.from(byModel.entries()).map(([model, rs]) => {
    const byDay = new Map<string, EvalResultRow[]>();
    for (const r of rs) {
      const d = dayOf(r.recorded_at);
      const list = byDay.get(d) ?? [];
      list.push(r);
      byDay.set(d, list);
    }
    const points: EvalTimePoint[] = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayRows]) => {
        const catchable = dayRows.filter((r) => r.caught !== null);
        return {
          date,
          overall: round(avg(dayRows.map((r) => r.overall))),
          inLane: round(avg(dayRows.map((r) => r.in_role ?? 0))),
          catchRate: catchable.length
            ? round(catchable.filter((r) => r.caught).length / catchable.length)
            : null,
          n: dayRows.length,
        };
      });
    return { model, points };
  });

  // ── Scorecard per model × prompt version × suite (deduped re-runs) ────────
  const deduped = dedupeLatest(sorted);
  const groups = new Map<string, EvalResultRow[]>();
  for (const r of deduped) {
    const key = [r.model, r.prompt_version, r.suite].join("|");
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  const suites: SuiteSummary[] = Array.from(groups.values())
    .map((rs) => {
      const catchable = rs.filter((r) => r.caught !== null);
      const last = rs.reduce((m, r) => (r.recorded_at > m ? r.recorded_at : m), rs[0].recorded_at);
      return {
        model: rs[0].model,
        promptVersion: rs[0].prompt_version,
        suite: rs[0].suite,
        n: rs.length,
        caught: catchable.filter((r) => r.caught).length,
        catchApplicable: catchable.length,
        inLane: round(avg(rs.map((r) => r.in_role ?? 0))),
        overall: round(avg(rs.map((r) => r.overall))),
        judgeModel: rs[0].judge_model,
        lastRunAt: last,
      };
    })
    .sort(
      (a, b) =>
        a.model.localeCompare(b.model) ||
        a.promptVersion.localeCompare(b.promptVersion) ||
        a.suite.localeCompare(b.suite)
    );

  // ── Per-role breakdown for the latest model + prompt version ──────────────
  const roleRows = deduped.filter(
    (r) =>
      r.model === newest.model &&
      r.prompt_version === newest.prompt_version &&
      (r.suite === "persona-catch" || r.suite === "persona-differentiation" || r.suite === "standin")
  );
  const bySubject = new Map<string, EvalResultRow[]>();
  for (const r of roleRows) {
    const list = bySubject.get(r.subject) ?? [];
    list.push(r);
    bySubject.set(r.subject, list);
  }
  const roles: RoleSummary[] = Array.from(bySubject.entries())
    .map(([subject, rs]) => {
      const catchable = rs.filter((r) => r.caught !== null);
      return {
        subject,
        inLane: round(avg(rs.map((r) => r.in_role ?? 0))),
        caught: catchable.filter((r) => r.caught).length,
        catchApplicable: catchable.length,
        n: rs.length,
      };
    })
    .sort((a, b) => a.subject.localeCompare(b.subject));

  return {
    totalRecords: rows.length,
    models: Array.from(byModel.keys()).sort(),
    promptVersions: Array.from(new Set(rows.map((r) => r.prompt_version))).sort(),
    latestModel: newest.model,
    latestPromptVersion: newest.prompt_version,
    lastRunAt: newest.recorded_at,
    series,
    suites,
    roles,
  };
}
