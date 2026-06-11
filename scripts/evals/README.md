# Prompt Evals — the stand-in self-improvement loop

The AI stand-ins and the Mediator are only as good as their prompts in
`src/lib/persona-charters.ts`, `src/lib/persona-prompts.ts`, and
`src/lib/mediator-persona.ts`. This harness measures those prompts so changes
are driven by scores, not vibes.

## Suites

- **`standin.eval.ts`** — each persona gives grounded, in-role feedback on a
  fixture ticket (general quality).
- **`persona-catch.eval.ts`** — *targeted catch*. Each ticket hides a problem
  that exactly ONE role should catch, chosen so the other roles would wave it
  through: the Designer must flag a destructive bulk action with no
  confirmation, the Engineer an unbounded/non-scaling query, the Product Owner
  gold-plating with no metric, QA timezone/locale correctness edges. Proves a
  role's lens does real work. Includes a lane-discipline control (the Engineer
  on the Designer's UX trap stays engineering-flavored).
- **`persona-differentiation.eval.ts`** — one ticket with all four traps at
  once; each role must home in on its own. Proves the agents produce genuinely
  *different* reviews of the same input.
- **`mediator.eval.ts`** — the Mediator detects a seeded conflict and proposes a
  compromise without hallucinating others.

## How it works

1. **Scenarios** (`scenarios.ts`) are fixture tickets with seeded properties.
   `EvalScenario` carries free-form `expectations`; `CatchScenario` carries a
   single `mustCatch` issue for the role under test; `DifferentiationScenario`
   carries a `perRole` map of what each role should land on.
2. **Generation** — each case runs the real production path (`runStandinLLM`,
   `runMediatorLLM`) against a fixture, hitting DeepSeek.
3. **Judging** (`judge.ts`) — a stronger model (DeepSeek Pro) judges output.
   `judgeResponse` scores 1–5 on grounding/domain-specificity/actionability/
   expectations; `judgeCatch` decides `caught` (did it raise the specific
   issue) and `inRole` (1–5, is it in the role's lane). Below threshold fails.
4. **Recording** (`record.ts`) — every result is appended to
   `results/<PROMPT_VERSION>.jsonl` so versions can be compared.

## Deterministic companion (always runs, no key)

`src/lib/__tests__/persona-charters.test.ts` verifies — without the LLM — that
each role's composed system prompt actually contains its distinct lens
vocabulary and that lanes don't bleed. That's the always-on guardrail; the LLM
evals here are the deeper proof that the agents *behave* distinctly.

## Running

```bash
DEEPSEEK_API_KEY=... npm run evals
```

Without the key, all evals skip (so CI without secrets stays green).

## Comparing models over time

The harness is built to score the **same scenarios against different models** as
they ship, and keep the history. Two models are involved (`config.ts`):

- **`CONCILIUM_EVAL_MODEL`** — the model under test (generates the stand-in /
  mediator responses). Defaults to the production model (`deepseek-v4-flash`).
- **`CONCILIUM_EVAL_JUDGE_MODEL`** — the grader. Keep this **fixed** across
  comparisons so scores stay comparable (defaults to `deepseek-v4-pro`).

```bash
# Benchmark the default model
DEEPSEEK_API_KEY=... npm run evals

# Benchmark a different / newer model on the identical scenarios
DEEPSEEK_API_KEY=... CONCILIUM_EVAL_MODEL=deepseek-v4-pro npm run evals

# Tabulate every recorded run side by side
npm run evals:report
```

Every result is stamped with the model under test, the judge model, and
`PROMPT_VERSION`, and written to `results/<model>__<promptVersion>.jsonl` (so a
new model's run never clobbers another's). `npm run evals:report` reads them all
and prints a table — model × prompt-version × suite → caught-count, in-lane,
overall — which is how you watch a model regress or improve over time.

## The improvement loop

1. Run the evals; note weak rows in `npm run evals:report`.
2. Edit the charters/prompts in `src/lib/persona-charters.ts` /
   `persona-prompts.ts` / `mediator-persona.ts`.
3. **Bump `PROMPT_VERSION`** in `persona-prompts.ts`.
4. Re-run and compare versions (and models) side by side via the report.

Add a scenario whenever a stand-in or the Mediator produces a bad real-world
response: reproduce it as a fixture with an expectation that would have caught
it. The scenario suite is the regression net for prompt quality.

## Toward automation

The intended end state is a cron-driven loop: run evals nightly → when a
dimension underperforms, have an LLM propose a prompt revision → re-eval the
candidate → open a PR with the diff and the before/after scores. The pieces
here (versioned prompts, scenario fixtures, JSONL history) are the substrate
for that; the orchestration is deliberately left until the scores are trusted.
