# Prompt Evals — the stand-in self-improvement loop

The AI stand-ins and the Mediator are only as good as their prompts in
`src/lib/persona-prompts.ts` and `src/lib/mediator-persona.ts`. This harness
measures those prompts so changes are driven by scores, not vibes.

## How it works

1. **Scenarios** (`scenarios.ts`) are fixture tickets with seeded properties —
   e.g. `conflictScenario` plants a real engineer/designer disagreement the
   Mediator must detect (and must not hallucinate beyond).
2. **Generation** — each eval case runs the real production code path
   (`runStandinLLM`, `runMediatorLLM`) against a fixture, hitting DeepSeek.
3. **Judging** (`judge.ts`) — a stronger model (DeepSeek Pro) scores the output
   1–5 on grounding, domain specificity, actionability, and scenario
   expectations. Below 3 on a required dimension fails the eval.
4. **Recording** (`record.ts`) — every result is appended to
   `results/<PROMPT_VERSION>.jsonl` so versions can be compared.

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
