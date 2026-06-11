# Concilium Eval Strategy

**Goal: maximize the effectiveness of each persona agent in its role.** The
product's core promise is that an AI stand-in holding the Engineer, Designer,
Product Owner, or QA seat catches what a competent human in that role would
catch — and that the Mediator genuinely moves a ticket toward consensus. Evals
are how we know that promise holds, how we improve the prompts that deliver
it, and how we decide when to switch models. This document is the strategy;
`scripts/evals/` is the implementation; `/evals` in the app is the dashboard.

---

## 1. Why evals are the product's load-bearing wall

Concilium's differentiation is *trustworthy* AI stakeholders. A stand-in that
produces generic, interchangeable feedback is worse than no stand-in: it
launders a rubber-stamp through the consensus mechanism and triggers builds on
specs that a real designer or QA would have blocked. Three failure modes
threaten this, and each maps to a measurable property:

| Failure mode | What it does to the product | Property we measure |
|---|---|---|
| **Convergence** — all four roles drift toward the same "good feedback" | Consensus becomes 4× one opinion; role seats are theater | *Differentiation*, *in-lane score* |
| **Miss** — a role fails to catch the problem only it would catch | Bad specs reach the build stage; the costliest defects ship | *Targeted catch rate* |
| **Rubber-stamping** — agents approve to be agreeable | The 75% threshold stops meaning anything | *Approval calibration* (catch scenarios are built so the correct answer is "withhold approval") |

Improving these numbers is improving the product: every point of catch rate is
a class of defect intercepted at the cheapest possible stage (spec time), and
every point of differentiation is a real second opinion added to consensus.

## 2. Methodology: a three-layer pyramid

We follow the now-standard practice of layering cheap deterministic checks
under expensive model-judged evals, with product telemetry on top (cf.
Husain 2024; Anthropic's guidance on defining success criteria before
building evals).

### Layer 1 — Deterministic construction tests (every `npm test`, no API key)

Before asking whether agents *behave* distinctly, we assert they are
*constructed* distinctly. `src/lib/__tests__/persona-charters.test.ts` verifies
each role's composed system prompt contains its own lens vocabulary
(designer → accessibility/empty/loading/error; engineer → schema/scale/
migration; PO → metric/MVP/opportunity-cost; QA → acceptance/edge/regression),
that lanes don't bleed pairwise, and that every charter defers to the other
roles. This is behavioral-testing-style coverage of the prompt layer itself
(in the spirit of CheckList, Ribeiro et al. 2020): fast, free, and run in CI
on every change, so a careless prompt edit can't silently de-differentiate
the agents.

### Layer 2 — LLM-judged scenario evals (`npm run evals`, requires key)

The core of the strategy. Each suite runs the **real production code path**
(`runStandinLLM`, `runMediatorLLM`) against fixture tickets with *seeded,
known-answer properties*, then grades the output with an LLM judge
(LLM-as-judge: Zheng et al. 2023; rubric-style grading: G-Eval, Liu et al.
2023).

- **`persona-catch`** — *the headline metric.* Each ticket hides exactly one
  problem that one role is uniquely responsible for, written so the other
  roles would plausibly wave it through (a "tidy-up" button that bulk-deletes
  irreversibly; a "simple" related-items panel with an unbounded query; a
  prestige dashboard with no metric; "cosmetic" relative timestamps full of
  timezone traps). The judge answers two questions: did the role *clearly and
  specifically* raise that issue (`caught`), and is the feedback squarely in
  the role's domain (`inRole`, 1–5)? Seeding the ground truth keeps the judge
  honest — it verifies presence of a known issue rather than freely opining,
  which is where LLM judges are weakest.
- **`persona-differentiation`** — all four roles review the *same* multi-trap
  ticket; each must stay squarely in its own lane (inRole ≥ 4 for all four).
  Four high in-lane scores on four different domains *is* the proof that the
  reviews differ — the property that makes consensus more than one opinion
  counted four times.
- **Lane-discipline control** — the Engineer reviews the Designer's pure-UX
  trap and must produce engineering-flavored feedback, not a UX review in
  disguise. A negative control: it catches prompts that achieve "catching"
  by making every agent comment on everything.
- **`standin`** — general quality floor: grounding (specific to *this*
  ticket, not generic filler), domain specificity, actionability, and
  engagement with prior stakeholders' feedback.
- **`mediator`** — the facilitator must detect a seeded engineer/designer
  conflict, propose a concrete compromise, and **not hallucinate conflicts
  that aren't there** (precision matters as much as recall for trust).

### Layer 3 — Online signals (roadmap)

Offline evals predict; production confirms. As real usage accumulates, the
plan is to track: how often humans **edit or contradict** stand-in feedback
(proxy for quality), how often a stand-in approval is later **overturned** by
a human taking the seat (approval calibration in the wild), change-request
rate against builds whose consensus included stand-ins vs. not, and
time-to-consensus. These become labeled scenarios: **every bad production
response is reproduced as a fixture with an expectation that would have
caught it**, so the scenario suite grows from real failures (the
"error-analysis first" loop practitioners consistently report as the highest-
value eval activity).

## 3. Judge design and known biases

LLM judges are convenient but biased; the design accounts for the documented
failure modes:

- **Known-answer grading.** Wherever possible the judge verifies a *seeded*
  property (`mustCatch`) rather than scoring open-endedly. Binary
  `caught` + bounded `inRole` beats a free-floating 1–10 "quality" score.
- **Stronger, fixed grader.** Generation uses the production model; judging
  uses a stronger model (`CONCILIUM_EVAL_JUDGE_MODEL`, default
  `deepseek-v4-pro`), held **fixed across comparisons** so scores stay
  comparable when the model-under-test changes.
- **Cross-family judging (caveat).** Judges favor their own family's outputs
  (self-preference: Panickssery et al. 2024). Today both sides are DeepSeek;
  when we benchmark non-DeepSeek candidates, the judge must be cross-family
  or results sanity-checked by hand.
- **No pairwise position bias.** We grade pointwise against rubrics, not
  pairwise A/B, so position bias (Wang et al. 2023; Zheng et al. 2023)
  doesn't apply.
- **Verbosity guard.** The judge prompt instructs that vague gestures do NOT
  count as catching; rationales are recorded so a human can spot-audit any
  score (every record stores the judge's rationale).
- **Variance.** LLM judges are noisy. Thresholds are set with headroom
  (catch must be true; in-lane ≥ 3 for catch, ≥ 4 for differentiation), the
  differentiation suite tolerates judge variance on the *focus* sub-check but
  not on lane discipline, and trends on the dashboard matter more than any
  single run.

## 4. Versioning and comparability

Two axes change over time and must never be conflated:

- **`PROMPT_VERSION`** (`src/lib/persona-prompts.ts`) — bumped on any charter
  or prompt change. The improvement loop: run evals → edit charters → bump →
  re-run → compare versions. Charters (`persona-charters.ts`) are the
  primary tuning surface: mandate, lens, pushBackOn, approval bar, and the
  load-bearing `defersTo` that keeps lanes from bleeding.
- **`CONCILIUM_EVAL_MODEL`** — the model under test. Benchmarking a new
  model is one command against the *identical* scenario suite:
  `CONCILIUM_EVAL_MODEL=<model> npm run evals`.

Every result is stamped with (model, judge model, prompt version, suite,
scenario, subject, scores, rationale, timestamp) and persisted to **both**
local JSONL (`scripts/evals/results/`, gitignored) and the **`eval_results`
table in Supabase** — which is what makes the `/evals` dashboard's
performance-over-time view possible across machines and CI runs.

## 5. Cadence and gating

| When | What runs | Gate |
|---|---|---|
| Every `npm test` / CI | Layer 1 deterministic tests | Hard fail on prompt de-differentiation |
| Any PR touching charters/prompts/scenarios | `npm run evals` (full) with bumped `PROMPT_VERSION` | Catch = 100%, in-lane ≥ threshold; paste scorecard in the PR |
| Evaluating a new model | `CONCILIUM_EVAL_MODEL=<m> npm run evals` | Compare on `/evals` or `npm run evals:report`; switch only if ≥ current model on catch + in-lane |
| Periodic (cron, roadmap) | Full suite on the production model | Drift detection — provider-side model updates show up as score drops |

Costs are bounded: the full suite is ~12 generation + ~12 judge calls
(a few cents at current DeepSeek pricing), so "run it on every prompt PR" is
affordable by design.

## 6. How this maximizes agent effectiveness

The loop that actually improves the agents:

1. **Observe** a weak number (dashboard row or a bad real-world response).
2. **Reproduce** it as a scenario with a seeded expectation (regression net).
3. **Tune the charter** — sharpen the lens, add a pushBackOn, tighten
   `defersTo` — not the shared boilerplate. Per-role failures get per-role
   fixes.
4. **Bump `PROMPT_VERSION`, re-run, compare** — accept only improvements that
   don't regress other suites (the deterministic layer catches accidental
   de-differentiation for free).
5. Periodically **re-benchmark models**; the scenario suite is the constant,
   models and prompts are the variables.

The end state (roadmap, deliberately after scores are trusted): a scheduled
loop that runs evals, asks an LLM to propose charter revisions when a
dimension underperforms, re-evals the candidate, and opens a PR with the
before/after scorecard.

## 7. Current baseline

`deepseek-v4-flash` @ `PROMPT_VERSION 2026-06-11.1`, judge `deepseek-v4-pro`
(live run, 2026-06-11): targeted-catch **4/4 caught** (designer, PO, engineer,
QA — all in-lane 5/5) + lane-discipline control passed; differentiation **4/4
in-lane**; stand-in quality 5/5; mediator 1/1. See `/evals` for the living
version of this table.

## References

- Zheng et al., *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena*, NeurIPS 2023. arXiv:2306.05685 — LLM-as-judge agreement with humans; position/verbosity biases.
- Liu et al., *G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment*, EMNLP 2023. arXiv:2303.16634 — rubric/chain-of-thought judging.
- Ribeiro et al., *Beyond Accuracy: Behavioral Testing of NLP Models with CheckList*, ACL 2020 — capability-targeted test cases; the model for our seeded-trap scenarios.
- Liang et al., *Holistic Evaluation of Language Models (HELM)*, 2022. arXiv:2211.09110 — multi-metric, scenario-based evaluation rather than single scores.
- Wang et al., *Large Language Models are not Fair Evaluators*, 2023. arXiv:2305.17926 — position bias in pairwise judging.
- Panickssery et al., *LLM Evaluators Recognize and Favor Their Own Generations*, 2024. arXiv:2404.13076 — self-preference bias; why cross-family judging matters.
- Chiang & Lee, *Can Large Language Models Be an Alternative to Human Evaluation?*, ACL 2023 — where LLM judges do/don't track human judgment.
- Anthropic, *Define your success criteria* & *Create strong empirical evaluations* (docs.anthropic.com) — criteria-first eval design; prefer known-answer grading.
- OpenAI, *Evals* framework (github.com/openai/evals) — registry-of-scenarios pattern; model-graded eval templates.
- Husain, *Your AI Product Needs Evals* (2024, hamel.dev) — error-analysis-driven eval growth; the three-layer (assertion / human / LLM-judge) framing this strategy adapts.
