# Plan: Fix Failing Tests + Build Consensus Room View

## Phase 1: Fix failing tests (baseline)
1. **Sidebar.test.tsx** — line 346 expects `svg.text-deep` class on GitBranch icon, but actual component uses `text-white` (icon is inside a `bg-gold` div). Fix: change test expectation to match the component's actual class.
2. **acceptance-DEV-54.test.tsx** — 3 tests fail only when run in full suite due to `vi.doMock` isolation issues. Fix: add `vi.unmock('@/lib/store')` / `vi.resetModules()` in beforeEach of integration describe blocks to prevent mock leakage.

## Phase 2: Build "Consensus Room" feature
A dedicated full-screen collaborative review view. This is the core multiplayer innovation — personas weighing in side by side.

### What it includes:
- **New route**: `/consensus/[ticketId]` — full-screen consensus dashboard
- **Side-by-side persona cards**: each persona's feedback, concerns, recommendations visible at once
- **Real-time progress**: consensus meter that updates when feedback is added
- **Quick feedback**: inline submission from the consensus view for fast persona switching
- **Navigate from ticket detail** via a "Consensus Room" button

### Components:
- `src/app/consensus/[id]/page.tsx` — route page
- `src/components/ConsensusRoom.tsx` — main dashboard component
- `src/components/PersonaFeedbackCard.tsx` — individual persona feedback card
- `src/components/QuickFeedbackForm.tsx` — inline feedback form per persona

### Integration:
- Link from ticket detail page to consensus room
- Back-link from consensus room to ticket detail
- Store integration (reads/writes feedback via existing store functions)

## Phase 3: Deploy to Railway
```bash
cd ~/projects/concilium && railway up --service concilium-web
```

## Phase 4: Commit and push
```bash
git add -A && git commit -m "feat: consensus room view + test fixes" && git push origin feature/DEV-54
```
