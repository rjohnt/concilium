# Batch 2: DEV-23, DEV-24 (DEV-25 already done)

> **DEV-25 status:** Already fully implemented — dashboard has status/priority/tag/persona filters, search, sorting, skeleton loading, empty states. Marking as Done.

## DEV-23: Prompt version history and diff view

**Objective:** Track versions of persona feedback and show a version history panel with diff comparison.

**Current state:** `DiffView` component exists (full LCS-based word diff) but isn't wired anywhere. No version tracking on feedback entries.

**Files to create:**
- `src/components/VersionHistory.tsx` — Version history sidebar/panel

**Files to modify:**
- `src/lib/types.ts` — add `version` number to FeedbackEntry, add `VersionEntry` type
- `src/lib/store.ts` — auto-increment version on each feedback submission
- `src/components/FeedbackPanel.tsx` — add version history toggle, show version indicator
- `src/app/ticket/[id]/page.tsx` — show version history alongside feedback

**Approach:**
1. Add `version: number` field to FeedbackEntry type (existing entries get version 1)
2. In store.ts `addFeedback()`, set version = (previous entries for this persona) + 1
3. Create VersionHistory component:
   - Lists all versions of a persona's feedback in chronological order
   - Click a version to diff it against the current version
   - Uses DiffView to show word-level changes
4. Wire into FeedbackPanel or ticket detail page as a collapsible "Version history" section per persona

## DEV-24: Persona system prompt templates

**Objective:** Editable prompt templates for each persona stored in localStorage.

**Current state:** Personas defined in `personas.ts` with hardcoded `promptTemplate` fields. No UI to edit them.

**Files to create:**
- `src/components/TemplateEditor.tsx` — Modal/panel for editing persona prompt templates
- `src/lib/templateStore.ts` — Store/manage custom templates in localStorage

**Files to modify:**
- `src/lib/types.ts` — add `PersonaTemplate` type with editable template fields
- `src/lib/personas.ts` — load templates from store, fall back to defaults
- `src/components/Sidebar.tsx` — add "Persona Templates" nav link or settings icon

**Approach:**
1. Create templateStore with localStorage persistence:
   - `getTemplate(personaId)` → returns custom template or default
   - `setTemplate(personaId, template)` → save to localStorage
   - `resetTemplate(personaId)` → revert to default
2. Add variable interpolation: `{{ticket.title}}`, `{{ticket.description}}`, `{{otherFeedback}}`
3. Create TemplateEditor component:
   - Persona selector tabs (Engineer, Designer, PO, QA)
   - Editable textarea for the prompt template
   - Variable hint buttons
   - Preview showing the template with sample data
4. Wire into Sidebar as a settings entry
