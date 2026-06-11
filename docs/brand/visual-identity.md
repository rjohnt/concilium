# Visual Identity

## Concept

**"Council chamber meets modern dev tool."** Deliberate, composed surfaces
with one ceremonial accent; crisp contemporary type so it never reads as a
period costume.

> **Status note — indigo vs. parchment.** The original Concilium identity was
> "dark parchment" (true gold, cardinal, olive on a warm dark ground). The
> MagicPath design-system merge remapped the token *values* to an
> indigo/slate system while keeping the council token *names* (`gold`,
> `cardinal`, `olive`). This guide documents the palette **as it ships
> today**. Re-warming the palette toward true gold/parchment is an open
> brand decision — if taken, only `src/app/globals.css` values change; token
> names, components, and this doc's structure stay put.

## Palette

Brand colors are defined as CSS variables in `src/app/globals.css` and
exposed through `tailwind.config.js`. **Always use tokens, never raw hex.**

### Core (dark theme — the brand-canonical theme)

| Token | Value (dark) | Role |
| --- | --- | --- |
| `--background` / `deep` | `#0f172a` | The chamber — page ground |
| `--color-raised` | `#1e293b` | Raised surfaces, cards |
| `--color-gold` (= `--primary`) | `#6366f1` | **Consensus & approval.** Primary actions, progress toward consensus |
| `--color-gold-light` | `#818cf8` | Hover/active states of consensus elements |
| `--color-cardinal` | `#dc2626` | **Dissent & blockers.** Objections, destructive actions |
| `--color-olive` | `#059669` | Affirmation, healthy/complete states |
| `--color-blue-steel` | `#60a5fa` | Informational accents |
| `--color-ink-primary` … `ink-ghost` | foreground scale | Text hierarchy ("ink" on the page) |

Semantic rule of thumb: **gold = agreement, cardinal = objection,
olive = done/healthy, blue-steel = information.** Components should express
council meaning through these four, not through arbitrary accent colors.

### Persona seat colors

Each seat gets a stable accent so persona identity reads at a glance across
the dashboard, presence indicators, and feedback timeline:

| Seat | Token |
| --- | --- |
| Engineer | `blue-steel` |
| Designer | `gold-light` |
| Product Owner | `olive` |
| QA | `cardinal` (dimmed contexts: 60% opacity — QA flags risk, it isn't an error state) |

## Typography

- **UI / body:** Inter (current, keep). Workhorse, neutral.
- **Brand display (recommended addition):** a serif with ceremony —
  **Fraunces** or **Newsreader** — used *sparingly*: marketing headlines,
  the wordmark, build-report titles. One serif moment per view, maximum.
  This single pairing carries ~80% of the "council" feel.
- **Mono:** JetBrains Mono (current, keep) for code and build artifacts.

## Logo

Direction (concepts in [assets/](./assets/)):

1. **The Round Table / Consensus Ring** *(primary direction,
   `assets/logo-consensus-ring.svg`)* — a round table viewed from above,
   seats as marks around a ring. Strongest concept because the logo and the
   product's consensus-progress ring are the same shape: the mark *is* the UI.
2. **The Seal** (`assets/logo-seal.svg`) — wax-seal motif; consensus =
   sealed. Good for build-report stamps and "approved" moments in-product.
3. **The Quorum Mark** (`assets/logo-quorum.svg`) — abstract C formed by
   four arcs (four seats), gap closing as consensus nears.

Rules:
- The mark must work in a single color (ink or gold) before any duotone.
- Final logo lives as hand-tuned SVG. Image-gen models are for *exploration
  only* — never ship a raster mark.

## Iconography & illustration

- **In-product icons:** keep the existing line-icon system; council semantics
  come from color tokens, not decorative icons.
- **Marketing illustration:** engraved-line style (banknote/etching) —
  distinctive, consistent, and reliably generatable. See
  [imagegen-style-guide.md](./imagegen-style-guide.md) for the locked prompts.

## Applied checklist

When adding a brand surface (OG image, README header, landing section):

- [ ] Dark chamber ground (`deep`), not pure black
- [ ] One gold accent moment, used for the *agreement* concept
- [ ] Persona colors only for persona things
- [ ] Serif only in the headline, Inter everywhere else
- [ ] Tagline: "Software by consensus." unless the surface needs the long form
