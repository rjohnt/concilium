# Feature: Real-time Feedback Streaming in Prompt Sessions

**Impact:** High — this is the core multiplayer value prop. Currently sessions show who's present but don't stream feedback live between participants.

## What We'll Build

1. **`src/lib/feedback-stream.ts`** — A BroadcastChannel-based feedback streaming module that:
   - Broadcasts new feedback entries as they're submitted
   - Deduplicates by feedback ID
   - Provides a subscription API for components to listen
   - Auto-cleans stale listeners

2. **Update `SessionPrompt.tsx`** — Subscribe to the feedback stream and auto-append new feedback entries from other participants into the chat timeline in real-time. Show a live indicator.

3. **Update `store.ts` (`addFeedback`)** — After persisting, broadcast to the feedback stream channel so other session participants see it immediately.

4. **Update `SessionParticipants.tsx`** — Show a streaming-active indicator when other participants are actively submitting.

## Why This Matters

- The README lists "Real-time feedback streaming between session participants" as the top next item
- This makes the "multiplayer" experience truly collaborative
- Users see each other's contributions appear instantly without manual refresh
- Builds naturally on top of the existing BroadcastChannel infrastructure

## Files to Change
- `src/lib/` — new file `feedback-stream.ts`
- `src/components/SessionPrompt.tsx` — add streaming subscription
- `src/lib/store.ts` — broadcast after feedback submission
- `src/lib/types.ts` — optional streaming metadata
- README.md — update status
