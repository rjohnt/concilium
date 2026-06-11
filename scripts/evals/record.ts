/**
 * Append eval results to scripts/evals/results/ as JSONL so runs can be
 * compared over time. Each record is stamped with the model under test and
 * the judge model; files are keyed by `<model>__<promptVersion>.jsonl` so a
 * new model's run lands in its own file and never clobbers another's. The
 * report (`npm run evals:report`) reads all of these and tabulates them.
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

export function recordResult(record: EvalRecord): void {
  try {
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }
    const stored: StoredEvalRecord = {
      ...record,
      model: EVAL_MODEL,
      judgeModel: JUDGE_MODEL,
      recordedAt: new Date().toISOString(),
    };
    const file = path.join(
      RESULTS_DIR,
      `${safeFilePart(EVAL_MODEL)}__${safeFilePart(record.promptVersion)}.jsonl`
    );
    fs.appendFileSync(file, JSON.stringify(stored) + "\n");
  } catch (err) {
    // Recording is best-effort; never fail an eval because of it
    console.warn("Failed to record eval result:", err);
  }
}
