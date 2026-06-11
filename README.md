# Concilium

**Multiplayer, AI-mediated ticket refinement — a living ticket that builds itself once the stakeholders agree.**

## The idea

Traditional agile tooling (Jira and friends) treats a ticket as a static
artifact thrown over the wall: someone grooms it, someone designs it, someone
builds it, context dies at every handoff. Concilium treats the ticket as a
**negotiation**: stakeholders in different roles shape its scope together, an
AI mediator keeps the conversation honest and moving, and when consensus is
reached the agreed spec becomes the prompt for an agent that builds the
feature. Stakeholders then review the build artifacts and iterate.

## Identity: humans + AI stand-ins

Every ticket has one **seat** per role — Engineer, Designer, Product Owner,
QA. Each seat is held by an **AI stand-in** until a human claims it:

- A solo founder gets a virtual product owner, designer, and QA who push back
  on the ticket before anything gets built.
- A full team claims all four seats and the AI steps back to mediation.
- Anything in between: humans claim the seats they can cover, the stand-ins
  cover the rest, and approvals from both count equally toward consensus.

The dashboard shows seat occupancy (humans vs AI stand-ins) across active
tickets at all times.

## The pipeline

```
draft → in-review → consensus → building → done
                        ↑                    │
                        └── change requests ─┘  (rebuild with delta context)
```

1. **Refine** — stakeholders (human or stand-in) submit role-scoped feedback;
   the AI mediator lens refines raw input through each persona's expertise.
2. **Facilitate** — the **Mediator**, a dedicated facilitator agent with its
   own system prompt, reads the whole session: it surfaces real conflicts
   between roles, proposes compromises, names gaps, and recommends the next
   action.
3. **Consensus** — when 75% of seats approve, the ticket is ready to build.
4. **Build** — a pluggable **build executor** turns the consensus into work:
   - `report` (default): LLM-generated build spec (requirements, design
     decisions, QA criteria, implementation plan)
   - `local-claude`: additionally drives a local Claude Code CLI in a
     sandboxed per-ticket git workspace; the diff, changed files, and run log
     attach to the ticket as **artifacts** (set `CONCILIUM_BUILD_EXECUTOR=local-claude`)
   - planned: Daytona / remote sandboxes behind the same interface
5. **Review loop** — stakeholders file role-scoped **change requests**
   against the completed build; a rebuild consumes them as delta context.

## Brand

Brand strategy, voice & tone, visual identity, and logo concepts live in
[docs/brand/](docs/brand/README.md). Tagline: **"Software by consensus."**

## Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 6
- **Styling**: Tailwind CSS 3.4 (MagicPath v2 light/indigo dashboard, dark
  parchment session surfaces)
- **State**: client store (`src/lib/store.ts`) with localStorage as a local
  cache, synced to a server data layer (`src/lib/server-db.ts`) that is an
  async facade over two backends — **Supabase Postgres** when configured
  (source of truth) or local **SQLite** as a zero-setup dev/CI fallback
  (`src/lib/db/`).
- **Auth**: Supabase (dev bypass when env vars are absent)
- **AI**: DeepSeek V4 Flash/Pro via `src/lib/llm.ts`; prompts versioned in
  `src/lib/persona-prompts.ts` + `src/lib/mediator-persona.ts`
- **Realtime**: `src/lib/realtime-transport.ts` — Supabase Broadcast
  (cross-user, over websocket) when configured, else BroadcastChannel
  (cross-tab). Powers presence, the feedback stream, and cross-tab sync. When
  Supabase is configured, the store also subscribes to Postgres Changes
  (`src/lib/postgres-sync.ts`) so other users' writes appear without a refresh.
- **Testing**: Vitest (`npm test`); LLM prompt evals (`npm run evals`, see
  `scripts/evals/README.md`)
- **Deploy**: Railway (`railway.json`)

## Development

```bash
npm run dev      # localhost:3000
npm run build    # production build
npm test         # unit tests
npm run evals    # LLM prompt evals (requires DEEPSEEK_API_KEY)
```

Env vars: `DEEPSEEK_API_KEY` (mediator/stand-ins/builds),
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (auth + realtime +
client reads), `SUPABASE_SERVICE_ROLE_KEY` (server-side Postgres data layer;
when absent the server uses local SQLite), `CONCILIUM_BUILD_EXECUTOR`,
`CONCILIUM_BUILD_WORKSPACE` (build executor).

## Roadmap

1. ~~Seat model: humans + AI stand-ins, role claim UI, occupancy dashboard~~ ✅
2. ~~Agentic stand-ins with eval harness; Mediator as dedicated facilitator~~ ✅
3. ~~Pluggable build executor (local Claude Code sandbox) + artifact review loop~~ ✅
4. ~~Supabase consolidation: Postgres as source of truth, Realtime (Broadcast +
   Postgres Changes) replacing BroadcastChannel, true multi-user sync~~ ✅
5. Objection-driven consensus: concerns as first-class blocking entities;
   consensus = no open blockers + required sign-offs
6. Richer artifacts: Playwright runs/recordings, deploy previews
7. Automated prompt-improvement loop on top of the eval harness
