/**
 * Eval result persistence — dual-write so history survives and accumulates:
 *
 *   1. Local JSONL (scripts/evals/results/<model>__<promptVersion>.jsonl,
 *      gitignored) — zero-dependency, works offline, feeds `npm run evals:report`.
 *   2. The `eval_results` table in Supabase (when NEXT_PUBLIC_SUPABASE_URL +
 *      SUPABASE_SERVICE_ROLE_KEY are present) — the durable cross-machine
 *      history that powers the /evals dashboard's performance-over-time view.
 *
 * Every record is stamped with the model under test and the judge model so
 * models and prompt versions can be compared over time (see EVALS.md §4).
 */

import fs from "fs";
import path from "path";
import { JudgeScores } from "./judge";
import { EVAL_MODEL, JUDGE_MODEL } from "./config";

export interface EvalRecord {
  suite: string;
  scenario: string;
  subject: string;
  promptVersion: string;
  scores: JudgeScores;
  overall: number;
  rationale: string;
  /**
   * For seeded-trap suites: did the role clearly raise the seeded issue?
   * null/undefined for suites where "catching" doesn't apply (quality,
   * lane-discipline controls).
   */
  caught?: boolean | null;
}

export interface StoredEvalRecord extends EvalRecord {
  model: string;
  judgeModel: string;
  recordedAt: string;
}

const RESULTS_DIR = path.resolve(__dirname, "results");

function safeFilePart(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function supabaseConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/** Insert into the eval_results table via PostgREST (service role). */
async function persistToSupabase(stored: StoredEvalRecord): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/eval_results`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      recorded_at: stored.recordedAt,
      model: stored.model,
      judge_model: stored.judgeModel,
      prompt_version: stored.promptVersion,
      suite: stored.suite,
      scenario: stored.scenario,
      subject: stored.subject,
      caught: stored.caught ?? null,
      in_role: stored.scores.domainSpecificity,
      grounding: stored.scores.grounding,
      actionability: stored.scores.actionability,
      expectations: stored.scores.expectations,
      overall: stored.overall,
      rationale: stored.rationale,
    }),
  });
  if (!response.ok) {
    throw new Error(`eval_results insert failed (${response.status}): ${await response.text()}`);
  }
}

export function recordResult(record: EvalRecord): void {
  const stored: StoredEvalRecord = {
    ...record,
    model: EVAL_MODEL,
    judgeModel: JUDGE_MODEL,
    recordedAt: new Date().toISOString(),
  };

  // 1) Local JSONL — best-effort, never fails an eval
  try {
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }
    const file = path.join(
      RESULTS_DIR,
      `${safeFilePart(EVAL_MODEL)}__${safeFilePart(record.promptVersion)}.jsonl`
    );
    fs.appendFileSync(file, JSON.stringify(stored) + "\n");
  } catch (err) {
    console.warn("Failed to record eval result locally:", err);
  }

  // 2) Supabase — fire-and-forget so a network blip never fails an eval;
  //    failures are logged for visibility.
  if (supabaseConfigured()) {
    persistToSupabase(stored).catch((err) => {
      console.warn("Failed to persist eval result to Supabase:", err);
    });
  }
}
