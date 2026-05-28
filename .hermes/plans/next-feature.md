# Feature: SQLite Backend Persistence

## Problem
All data lives in client-side localStorage. API routes start with an empty in-memory store on every server restart. Railway deployments lose all state. Multi-user collaboration is impossible.

## Plan

### 1. Install better-sqlite3
- `npm install better-sqlite3 @types/better-sqlite3`

### 2. Create server-db.ts
- SQLite database at `data/concilium.db`
- Schema: tickets, feedback, build_reports tables
- CRUD operations matching the store.ts interface
- Auto-create tables + seed data on first run

### 3. Create API routes
- `GET /api/tickets` — list all tickets
- `POST /api/tickets` — create ticket
- `GET /api/tickets/[id]` — get single ticket
- `PATCH /api/tickets/[id]` — update ticket
- `DELETE /api/tickets/[id]` — delete ticket
- `POST /api/feedback` — add feedback to ticket
- `GET /api/feedback?ticketId=X` — get feedback for ticket

### 4. Update client store (store.ts)
- Keep localStorage for instant UI
- Add API sync: on every write operation, also POST/PATCH/DELETE via API
- On page load, attempt to fetch from API first, fall back to localStorage

### 5. Update existing API routes
- Update `/api/build` and `/api/prompt` to use server-db directly
- Remove dependency on client store in API routes

### 6. Update README

## Status
Planning phase — ready to build.
