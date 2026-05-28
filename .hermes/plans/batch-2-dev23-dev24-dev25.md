# Batch 2: DEV-23, DEV-24, DEV-25 — Implementation Plan

> **For Hermes:** Parallel worktrees + subagent-driven-development.

**Goal:** Process 3 backlog DEV tickets: version history/diff (DEV-23), persona prompt templates (DEV-24), dashboard sort/pagination (DEV-25).

---

## DEV-23: Prompt version history and diff view

**Objective:** Track versions of prompt artifacts across persona feedback, with diff view and restore capability.

**Files to create:**
- `src/components/VersionHistory.tsx` — sidebar panel showing version list
- `src/components/DiffViewer.tsx` — word-level diff renderer
- `src/lib/versioning.ts` — version data model and utility functions

**Files to modify:**
- `src/lib/types.ts` — add Version type, add versionHistory to Ticket
- `src/lib/store.ts` — add version snapshot on feedback submission
- `src/lib/personas.ts` — no changes needed
- `src/app/ticket/[id]/page.tsx` — add VersionHistory panel

**Approach:**
1. Add `PromptVersion` type to types.ts: `{ id, ticketId, versionNumber, content, personaId, createdAt, restoredFrom? }`
2. Create `versioning.ts` with functions: `snapshotFeedback(ticket, personaId)`, `getVersions(ticketId)`, `restoreVersion(ticketId, versionId)`
3. Wire into store.ts: after each `addFeedback()`, take a snapshot of the current prompt state
4. Create `DiffViewer.tsx` using a simple line-by-line diff (no external deps — compute diff manually)
5. Create `VersionHistory.tsx` — accordion-style list of versions with timestamps, persona, restore button
6. Add VersionHistory panel to the ticket detail page

---

## DEV-24: Persona system prompt templates

**Objective:** Editable prompt templates for each persona with CRUD UI.

**Files to create:**
- `src/components/PromptTemplateEditor.tsx` — edit prompt templates for each persona
- `src/lib/templates.ts` — default templates + variable interpolation

**Files to modify:**
- `src/lib/personas.ts` — add template management functions (getTemplate, setTemplate, resetToDefault)
- `src/lib/types.ts` — add template-related types if needed
- `src/components/Sidebar.tsx` — add link to template editor page (or make it a modal)
- `src/app/ticket/[id]/page.tsx` — link to edit template from persona indicator

**Approach:**
1. In `templates.ts`: store default prompt templates (moved from personas.ts), add `interpolateTemplate(template, variables)` function
2. Add `getDefaultTemplate(personaId)` and `getCustomTemplate(personaId)` that reads from localStorage
3. Create `PromptTemplateEditor.tsx`: select persona, view/edit template text, reset to default, save preference to localStorage
4. Add template editor to settings or accessible from the sidebar or ticket detail page
5. Wire into `mediator.ts`: use `getCustomTemplate()` instead of hardcoded `promptTemplate`

---

## DEV-25: Ticket dashboard with filters and sorting

**Objective:** Add sort controls and pagination to the existing dashboard.

**Files to modify:**
- `src/app/page.tsx` — add sort controls, pagination

**Approach:**
1. Add sort state: `sortBy: 'updatedAt' | 'createdAt' | 'priority' | 'title'`, `sortOrder: 'asc' | 'desc'`
2. Add sort UI: dropdown or row of sort buttons in the filter area
3. Apply sorting to filtered tickets in `useMemo`
4. Add pagination: `page: number`, `perPage: 20`
5. Slice the sorted results for pagination
6. Add page controls (Previous/Next, page numbers)

**Files already have:** status filters, priority filters, tag filters, persona filters, search bar, empty states.
