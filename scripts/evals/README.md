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

## The improvement loop

1. Run the evals; note weak dimensions in `results/<version>.jsonl`.
2. Edit the prompts in `src/lib/persona-prompts.ts` / `mediator-persona.ts`.
3. **Bump `PROMPT_VERSION`** in `persona-prompts.ts`.
4. Re-run and compare versions side by side.

Add a scenario whenever a stand-in or the Mediator produces a bad real-world
response: reproduce it as a fixture with an expectation that would have caught
it. The scenario suite is the regression net for prompt quality.

## Toward automation

The intended end state is a cron-driven loop: run evals nightly → when a
dimension underperforms, have an LLM propose a prompt revision → re-eval the
candidate → open a PR with the diff and the before/after scores. The pieces
here (versioned prompts, scenario fixtures, JSONL history) are the substrate
for that; the orchestration is deliberately left until the scores are trusted.
