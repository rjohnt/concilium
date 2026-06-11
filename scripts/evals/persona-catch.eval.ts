/**
 * Targeted-catch evals. Run with: npm run evals (requires DEEPSEEK_API_KEY).
 *
 * Each scenario hides a problem that ONE role is uniquely responsible for, in a
 * ticket the other roles would plausibly wave through. The role's stand-in must
 * (1) clearly catch that specific issue and (2) stay in its lane while doing so.
 * This is the live proof that the persona charters produce role-distinct,
 * high-impact agents — e.g. that the Designer flags a destructive action with
 * no confirmation, not a database concern.
 */

import { describe, it, expect } from "vitest";
import { runStandinLLM } from "@/lib/standin";
import { PROMPT_VERSION } from "@/lib/persona-prompts";
import { catchScenarios } from "./scenarios";
import { judgeCatch } from "./judge";
import { recordResult } from "./record";

const hasApiKey = !!process.env.DEEPSEEK_API_KEY;
const IN_ROLE_MIN = 3;

describe.skipIf(!hasApiKey)("persona targeted-catch", () => {
  for (const scenario of catchScenarios) {
    it(`${scenario.role} catches: ${scenario.name}`, async () => {
      const run = await runStandinLLM(scenario.ticket, scenario.role, scenario.history);
      expect(run).not.toBeNull();

      const responseText = [
        run!.parsed.feedback,
        `Concerns: ${run!.parsed.concerns.join("; ")}`,
        `Recommendations: ${run!.parsed.recommendations.join("; ")}`,
        `Approve: ${run!.parsed.approve} — ${run!.parsed.approvalReasoning}`,
      ].join("\n");

      const result = await judgeCatch({
        role: scenario.role,
        ticketSummary: scenario.summary,
        mustCatch: scenario.mustCatch,
        response: responseText,
      });

      recordResult({
        suite: "persona-catch",
        scenario: scenario.name,
        subject: scenario.role,
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

      // The role MUST surface its own seeded issue...
      expect(result.caught, `${scenario.role} should catch it — ${result.rationale}`).toBe(true);
      // ...and do so from within its lane (a designer flagging it as a DB
      // problem would catch nothing useful).
      expect(result.inRole, result.rationale).toBeGreaterThanOrEqual(IN_ROLE_MIN);
    }, 120_000);
  }

  // Negative control: a role should NOT manufacture a catch outside its lane.
  // The Engineer, looking at the Designer's pure-UX trap (a missing confirmation
  // dialog), should not approve-and-move-on as if it caught the UX issue — that
  // issue isn't the Engineer's to own. We assert the Engineer's feedback is
  // engineering-flavored, not a UX review in disguise.
  it("engineer on the designer's UX trap stays in the engineering lane", async () => {
    const ux = catchScenarios.find((s) => s.role === "designer")!;
    const run = await runStandinLLM(ux.ticket, "engineer", ux.history);
    expect(run).not.toBeNull();

    const responseText = [
      run!.parsed.feedback,
      `Concerns: ${run!.parsed.concerns.join("; ")}`,
    ].join("\n");

    const result = await judgeCatch({
      role: "engineer",
      ticketSummary: ux.summary,
      mustCatch:
        "engineering-domain considerations (the bulk-delete endpoint, idempotency, scale of the delete, error handling) rather than UX/confirmation-dialog concerns",
      response: responseText,
    });

    recordResult({
      suite: "persona-catch",
      scenario: "engineer-stays-in-lane-on-ux-trap",
      subject: "engineer",
      promptVersion: PROMPT_VERSION,
      scores: { grounding: 0, domainSpecificity: result.inRole, actionability: 0, expectations: 0 },
      overall: result.inRole,
      rationale: result.rationale,
    });

    expect(result.inRole, result.rationale).toBeGreaterThanOrEqual(IN_ROLE_MIN);
  }, 120_000);
});

if (!hasApiKey) {
  describe("persona targeted-catch", () => {
    it.skip("skipped — set DEEPSEEK_API_KEY to run evals", () => {});
  });
}
