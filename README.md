# Concilium

**A multiplayer AI-assisted development workflow replacing JIRA's agile model.**

## Concept

Instead of throw-it-over-the-wall ticket workflows, Concilium creates a *living ticket* where stakeholders progressively shape a feature through AI-mediated collaboration:

1. **Multiplayer prompting session** — Engineer, Designer, Product Owner (and others) weigh in on a ticket over time
2. **Progressive refinement** — Each persona contributes from their expertise; the prompt/ticket evolves
3. **Consensus threshold** — When enough stakeholders approve, the system *builds* based on the combined feedback
4. **Self-improving** — Cron-driven autonomous feature development continually improves the product

## Personas

- **Engineer** — Feasibility, architecture, implementation approach
- **Designer** — UX, visual design, interaction patterns
- **Product Owner** — Priority, scope, business value
- **QA** — Edge cases, test scenarios, acceptance criteria
- (Extensible — add ops, security, accessibility, etc.)

## Stack (TBD)

- Web app — Next.js likely (matching existing toolchain)
- Backend — TBD
- AI integration — via Hermes Agent delegation

## Status

🏗️ Initial setup — self-improving feature development active.
