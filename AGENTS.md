# AGENTS.md — Concilium

> **For AI agents working on this repo.** Read before touching any file.
> Updated: 2026-05-27. Keep 100–300 lines. Every time AI gets something wrong, add the rule.

---

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 6
- **Styling:** Tailwind CSS 3.4 + tailwindcss-animate + framer-motion
- **Icons:** Lucide React (prefer `@/lib/lucide` barrel export)
- **State:** In-memory store (`src/lib/store.ts`) with localStorage persistence (`src/lib/persistence.ts`)
- **Auth:** Supabase (SSR helpers in `src/lib/supabase.ts`, context in `src/lib/auth-context.tsx`)
- **Testing:** Vitest + @testing-library/react + jsdom
- **Lint:** ESLint 8 + eslint-config-next
- **Deploy:** Railway (`railway.json`)

## Key Commands

```bash
npm run dev      # localhost:3000
npm run build    # production build
npm run start    # production server
npm run lint     # ESLint
npm test         # vitest run
```

## Architecture Rules

### File Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── layout.tsx    # Root layout: Sidebar + AuthGuard + CommandPalette
│   ├── page.tsx      # Dashboard (ticket list)
│   ├── ticket/[id]/  # Ticket detail + feedback panel
│   ├── new/          # New ticket creation
│   ├── prompt/[id]/  # Multi-persona prompting session
│   ├── build/[id]/   # Build report viewer
│   ├── auth/         # Supabase auth callback
│   ├── login/ signup/# Auth pages
│   └── vin/          # Vehicle lookup tool
├── components/       # Reusable components (20+ components)
├── lib/              # Business logic, types, store, personas, consensus
├── hooks/            # Custom React hooks
└── middleware.ts      # Next.js middleware
```

### Component Patterns

- Components live in `src/components/`. One component per file.
- Use `@/components/ComponentName` for imports.
- Tailwind classes only. No CSS modules. No inline styles.
- Use `.card`, `.badge`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost` CSS component classes from `globals.css`.
- Framer Motion for page transitions (`PageTransition` wraps children in layout).

### State Management

- **All state via `src/lib/store.ts`.** Never read/write localStorage directly — use the store.
- Store auto-persists to localStorage (50ms debounce). Cross-tab sync via `storage` event.
- Ticket status flow: `draft → in-review → consensus → building → done`
- Personas: `engineer`, `designer`, `product-owner`, `qa` (defined in `src/lib/personas.ts`)
- Consensus threshold: 75% of personas must approve (3 of 4). Defined in `src/lib/consensus-threshold.ts`.

### Design System

- **Dark parchment theme.** Background hierarchy: `#1a1714` (deep) → `#211e1a` (base) → `#29251f` (raised) → `#302b24` (elevated) → `#3a352d` (overlay)
- **Gold accent:** `#c9a84c` (primary CTA, badges, active states)
- **Text hierarchy:** `#e8e4db` (primary), `#b8b2a6` (secondary), `#7a7468` (muted), `#4a4540` (ghost)
- **Semantic colors:** `cardinal` = `#b84545` (danger/overdue), `olive` = `#6b8f5e` (success), `blue-steel` = `#6b8fa8` (info)
- **Border:** `#2e2a24` (subtle), `#3d3830` (visible)
- **Fonts:** EB Garamond (headings), Inter (body), JetBrains Mono (code)

### TypeScript

- Strict mode ON. No `any` without explicit justification.
- All shared types in `src/lib/types.ts`. Import from `@/lib/types`.
- ID format: `TIX-XXX` for tickets, `FB-XXX` for feedback, `BLD-XXX` for build reports.
- Priority: Linear 0-4 scale (0=Urgent, 1=High, 2=Medium, 3=Low, 4=None).

## Don't-Do List

- **Do not** read/write localStorage directly — use the store (`src/lib/store.ts`).
- **Do not** invent new color values. Use the Tailwind theme from `tailwind.config.js`.
- **Do not** add new npm dependencies without explicit instruction.
- **Do not** modify `types.ts` without updating all consumers.
- **Do not** create API routes in `src/app/api/` without updating the store to use them.
- **Do not** change the consensus threshold (0.75) without discussion.
- **Do not** log raw auth tokens or Supabase keys.
- **Do not** use `any` in TypeScript.
- **Do not** skip tests for new features. Every new component gets a test file in `src/components/__tests__/`.

## Testing

- Vitest with jsdom environment. Config in `vitest.config.ts`.
- Setup in `vitest.setup.ts` (mocks for next/navigation, framer-motion, localStorage).
- Component tests: render + user interactions + accessibility.
- Store tests: state transitions + persistence + edge cases.
- Run: `npm test` or `npx vitest run`.
- Test files mirror source: `src/components/Foo.tsx` → `src/components/__tests__/Foo.test.tsx`.

## Common Pitfalls

1. **Context drift in component trees.** AuthGuard wraps everything. Make sure new pages work inside it.
2. **localStorage serialization.** Store uses JSON. Dates are ISO strings. Don't store `Date` objects directly.
3. **Sidebar spacing.** `md:ml-64` on main + `pt-14 p-8 md:pt-8` for mobile navbar.
4. **Framer Motion server-side.** PageTransition only renders client-side. Don't expect animations in SSR.
5. **Supabase environment.** `.env.local` not committed. Use `.env.local.example` for reference.
