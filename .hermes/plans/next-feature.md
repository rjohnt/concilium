# Plan: Design System Uniformity + Prompt Session Fix

## Problem
The app has a beautiful dark parchment design system (deep/base/raised/elevated/overlay backgrounds, ink-primary/secondary/muted text, gold accent, border-subtle/visible borders) but several key components still use generic gray color classes (`bg-gray-900`, `text-gray-300`, `border-gray-800`, etc.).

This creates a noticeable visual inconsistency — the dashboard and ticket detail pages look polished, but modals and utility panels look like placeholder UI.

## Affected Components
1. **JoinSessionModal.tsx** — uses `bg-gray-950/90`, `text-gray-400`, `border-gray-800`, etc.
2. **BuildTrigger.tsx** — uses `bg-gray-900`, `border-gray-700`, `text-gray-300`, etc.
3. **BuildReport.tsx** — uses `bg-gray-900/60`, `border-gray-800`, `text-gray-400`, etc.

## Also Fix
4. **Prompt session page** — renders JoinSessionModal twice (one for initial join, one for switch). Simplify to a single modal with a `mode` prop.

## Implementation
1. Update JoinSessionModal → use design tokens (bg-deep, bg-raised, text-ink-primary, border-border-visible, gold accent)
2. Update BuildTrigger → use design tokens
3. Update BuildReport → use design tokens
4. Fix double-modal in prompt page
5. Build test to verify
6. Deploy to Railway
7. Commit and push
