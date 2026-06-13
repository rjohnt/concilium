/**
 * /api/evals — Aggregated eval results for the /evals dashboard.
 *
 * Reads the eval_results table from Supabase (service role) when configured;
 * falls back to the local JSONL files in scripts/evals/results/ so the
 * dashboard also works in dev without credentials. Aggregation lives in
 * @/lib/eval-report (pure, unit-tested); this route only fetches.
 */

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { buildDashboardData, EvalResultRow } from "@/lib/eval-report";

export const dynamic = "force-dynamic";

const MAX_ROWS = 5000;

function supabaseConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function fetchFromSupabase(): Promise<EvalResultRow[]> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const url =
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/eval_results` +
    `?select=*&order=recorded_at.asc&limit=${MAX_ROWS}`;
  const response = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`eval_results fetch failed (${response.status})`);
  }
  return (await response.json()) as EvalResultRow[];
}

/** Dev fallback: read the gitignored local JSONL results. */
function readLocalResults(): EvalResultRow[] {
  const dir = path.resolve(process.cwd(), "scripts", "evals", "results");
  if (!fs.existsSync(dir)) return [];
  const rows: EvalResultRow[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".jsonl")) continue;
    for (const line of fs.readFileSync(path.join(dir, file), "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        // Local JSONL uses the in-process record shape; map to row shape.
        const r = JSON.parse(line);
        rows.push({
          recorded_at: r.recordedAt,
          model: r.model,
          judge_model: r.judgeModel,
          prompt_version: r.promptVersion,
          suite: r.suite,
          scenario: r.scenario,
          subject: r.subject,
          caught: r.caught ?? null,
          in_role: r.scores?.domainSpecificity ?? null,
          grounding: r.scores?.grounding ?? null,
          actionability: r.scores?.actionability ?? null,
          expectations: r.scores?.expectations ?? null,
          overall: r.overall ?? 0,
          rationale: r.rationale ?? "",
        });
      } catch {
        // skip malformed lines
      }
    }
  }
  return rows.slice(-MAX_ROWS);
}

export async function GET() {
  try {
    let rows: EvalResultRow[];
    let source: "supabase" | "local";
    if (supabaseConfigured()) {
      rows = await fetchFromSupabase();
      source = "supabase";
    } else {
      rows = readLocalResults();
      source = "local";
    }
    return NextResponse.json({ source, data: buildDashboardData(rows) });
  } catch (error) {
    console.error("GET /api/evals error:", error);
    return NextResponse.json({ error: "Failed to load eval results" }, { status: 500 });
  }
}
