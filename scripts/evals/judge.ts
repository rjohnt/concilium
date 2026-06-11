/**
 * LLM-as-judge for persona prompt evals.
 *
 * Scores a generated response against scenario expectations on a 1–5 scale
 * per dimension. Uses the same DeepSeek client as production code.
 */

import { callDeepSeek, DEEPSEEK_PRO_MODEL } from "@/lib/llm";

export interface JudgeScores {
  /** Is the response grounded in THIS ticket vs generic filler? */
  grounding: number;
  /** Does it sound like the specific role's domain expertise? */
  domainSpecificity: number;
  /** Could a teammate act on the recommendations today? */
  actionability: number;
  /** Does it satisfy the scenario's seeded expectations? */
  expectations: number;
}

export interface JudgeResult {
  scores: JudgeScores;
  /** Mean of all dimensions. */
  overall: number;
  rationale: string;
}

const JUDGE_SYSTEM_PROMPT = `You are a strict evaluator of AI-generated stakeholder feedback in a software ticketing tool. You score responses on a 1-5 scale per dimension. A 3 is "acceptable", 5 is "couldn't ask for better", 1 is "useless or wrong". You penalize generic filler hard: feedback that could apply to any ticket scores at most 2 on grounding. Return ONLY valid JSON.`;

export async function judgeResponse(input: {
  role: string;
  ticketSummary: string;
  expectations: string[];
  response: string;
}): Promise<JudgeResult> {
  const userPrompt = [
    `## Context`,
    `Role under evaluation: ${input.role}`,
    `Ticket: ${input.ticketSummary}`,
    ``,
    `## Scenario Expectations`,
    input.expectations.map((e, i) => `${i + 1}. ${e}`).join("\n"),
    ``,
    `## Response To Evaluate`,
    `"""`,
    input.response,
    `"""`,
    ``,
    `Score the response. Respond with JSON (no markdown, no code fences):`,
    `{`,
    `  "grounding": 1-5,`,
    `  "domainSpecificity": 1-5,`,
    `  "actionability": 1-5,`,
    `  "expectations": 1-5,`,
    `  "rationale": "Two or three sentences explaining the scores"`,
    `}`,
  ].join("\n");

  const llmResponse = await callDeepSeek({
    systemPrompt: JUDGE_SYSTEM_PROMPT,
    userPrompt,
    expectJson: true,
    model: DEEPSEEK_PRO_MODEL,
  });

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(llmResponse.content);
  } catch {
    const jsonMatch = llmResponse.content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[1].trim());
  }

  const clamp = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 1;
  };

  const scores: JudgeScores = {
    grounding: clamp(parsed.grounding),
    domainSpecificity: clamp(parsed.domainSpecificity),
    actionability: clamp(parsed.actionability),
    expectations: clamp(parsed.expectations),
  };

  const overall =
    (scores.grounding + scores.domainSpecificity + scores.actionability + scores.expectations) / 4;

  return {
    scores,
    overall,
    rationale: String(parsed.rationale ?? "").trim(),
  };
}
