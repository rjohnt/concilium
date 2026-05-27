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

## Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **State**: In-memory store (to be replaced with SQLite/Postgres)
- **AI integration**: Planned via Hermes Agent delegation for persona-mediated prompting

## Status

🏗️ **v0.3** — Design system uniformity + prompt session polish.

### What Works
- Ticket dashboard with persona status indicators and consensus progress bars
- Ticket detail page with stakeholder feedback panel
- Per-persona feedback entry (Engineer, Designer, PO, QA)
- Approval tracking and consensus visualization
- New ticket creation flow
- Seed data with realistic multi-persona feedback
- **AI-mediated prompting session** — write raw thoughts, DeepSeek V4 Flash mediator refines through persona lens
- **LLM-powered mediator** — DeepSeek V4 Flash-powered persona-aware response generation (concerns, recommendations, follow-ups)
- **`/api/prompt` route** — GET for session context, POST for mediation
- **Multi-turn conversation** — follow-up question chaining within a session
- **Consensus auto-build trigger** — auto-transitions draft→in-review→consensus→building→done
- **Dark parchment design system** — unified `ink-*`, `bg-*` (raised/elevated/deep), `gold`, `olive`, `cardinal`, `blue-steel` tokens across all components
- **Build report viewer** — `/build/[id]` page with structured requirements, design decisions, QA criteria

### Next Up
- Backend persistence (SQLite/Postgres replacing localStorage)
- Session-based multi-user collaboration (multiple real users weighing in simultaneously)
- Notification system for persona feedback triggers
- VIN lookup tool completion

## Development

```bash
npm run dev    # Start dev server on localhost:3000
npm run build  # Production build
npm run start  # Production server
```
