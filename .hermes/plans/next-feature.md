# Next Feature Plan — Run 2 (2026-05-27)

## Context
v0.1 foundation is solid: dashboard, ticket detail, persona join flow, feedback entry, consensus bar.
The core innovation — AI-mediated persona prompting — hasn't been built yet.
We need to cross the gap from "fancy feedback form" to "AI-assisted multiplayer workflow."

## What We're Building
**AI-Powered Persona Feedback + Consensus → Build Pipeline**

### 1. AI-Mediated Prompting Sessions (API Route)
- `POST /api/sessions/[ticketId]/prompt` with `{ personaId }` 
- Returns AI-generated persona feedback in that persona's voice
- Template-driven based on persona prompt templates + ticket context
- Mock LLM implementation with clear interface (swap for real LLM later)
- Includes: generated feedback, approval stance, reasoning

### 2. Consensus Auto-Build Pipeline
- When all 4 personas approve → ticket transitions: in-review → consensus → building → done
- "Building" status has a visual progress indicator
- Auto-transition with timed build phase (simulated for now)

### 3. Session Timeline View
- Chronological feed of all persona feedback on the ticket detail page
- Grouped by persona with colored indicators
- Shows the "multiplayer conversation" unfolding

### 4. Prompt Library Refinement
- Sharper persona prompt templates
- Context injection (ticket title, description, existing feedback)

## Files to Create/Modify
- `src/app/api/sessions/[ticketId]/prompt/route.ts` — AI prompting endpoint
- `src/app/api/sessions/[ticketId]/build/route.ts` — build trigger endpoint  
- `src/components/SessionTimeline.tsx` — chronological feedback feed
- `src/components/BuildProgress.tsx` — build status animation
- `src/lib/store.ts` — add build trigger + auto-consensus logic
- `src/lib/personas.ts` — refined prompt templates with context
- `src/app/ticket/[id]/page.tsx` — integrate AI button + timeline + build UI
- `src/lib/types.ts` — add BuildStatus, Session types
- Update README

## Success Criteria
- User clicks "Generate AI feedback" for a persona → gets AI-drafted analysis
- When all personas approve → ticket auto-advances through consensus → building → done
- Session timeline shows the full conversation history
- `npm run build` succeeds
