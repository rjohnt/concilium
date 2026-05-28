# Next Feature: Real-time Session Presence & Notifications

## Why this is highest-impact
The core innovation of Concilium is multiplayer AI-assisted ticket collaboration. Currently, one user switches between personas in isolation. This feature makes it **actually multiplayer** — multiple users can be in a prompt session simultaneously, see each other, and get notified when others contribute.

## What we're building

### 1. Session Presence Manager (`src/lib/session-presence.ts`)
- BroadcastChannel-based presence tracking (separate channel from ticket sync)
- Each client generates a UUID on first load (stored in localStorage as `session-client-id`)
- When a user joins a prompt session, they broadcast: "Client X joined session Y as persona Z"
- Heartbeat every 30 seconds to show alive status
- Auto-remove stale participants (>60s since last heartbeat)
- Store tracks: `Map<clientId, { ticketId, personaId, joinedAt, lastHeartbeat, label? }>`

### 2. Session Participants UI (`src/components/SessionParticipants.tsx`)
- Shows all active participants in the current prompt session
- Each participant card shows: persona icon/name, "online" indicator, how long they've been here
- "Available personas" list shows unclaimed personas for quick-join
- Live-updates via BroadcastChannel listener

### 3. Inline Real-time Notifications (`src/lib/notifications.ts`)
- Simple notification store: `{ id, type, title, message, ticketId, timestamp, read }`
- Events: `feedback-submitted`, `consensus-reached`, `build-completed`, `persona-joined`
- In-app notification bell in the sidebar with unread count badge
- Browser Notification API integration (with permission prompt)

### 4. Integration
- Update `SessionPrompt` to notify when feedback is submitted
- Update prompt page to show real-time presence
- Sidebar shows notification badge
- Cross-tab: all of this syncs via BroadcastChannel

## Files to Create
- `src/lib/session-presence.ts` — Session presence manager
- `src/components/SessionParticipants.tsx` — Participants panel component
- `src/lib/notifications.ts` — Notification store and helpers

## Files to Modify
- `src/app/prompt/[id]/page.tsx` — Integrate presence + real-time updates
- `src/components/Sidebar.tsx` — Add notification bell/badge
- `src/lib/crossTabSync.ts` — Add session presence message types
