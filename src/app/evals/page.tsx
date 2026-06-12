"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Target,
  Crosshair,
  Database,
  FlaskConical,
  BookOpenText,
} from "lucide-react";
import type { EvalDashboardData, ModelSeries } from "@/lib/eval-report";
import { PersonaIcon } from "@/components/PersonaIcon";
import { PersonaId } from "@/lib/types";

// ── Palette (Concilium design tokens) ───────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  engineer: "var(--persona-eng-500)",
  designer: "var(--persona-des-500)",
  "product-owner": "var(--persona-prod-500)",
  qa: "var(--persona-res-500)",
  mediator: "var(--coral-500)",
};

const MODEL_COLORS = [
  "var(--coral-500)",
  "var(--persona-res-500)",
  "var(--persona-eng-500)",
  "var(--persona-des-500)",
  "var(--persona-prod-500)",
];

const ROLE_LABELS: Record<string, string> = {
  engineer: "Engineer",
  designer: "Designer",
  "product-owner": "Product Owner",
  qa: "QA",
  mediator: "Mediator",
};

const SUITE_LABELS: Record<string, string> = {
  "persona-catch": "Targeted catch",
  "persona-differentiation": "Differentiation",
  standin: "Stand-in quality",
  mediator: "Mediator",
};

// ── Tiny SVG line chart (no chart deps) ─────────────────────────────────────

function TrendChart({
  series,
  metric,
  yMax,
  yLabel,
  format,
}: {
  series: ModelSeries[];
  metric: "overall" | "catchRate";
  yMax: number;
  yLabel: string;
  format: (v: number) => string;
}) {
  const W = 560;
  const H = 180;
  const PAD = { left: 36, right: 12, top: 12, bottom: 24 };

  const allDates = Array.from(
    new Set(series.flatMap((s) => s.points.map((p) => p.date)))
  ).sort();

  if (allDates.length === 0) {
    return (
      <p className="text-sm py-10 text-center" style={{ color: "var(--ink-400)" }}>
        No eval runs recorded yet — run <code>npm run evals</code>.
      </p>
    );
  }

  const x = (date: string) => {
    const i = allDates.indexOf(date);
    if (allDates.length === 1) return PAD.left + (W - PAD.left - PAD.right) / 2;
    return PAD.left + (i / (allDates.length - 1)) * (W - PAD.left - PAD.right);
  };
  const y = (v: number) => PAD.top + (1 - v / yMax) * (H - PAD.top - PAD.bottom);

  const gridValues = [0.25, 0.5, 0.75, 1].map((f) => f * yMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={yLabel}>
      {/* gridlines */}
      {gridValues.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--warm-200)"
            strokeWidth={1}
          />
          <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="var(--ink-400)">
            {format(v)}
          </text>
        </g>
      ))}
      {/* x labels */}
      {allDates.map((d) => (
        <text key={d} x={x(d)} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--ink-400)">
          {d.slice(5)}
        </text>
      ))}
      {/* one line + dots per model */}
      {series.map((s, si) => {
        const color = MODEL_COLORS[si % MODEL_COLORS.length];
        const pts = s.points
          .filter((p) => (metric === "catchRate" ? p.catchRate !== null : true))
          .map((p) => ({
            px: x(p.date),
            py: y(metric === "catchRate" ? (p.catchRate ?? 0) : p.overall),
            p,
          }));
        return (
          <g key={s.model}>
            {pts.length > 1 && (
              <polyline
                points={pts.map(({ px, py }) => `${px},${py}`).join(" ")}
                fill="none"
                stroke={color}
                strokeWidth={2}
              />
            )}
            {pts.map(({ px, py, p }) => (
              <circle key={p.date} cx={px} cy={py} r={4} fill={color}>
                <title>
                  {s.model} · {p.date} ·{" "}
                  {metric === "catchRate"
                    ? `catch ${format(p.catchRate ?? 0)}`
                    : `overall ${format(p.overall)}`}{" "}
                  · n={p.n}
                </title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function EvalsPage() {
  const [data, setData] = useState<EvalDashboardData | null>(null);
  const [source, setSource] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/evals")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load eval results (${r.status})`);
        const body = await r.json();
        setData(body.data);
        setSource(body.source);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center text-sm" style={{ color: "var(--danger-500)" }}>
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center text-sm" style={{ color: "var(--ink-400)" }}>
        Loading eval results…
      </div>
    );
  }

  // Headline numbers from the latest model+prompt scorecard rows
  const latestSuites = data.suites.filter(
    (s) => s.model === data.latestModel && s.promptVersion === data.latestPromptVersion
  );
  const caught = latestSuites.reduce((a, s) => a + s.caught, 0);
  const catchable = latestSuites.reduce((a, s) => a + s.catchApplicable, 0);
  const inLaneAvg =
    latestSuites.length > 0
      ? (latestSuites.reduce((a, s) => a + s.inLane, 0) / latestSuites.length).toFixed(1)
      : "—";

  const card = {
    background: "#ffffff",
    border: "1px solid var(--warm-200)",
    boxShadow: "var(--shadow-xs)",
  } as const;

  return (
    <div className="max-w-5xl mx-auto" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2" style={{ color: "var(--ink-900)" }}>
            <FlaskConical size={20} style={{ color: "var(--coral-500)" }} />
            Agent Evals
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-500)" }}>
            Persona-agent effectiveness over time · prompt {data.latestPromptVersion ?? "—"} · source: {source}
          </p>
        </div>
      </div>
      <p className="text-xs mb-6 max-w-3xl leading-relaxed" style={{ color: "var(--ink-500)" }}>
        Each run replays seeded scenarios through the production agents and grades them with a fixed
        LLM judge: did each role <em>catch the problem only it would catch</em>, and did it stay in
        its lane? Methodology, metrics, and sources: <code>EVALS.md</code> in the repo.
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Targeted catch",
            value: catchable ? `${caught}/${catchable}` : "—",
            icon: Target,
            accent: "var(--coral-500)",
          },
          { label: "In-lane (avg, 1–5)", value: inLaneAvg, icon: Crosshair, accent: "var(--persona-eng-500)" },
          { label: "Models tracked", value: data.models.length || "—", icon: Activity, accent: "var(--persona-res-500)" },
          { label: "Records", value: data.totalRecords || "—", icon: Database, accent: "var(--persona-prod-500)" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-4" style={card}>
            <div className="flex items-center gap-2 text-xs font-medium mb-1" style={{ color: "var(--ink-500)" }}>
              <stat.icon size={14} style={{ color: stat.accent }} />
              {stat.label}
            </div>
            <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--ink-900)" }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl p-4" style={card}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--ink-900)" }}>
            Overall score over time
          </h3>
          <TrendChart series={data.series} metric="overall" yMax={5} yLabel="Overall score" format={(v) => v.toFixed(1)} />
        </div>
        <div className="rounded-xl p-4" style={card}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--ink-900)" }}>
            Catch rate over time
          </h3>
          <TrendChart
            series={data.series}
            metric="catchRate"
            yMax={1}
            yLabel="Catch rate"
            format={(v) => `${Math.round(v * 100)}%`}
          />
        </div>
      </div>

      {/* Model legend */}
      {data.models.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-8 -mt-4">
          {data.series.map((s, i) => (
            <span key={s.model} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: "var(--ink-500)" }}>
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: MODEL_COLORS[i % MODEL_COLORS.length] }}
              />
              {s.model}
            </span>
          ))}
        </div>
      )}

      {/* Per-role effectiveness */}
      <div className="rounded-xl p-4 mb-8" style={card}>
        <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--ink-900)" }}>
          Role effectiveness — {data.latestModel ?? "no runs yet"}
        </h3>
        <p className="text-[11px] mb-4" style={{ color: "var(--ink-500)" }}>
          In-lane: how squarely the agent argues from its own domain (1–5). Caught: seeded problems
          the role surfaced.
        </p>
        <div className="space-y-3">
          {data.roles.length === 0 && (
            <p className="text-sm py-4 text-center" style={{ color: "var(--ink-400)" }}>
              No role data yet.
            </p>
          )}
          {data.roles.map((role) => {
            const color = ROLE_COLORS[role.subject] ?? "var(--ink-400)";
            return (
              <div key={role.subject} className="flex items-center gap-3" data-testid={`role-row-${role.subject}`}>
                <span className="w-40 flex items-center gap-2 text-xs font-medium shrink-0" style={{ color: "var(--ink-700)" }}>
                  {role.subject !== "mediator" ? (
                    <PersonaIcon personaId={role.subject as PersonaId} size={14} />
                  ) : (
                    <FlaskConical size={14} style={{ color }} />
                  )}
                  {ROLE_LABELS[role.subject] ?? role.subject}
                </span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--warm-150)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(role.inLane / 5) * 100}%`, background: color }}
                  />
                </div>
                <span className="w-14 text-right text-xs font-semibold" style={{ color: "var(--ink-700)" }}>
                  {role.inLane.toFixed(1)}/5
                </span>
                <span className="w-16 text-right text-[11px]" style={{ color: "var(--ink-500)" }}>
                  {role.catchApplicable > 0 ? `${role.caught}/${role.catchApplicable} caught` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scorecard table */}
      <div className="rounded-xl p-4 mb-8 overflow-x-auto" style={card}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--ink-900)" }}>
          Scorecard — model × prompt version × suite
        </h3>
        <table className="w-full text-xs" style={{ color: "var(--ink-700)" }}>
          <thead>
            <tr className="text-left" style={{ color: "var(--ink-400)" }}>
              <th className="py-1.5 pr-3 font-medium">Model</th>
              <th className="py-1.5 pr-3 font-medium">Prompt</th>
              <th className="py-1.5 pr-3 font-medium">Suite</th>
              <th className="py-1.5 pr-3 font-medium text-right">Caught</th>
              <th className="py-1.5 pr-3 font-medium text-right">In-lane</th>
              <th className="py-1.5 pr-3 font-medium text-right">Overall</th>
              <th className="py-1.5 font-medium">Judge</th>
            </tr>
          </thead>
          <tbody>
            {data.suites.map((s) => (
              <tr key={`${s.model}-${s.promptVersion}-${s.suite}`} style={{ borderTop: "1px solid var(--warm-150)" }}>
                <td className="py-1.5 pr-3 font-mono">{s.model}</td>
                <td className="py-1.5 pr-3 font-mono">{s.promptVersion}</td>
                <td className="py-1.5 pr-3">{SUITE_LABELS[s.suite] ?? s.suite}</td>
                <td className="py-1.5 pr-3 text-right font-semibold">
                  {s.catchApplicable > 0 ? `${s.caught}/${s.catchApplicable}` : "—"}
                </td>
                <td className="py-1.5 pr-3 text-right">{s.inLane.toFixed(1)}</td>
                <td className="py-1.5 pr-3 text-right">{s.overall.toFixed(1)}</td>
                <td className="py-1.5 font-mono" style={{ color: "var(--ink-400)" }}>{s.judgeModel}</td>
              </tr>
            ))}
            {data.suites.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center" style={{ color: "var(--ink-400)" }}>
                  No eval runs recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Methodology footer */}
      <div className="rounded-xl p-4 mb-12 flex items-start gap-3" style={{ background: "var(--coral-50)", border: "1px solid var(--coral-100)" }}>
        <BookOpenText size={16} className="shrink-0 mt-0.5" style={{ color: "var(--coral-600)" }} />
        <p className="text-xs leading-relaxed" style={{ color: "var(--ink-700)" }}>
          <strong>How to read this:</strong> scenarios seed a known problem that exactly one role
          should catch (e.g. the Designer must flag a destructive action with no undo). A fixed
          stronger judge model verifies the catch and scores lane discipline — so scores are
          comparable across prompt versions and across models. Benchmark a new model with{" "}
          <code>CONCILIUM_EVAL_MODEL=&lt;model&gt; npm run evals</code>; full methodology and
          sources in <code>EVALS.md</code>.
        </p>
      </div>
    </div>
  );
}
