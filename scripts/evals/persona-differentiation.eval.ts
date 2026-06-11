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

const hasApiKey = !!process.env.DEEPSEEK_API_KEY;
const ROLES: PersonaId[] = ["engineer", "designer", "product-owner", "qa"];

describe.skipIf(!hasApiKey)("cross-persona differentiation", () => {
  it("each role homes in on its own trap in the same multi-trap ticket", async () => {
    const scenario = multiTrapShareReport;

    // Generate all four reviews of the same ticket up front.
    const reviews = await Promise.all(
      ROLES.map(async (role) => {
        const run = await runStandinLLM(scenario.ticket, role, []);
        const text = run
          ? [run.parsed.feedback, `Concerns: ${run.parsed.concerns.join("; ")}`].join("\n")
          : "";
        return { role, text };
      })
    );

    const failures: string[] = [];

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
        overall: result.caught ? result.inRole : 1,
        rationale: result.rationale,
      });

      if (!result.caught) {
        failures.push(`${role} did not home in on its trap (${result.rationale})`);
      }
    }

    // At least 3 of 4 roles must clearly land on their own trap. (One miss is
    // tolerated to absorb judge variance; a second indicates the roles aren't
    // differentiating.)
    expect(
      failures.length,
      `Too many roles missed their lane:\n${failures.join("\n")}`
    ).toBeLessThanOrEqual(1);
  }, 240_000);
});

if (!hasApiKey) {
  describe("cross-persona differentiation", () => {
    it.skip("skipped — set DEEPSEEK_API_KEY to run evals", () => {});
  });
}
