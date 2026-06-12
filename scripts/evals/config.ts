/**
 * Eval configuration — the knobs that make models comparable over time.
 *
 * The whole point of the eval harness is to score the SAME scenarios against
 * DIFFERENT models as they come out, and keep the history. Two models matter:
 *
 *   - EVAL_MODEL — the model under test (generates the stand-in / mediator
 *     responses). Override per run to benchmark a new model.
 *   - JUDGE_MODEL — the grader. Keep this FIXED across comparisons so scores
 *     stay comparable; only change it deliberately (and note it — results are
 *     stamped with both models).
 *
 * Examples:
 *   npm run evals                                   # default model under test
 *   CONCILIUM_EVAL_MODEL=deepseek-v4-pro npm run evals
 *   CONCILIUM_EVAL_MODEL=some-new-model npm run evals
 *   npm run evals:report                            # compare runs side by side
 */

import { DEEPSEEK_MODEL, DEEPSEEK_PRO_MODEL } from "@/lib/llm";

/** The model being evaluated (generates responses). */
export const EVAL_MODEL = process.env.CONCILIUM_EVAL_MODEL || DEEPSEEK_MODEL;

/** The grader. Hold fixed across model comparisons. */
export const JUDGE_MODEL = process.env.CONCILIUM_EVAL_JUDGE_MODEL || DEEPSEEK_PRO_MODEL;
