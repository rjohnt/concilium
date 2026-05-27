# Next Feature Plan — Run 1 (2026-05-26)

## Context
Greenfield project. Only README.md exists. Need to bootstrap the entire application.

## What We're Building
**Foundation: Ticket Dashboard + Persona-Aware Detail View**

The core multiplayer concept requires a place where stakeholders see tickets, open them, and contribute from their persona's perspective. This run builds the shell:

1. Bootstrap Next.js 14 + TypeScript + Tailwind
2. Define data models (Ticket, Persona, FeedbackEntry)
3. Build ticket dashboard (list view with persona status indicators)
4. Build ticket detail page with persona tabs/panels
5. Persona configuration (Engineer, Designer, Product Owner, QA) with expertise descriptions
6. Feedback entry per persona (text-based for now, AI-mediated prompting next run)

## Out of Scope This Run
- AI-mediated prompting (needs API integration — next run)
- Consensus threshold logic
- Persistence (in-memory store for now)
- Authentication / multi-user

## Files to Create/Modify
- `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts` — project scaffold
- `src/app/layout.tsx`, `src/app/page.tsx` — root layout + dashboard
- `src/app/ticket/[id]/page.tsx` — ticket detail
- `src/lib/types.ts` — shared types
- `src/lib/store.ts` — in-memory ticket/feedback store
- `src/lib/personas.ts` — persona definitions
- `src/components/*` — UI components
- Update `README.md` with status

## Success Criteria
- `npm run dev` starts a working app
- Dashboard shows tickets with persona avatars
- Each ticket has a detail page where you can select a persona and leave feedback
- Feedback accumulates per ticket, per persona
