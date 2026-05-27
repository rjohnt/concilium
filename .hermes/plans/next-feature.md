# Next Feature Plan — Run 2 (2026-05-27)

## Context
v0.1 has ticket CRUD, personas, consensus, and a prompt session UI. But the prompt session is manual text entry — the AI-mediated collaboration is missing.

## What We're Building
**AI-Mediated Prompting Pipeline** — The infrastructure that makes prompt sessions actually AI-assisted:

1. **`/api/prompt` POST route** — Accepts {ticketId, personaId, message}, runs through mediator, returns AI-refined response
2. **Mediator engine (`src/lib/mediator.ts`)** — Rules-based persona-aware response generator that:
   - Takes the persona's prompt template + ticket context
   - Analyzes user input against persona expertise areas
   - Generates structured feedback (concerns, recommendations, edge cases)
   - Produces follow-up questions to deepen conversation
   - Feels like a real AI conversation partner
3. **Enhanced SessionPrompt** — Calls `/api/prompt`, shows the AI-refined feedback, allows editing before submission
4. **Conversation threading** — Multiple exchanges per persona session (not just one-off)
5. **Session state tracking** — Track active sessions, rounds, persona turn order

## Out of Scope This Run
- Real AI API integration (needs keys — but the mediator is the right abstraction)
- Multi-user real-time collaboration
- WebSocket transport

## Files to Create/Modify
- `src/app/api/prompt/route.ts` — API route for AI-mediated prompting
- `src/lib/mediator.ts` — Mediator engine (rules-based for now, swappable for real AI)
- `src/components/SessionPrompt.tsx` — Enhanced to call API, show threading
- `src/lib/types.ts` — Add PromptSession, PromptRound, SessionMessage types
- `src/lib/store.ts` — Add session state management
- Update `README.md`

## Success Criteria
- Prompt session calls `/api/prompt` and gets a persona-aware response
- Response includes: formatted feedback, concerns, follow-up questions
- User can continue the conversation (multi-turn)
- Feedback accumulates and feeds into consensus
