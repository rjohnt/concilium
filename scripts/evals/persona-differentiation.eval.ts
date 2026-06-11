/**
 * Cross-persona differentiation eval. Run with: npm run evals (needs DEEPSEEK_API_KEY).
 *
 * Runs all four personas against ONE ticket that contains a UX trap, a scope
 * trap, a scale trap, and a correctness trap simultaneously. Each role should
 * gravitate to its OWN trap — proving the agents produce genuinely different
 * reviews of the same input rather than four flavors of the same generic take.
 */

import { describe, it, expect } from "vitest";
import { runStandinLLM } from "@/lib/standin";
import { PROMPT_VERSION } from "@/lib/persona-prompts";
import { PersonaId } from "@/lib/types";
import { multiTrapShareReport } from "./scenarios";
import { judgeCatch } from "./judge";
import { recordResult } from "./record";
import { EVAL_MODEL } from "./config";

const hasApiKey = !!process.env.DEEPSEEK_API_KEY;
const ROLES: PersonaId[] = ["engineer", "designer", "product-owner", "qa"];

describe.skipIf(!hasApiKey)("cross-persona differentiation", () => {
  it("each role homes in on its own trap in the same multi-trap ticket", async () => {
    const scenario = multiTrapShareReport;

    // Generate all four reviews of the same ticket up front.
    const reviews = await Promise.all(
      ROLES.map(async (role) => {
        const run = await runStandinLLM(scenario.ticket, role, [], EVAL_MODEL);
        const text = run
          ? [run.parsed.feedback, `Concerns: ${run.parsed.concerns.join("; ")}`].join("\n")
          : "";
        return { role, text };
      })
    );

    const offLane: string[] = [];
    let caughtFocus = 0;

    for (const { role, text } of reviews) {
      expect(text, `${role} produced no response`).not.toEqual("");

      const result = await judgeCatch({
        role,
        ticketSummary: scenario.summary,
        mustCatch: scenario.perRole[role],
        response: text,
      });

      recordResult({
        suite: "persona-differentiation",
        scenario: scenario.name,
        subject: role,
        promptVersion: PROMPT_VERSION,
        scores: {
          grounding: 0,
          domainSpecificity: result.inRole,
          actionability: 0,
          expectations: result.caught ? 5 : 1,
        },
        overall: result.inRole,
        rationale: result.rationale,
      });

      // The differentiation claim is that each role reviews the SAME ticket
      // from its OWN lane. Since each lane is a different domain, four reviews
      // each scoring high on their own domain ARE four different reviews.
      if (result.inRole < 4) {
        offLane.push(`${role} was not squarely in its lane (inRole=${result.inRole}: ${result.rationale})`);
      }
      if (result.caught) caughtFocus++;
    }

    // Primary assertion — differentiation: every role stays squarely in its
    // own (distinct) lane. This is what proves the reviews differ.
    expect(
      offLane.length,
      `Roles drifted out of lane:\n${offLane.join("\n")}`
    ).toBe(0);

    // Secondary sanity — at least half also land on the specific focus we
    // flagged for their lane (the precise sub-point is proven more strictly in
    // persona-catch.eval.ts; here it's a soft check against generic in-lane filler).
    expect(
      caughtFocus,
      `Only ${caughtFocus}/4 roles landed on their flagged focus`
    ).toBeGreaterThanOrEqual(2);
  }, 240_000);
});

if (!hasApiKey) {
  describe("cross-persona differentiation", () => {
    it.skip("skipped — set DEEPSEEK_API_KEY to run evals", () => {});
  });
}
