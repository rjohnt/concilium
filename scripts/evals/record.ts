/**
 * Append eval results to scripts/evals/results/ as JSONL, keyed by prompt
 * version, so prompt changes can be compared across runs.
 */

import fs from "fs";
import path from "path";
import { JudgeScores } from "./judge";

export interface EvalRecord {
  suite: string;
  scenario: string;
  subject: string;
  promptVersion: string;
  scores: JudgeScores;
  overall: number;
  rationale: string;
}

const RESULTS_DIR = path.resolve(__dirname, "results");

export function recordResult(record: EvalRecord): void {
  try {
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }
    const file = path.join(RESULTS_DIR, `${record.promptVersion}.jsonl`);
    const line = JSON.stringify({ ...record, recordedAt: new Date().toISOString() });
    fs.appendFileSync(file, line + "\n");
  } catch (err) {
    // Recording is best-effort; never fail an eval because of it
    console.warn("Failed to record eval result:", err);
  }
}
