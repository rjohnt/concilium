# Plan: Feedback Notification Preferences (DEV-NEXT)

## Goal
Allow users to control which notifications they receive — mute certain persona types, notification categories, or specific events.

## Why
Users reported notification overload. The current system sends a notification for every feedback submission from every persona. Power users want to filter: "Only tell me when QA raises concerns" or "Mute build-started but keep build-completed."

## Implementation

### 1. Create `src/lib/notification-preferences.ts`
- Types: `NotificationPreference` map of NotificationType → boolean, and per-persona mute list
- Storage: localStorage with `concilium-notification-prefs` key
- API: `getPrefs()`, `setPrefs()`, `isNotificationAllowed(type, personaId?)`
- Change listeners for cross-tab sync

### 2. Integrate into `notifications.ts`
- `addNotification()` checks `isNotificationAllowed()` before creating notifications
- Notification badge counts respect preferences
- Browser notifications also respect preferences

### 3. Create `NotificationPreferences` component
- Slide-over panel with toggle groups:
  - Per notification type toggles (feedback-submitted, consensus-reached, build-completed, etc.)
  - Per persona mute toggles (mute Engineer notifications, mute QA feedback, etc.)
- Accessible from the notification bell in prompt session header
- Styled with dark parchment theme

### 4. Wire into prompt session page
- Add "notification settings" gear icon next to bell
- Click opens preferences panel
- Persists immediately on change

### 5. Fix 3 failing tests in build.test.ts
- `store.getTicket` → `serverDb.getTicket` mock references

### 6. Update README

## Files to create/modify
- `src/lib/notification-preferences.ts` (NEW)
- `src/lib/notifications.ts` (modify — add preference checks)
- `src/components/NotificationPreferences.tsx` (NEW)
- `src/app/prompt/[id]/page.tsx` (modify — add preferences button)
- `src/app/api/__tests__/build.test.ts` (fix mocks)
- `README.md` (update status)
