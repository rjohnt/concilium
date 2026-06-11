/**
 * Mediator facilitator prompt evals. Run with: npm run evals
 *
 * The seeded-conflict scenario plants a real engineer/designer disagreement;
 * the mediator must find it (and not hallucinate others), propose a concrete
 * compromise, and recommend a sensible next action.
 */

import { describe, it, expect } from "vitest";
import { runMediatorLLM } from "@/lib/mediator-persona";
import { PROMPT_VERSION } from "@/lib/persona-prompts";
import { conflictScenario } from "./scenarios";
import { judgeResponse } from "./judge";
import { recordResult } from "./record";

const PASS_THRESHOLD = 3;
const hasApiKey = !!process.env.DEEPSEEK_API_KEY;

describe.skipIf(!hasApiKey)("mediator facilitator prompt", () => {
  it("detects the seeded engineer/designer conflict and proposes a compromise", async () => {
    const report = await runMediatorLLM(conflictScenario.ticket, conflictScenario.history);

    // Structural check: exactly the one seeded conflict, involving both parties
    expect(report.conflicts.length).toBeGreaterThanOrEqual(1);
    const conflict = report.conflicts[0];
    expect(conflict.personas).toContain("engineer");
    expect(conflict.personas).toContain("designer");
    expect(conflict.suggestedCompromise.length).toBeGreaterThan(20);

    // Judged quality check
    const responseText = [
      `Summary: ${report.summary}`,
      ...report.conflicts.map(
        (c) => `Conflict (${c.personas.join(" vs ")}): ${c.description}\nCompromise: ${c.suggestedCompromise}`
      ),
      `Gaps: ${report.gaps.join("; ")}`,
      `Next action: ${report.nextAction}`,
    ].join("\n");

    const result = await judgeResponse({
      role: "mediator/facilitator",
      ticketSummary: `${conflictScenario.ticket.title} — ${conflictScenario.ticket.description}`,
      expectations: conflictScenario.expectations,
      response: responseText,
    });

    recordResult({
      suite: "mediator",
      scenario: conflictScenario.name,
      subject: "mediator",
      promptVersion: PROMPT_VERSION,
      scores: result.scores,
      overall: result.overall,
      rationale: result.rationale,
    });

    expect(result.overall, result.rationale).toBeGreaterThanOrEqual(PASS_THRESHOLD);
  }, 120_000);
});

if (!hasApiKey) {
  describe("mediator facilitator prompt", () => {
    it.skip("skipped — set DEEPSEEK_API_KEY to run evals", () => {});
  });
}
