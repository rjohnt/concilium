/**
 * Stand-in persona prompt evals. Run with: npm run evals
 *
 * Requires DEEPSEEK_API_KEY. Each case generates a real stand-in response for
 * a fixture scenario, scores it with an LLM judge, and fails below threshold.
 * Results are appended to scripts/evals/results/ for cross-version tracking.
 */

import { describe, it, expect } from "vitest";
import { runStandinLLM } from "@/lib/standin";
import { PROMPT_VERSION } from "@/lib/persona-prompts";
import { PersonaId } from "@/lib/types";
import { coldStartScenario, conflictScenario } from "./scenarios";
import { judgeResponse } from "./judge";
import { recordResult } from "./record";

const PASS_THRESHOLD = 3; // per-dimension minimum on the 1-5 judge scale
const hasApiKey = !!process.env.DEEPSEEK_API_KEY;

const PERSONAS: PersonaId[] = ["engineer", "designer", "product-owner", "qa"];

describe.skipIf(!hasApiKey)("stand-in persona prompts", () => {
  for (const personaId of PERSONAS) {
    it(`${personaId} produces grounded, domain-specific feedback (cold start)`, async () => {
      const run = await runStandinLLM(coldStartScenario.ticket, personaId, coldStartScenario.history);
      expect(run).not.toBeNull();

      const responseText = [
        run!.parsed.feedback,
        `Concerns: ${run!.parsed.concerns.join("; ")}`,
        `Recommendations: ${run!.parsed.recommendations.join("; ")}`,
        `Approve: ${run!.parsed.approve} — ${run!.parsed.approvalReasoning}`,
      ].join("\n");

      const result = await judgeResponse({
        role: personaId,
        ticketSummary: `${coldStartScenario.ticket.title} — ${coldStartScenario.ticket.description}`,
        expectations: coldStartScenario.expectations,
        response: responseText,
      });

      recordResult({
        suite: "standin",
        scenario: coldStartScenario.name,
        subject: personaId,
        promptVersion: PROMPT_VERSION,
        scores: result.scores,
        overall: result.overall,
        rationale: result.rationale,
      });

      expect(result.scores.grounding, result.rationale).toBeGreaterThanOrEqual(PASS_THRESHOLD);
      expect(result.scores.domainSpecificity, result.rationale).toBeGreaterThanOrEqual(PASS_THRESHOLD);
      expect(result.scores.actionability, result.rationale).toBeGreaterThanOrEqual(PASS_THRESHOLD);
    }, 120_000);
  }

  it("qa stand-in engages with prior stakeholder feedback (seeded conflict)", async () => {
    const run = await runStandinLLM(conflictScenario.ticket, "qa", conflictScenario.history);
    expect(run).not.toBeNull();

    const responseText = [
      run!.parsed.feedback,
      `Concerns: ${run!.parsed.concerns.join("; ")}`,
    ].join("\n");

    const result = await judgeResponse({
      role: "qa",
      ticketSummary: `${conflictScenario.ticket.title} — ${conflictScenario.ticket.description}. Prior feedback contains an engineer/designer disagreement about modal vs inline autosave.`,
      expectations: [
        "Acknowledges or builds on the existing engineer/designer feedback rather than ignoring it",
        "Raises QA-specific concerns (test scenarios, edge cases, regression risk) for inline editing",
      ],
      response: responseText,
    });

    recordResult({
      suite: "standin",
      scenario: conflictScenario.name,
      subject: "qa",
      promptVersion: PROMPT_VERSION,
      scores: result.scores,
      overall: result.overall,
      rationale: result.rationale,
    });

    expect(result.overall, result.rationale).toBeGreaterThanOrEqual(PASS_THRESHOLD);
  }, 120_000);
});

if (!hasApiKey) {
  describe("stand-in persona prompts", () => {
    it.skip("skipped — set DEEPSEEK_API_KEY to run evals", () => {});
  });
}
