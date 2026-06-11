#!/usr/bin/env node
/**
 * Eval report — tabulate recorded eval results so models can be compared over
 * time. Reads every scripts/evals/results/*.jsonl and groups by
 * (model × promptVersion × suite), showing pass rate and average scores.
 *
 *   npm run evals:report
 *
 * Each row is one model+promptVersion+suite. "catch" suites report how many
 * cases caught their seeded issue; all suites report average in-lane and
 * overall scores. Run a new model with
 *   CONCILIUM_EVAL_MODEL=<model> npm run evals
 * then re-run this report to see it alongside prior models.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const RESULTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "results");

if (!fs.existsSync(RESULTS_DIR)) {
  console.log("No eval results yet. Run `npm run evals` (needs DEEPSEEK_API_KEY) first.");
  process.exit(0);
}

const records = [];
for (const file of fs.readdirSync(RESULTS_DIR)) {
  if (!file.endsWith(".jsonl")) continue;
  const lines = fs.readFileSync(path.join(RESULTS_DIR, file), "utf8").trim().split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      /* skip malformed */
    }
  }
}

if (records.length === 0) {
  console.log("No eval records found in", RESULTS_DIR);
  process.exit(0);
}

// Keep only the latest record per (model, promptVersion, suite, scenario, subject)
// so re-runs don't double-count.
const latest = new Map();
for (const r of records) {
  const key = [r.model, r.promptVersion, r.suite, r.scenario, r.subject].join("|");
  const prev = latest.get(key);
  if (!prev || new Date(r.recordedAt) > new Date(prev.recordedAt)) latest.set(key, r);
}

// Group by model × promptVersion × suite
const groups = new Map();
for (const r of latest.values()) {
  const key = [r.model, r.promptVersion, r.suite].join("|");
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pad = (s, n) => String(s).padEnd(n);

const rows = [];
for (const [key, rs] of groups) {
  const [model, version, suite] = key.split("|");
  // "caught" is encoded as expectations===5 by the catch/differentiation suites
  const caughtCount = rs.filter((r) => r.scores?.expectations === 5).length;
  rows.push({
    model,
    version,
    suite,
    n: rs.length,
    caught: `${caughtCount}/${rs.length}`,
    inLane: avg(rs.map((r) => r.scores?.domainSpecificity ?? 0)).toFixed(1),
    overall: avg(rs.map((r) => r.overall ?? 0)).toFixed(1),
    judge: rs[0].judgeModel ?? "?",
  });
}

rows.sort((a, b) =>
  a.model.localeCompare(b.model) || a.version.localeCompare(b.version) || a.suite.localeCompare(b.suite)
);

const headers = ["MODEL", "PROMPT_VER", "SUITE", "N", "CAUGHT", "IN-LANE", "OVERALL", "JUDGE"];
const widths = [22, 14, 24, 3, 7, 8, 8, 18];
console.log("\nEval results — model comparison over time\n");
console.log(headers.map((h, i) => pad(h, widths[i])).join(" "));
console.log(widths.map((w) => "-".repeat(w)).join(" "));
for (const r of rows) {
  console.log(
    [r.model, r.version, r.suite, r.n, r.caught, r.inLane, r.overall, r.judge]
      .map((v, i) => pad(v, widths[i]))
      .join(" ")
  );
}
console.log(
  `\n${rows.length} group(s) across ${new Set(rows.map((r) => r.model)).size} model(s). ` +
    `IN-LANE/OVERALL are 1-5 (higher better); CAUGHT = cases that caught their seeded issue.\n`
);
