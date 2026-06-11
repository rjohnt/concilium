# Visual Identity

## Concept

**"A well-lit studio, not a cold dashboard."** Warm, soft, and tactile
surfaces where a council of collaborators gathers around a shared table. The
one confident accent is a friendly terracotta coral; each persona owns a color
that runs through the whole product. Crisp, characterful type keeps it modern
and human.

> **Status note — the warm system is canonical.** Concilium shipped the
> **Claude Design** system on 2026-06-10: a fresh, warm, light identity (cream
> canvas, warm ink, terracotta-coral primary, a four-color persona palette).
> This replaced the earlier indigo/slate "MagicPath" values. The palette below
> documents the system **as it ships today** in `src/app/globals.css`. The
> previous "dark parchment" and indigo directions are retired; their logo
> explorations are kept under [assets/](./assets/) as history only.

## Palette

Brand colors are defined as CSS variables in `src/app/globals.css` and
exposed through `tailwind.config.js`. **Always use tokens, never raw hex.**
The system is **light-canonical**; a derived warm-dark theme exists for
`[data-theme="dark"]` but the brand presents in light.

### Core (warm neutrals + the action accent)

| Token | Value | Role |
| --- | --- | --- |
| `--warm-50` (= `--background` / `bg-app`) | `#FCFAF6` | The canvas — cream page ground |
| `--warm-100` (= `surface-raised` / `sidebar`) | `#F7F1E8` | Sand panels, sidebar, alternating sections |
| `--warm-150` (= `bg-hover`) | `#F1E9DC` | Hover wash |
| `--warm-200` (= `border-subtle`) | `#E8DCCB` | Hairline borders |
| `--warm-300` (= `border-strong`) | `#D8C7B0` | Stronger dividers |
| `--surface-card` | `#FFFFFF` | Card surfaces on cream |
| `--coral-500` (= `--primary`) | `#E85D34` | **The one accent that means "act."** Primary buttons, links, focus rings, highlight underlines |
| `--coral-400` | `#F07E5C` | Primary hover (lighten) |
| `--coral-600` | `#CF4A28` | Primary press |
| `--coral-100` / `--coral-50` | `#FCE2D8` / `#FEF2EC` | Coral tint surfaces |
| `--ink-900` (= `text-heading`) | `#2B221C` | Headlines — a warm brown-black, never pure `#000` |
| `--ink-700` (= `text-body`) | `#4B3F35` | Body text |
| `--ink-500` (= `text-muted`) | `#6E6053` | Secondary text |
| `--ink-400` (= `text-faint`) | `#8C7C6C` | Muted / placeholder |

### Semantic (status only)

| Token | Role |
| --- | --- |
| `--success-500` `#2E9E6B` | Healthy / complete |
| `--warning-500` `#D9962A` | Caution |
| `--danger-500` `#CB3A2A` | Destructive / blockers |
| `--info-500` `#2F82C7` | Informational |

Semantic colors are warm-leaning and used **only** for status — never as
decorative accents. The single "act" color is coral; everything that means
*agreement / progress / primary action* expresses through it.

### Persona seat colors — the signature device

Each seat owns one fixed color used consistently across avatars, badges, seat
ownership, progress, and timelines. A reader should be able to scan **who** by
color alone. Each has 50/100 tints for soft backgrounds.

| Seat | Hue | Token (500) | Glyph (Lucide) |
| --- | --- | --- | --- |
| Engineer | Pine | `--persona-eng-500` `#1E9C86` | `Code` |
| Designer | Iris | `--persona-des-500` `#7A57D1` | `PenTool` |
| Product Owner | Amber | `--persona-prod-500` `#D9962A` | `Compass` |
| QA | Sky | `--persona-res-500` `#2F82C7` | `Microscope` |

Persona colors are for persona things only — avatars, seat badges, who-did-what
indicators. Don't borrow them for generic UI accents.

## Typography

- **Display:** **Bricolage Grotesque** (weights 600–800) — characterful and
  warm. Headlines, the wordmark, big confident moments. Sentence case with
  negative tracking; a period for a confident beat ("Give every project a
  council.").
- **Body / UI:** **Hanken Grotesk** (400–700) — humanist, highly legible, set
  at 1.5–1.65 line height for reading.
- **Mono:** **JetBrains Mono** (400–600) — code, metadata, timestamps, IDs, and
  **eyebrows** (uppercase, wide tracking — "MEET THE COUNCIL", "// seat:
  engineer"). This is where the technical edge lives.

All three load via `next/font` in `src/app/layout.tsx`
(`--font-bricolage` / `--font-hanken` / `--font-jetbrains`), surfaced through
the `--font-display` / `--font-sans` / `--font-mono` tokens and the Tailwind
`font-display` / `font-sans` / `font-mono` families.

## Shape, shadow & motion

- **Corner radii** are friendly and rounded: inputs/cards at `--radius-md`/`lg`
  (13–18px), big surfaces at `--radius-xl`/`2xl` (24–32px), all buttons and
  chips fully **pill** (`--radius-pill`). Avatars are circular.
- **Shadows** are soft and **warm-tinted** (rgba of the ink brown, not
  gray-black), five steps `--shadow-xs` → `--shadow-xl`. Resting cards use
  `sm`; hover lifts to `lg`. No inner shadows.
- **Borders** are hairline `1px` in warm tones. Cards lean on soft shadow + a
  hairline. Accent cards add a 3px colored **top** rule — never a left-only
  colored border.
- **Motion** is gentle and springy: `--ease-out` for most things,
  `--ease-spring` (a slight friendly overshoot) for toggles/thumbs. Durations
  120–340ms. Press states squish to ~0.985. Respect `prefers-reduced-motion`.
- **Focus** is a 3px soft coral ring (`--shadow-focus`), never a hard outline.

## Logo

The shipping mark is the **council mark** — three persona pebbles (coral, iris,
pine) meeting at a dark hub, representing collaborators convening at a table.
The mark and the product's idea (a council gathering) are the same shape.

Files (canonical, in [`public/brand/`](../../public/brand/), mirrored in
[assets/](./assets/) for reference):

- `logo-mark.svg` — the council mark (primary).
- `logo-wordmark.svg` — mark + "Concilium" in Bricolage Grotesque.
- `logo-mark-mono.svg` — single-color (`currentColor`) for stamps and tight
  spots.

Rules:
- The mark must work in a single color before any color version.
- Final logo lives as hand-tuned SVG. Image-gen models are for *exploration
  only* — never ship a raster mark.
- The retired `logo-consensus-ring.svg`, `logo-seal.svg`, and `logo-quorum.svg`
  in [assets/](./assets/) are earlier explorations from the indigo direction;
  keep for history, don't ship.

## Iconography & illustration

- **Icon set:** **Lucide** — rounded-join, 2px-stroke, open outline icons.
  Their friendly geometry matches the warm humanist tone. Stroke weight 2,
  round caps/joins, sized 14–22px. Each persona seat has a fixed glyph (see the
  persona table above).
- **No emoji in the icon system** — emoji is allowed only as a rare expressive
  flourish inside persona/chat dialogue.
- **Backgrounds:** mostly flat warm color — **no photographic hero imagery, no
  busy patterns, no mesh gradients**. Alternating sections use cream ↔ sand.
  The one decorative move: soft, blurred **persona-colored glow "blobs"** behind
  dark CTA panels (low opacity, heavy blur), used once or twice, never
  everywhere.
- **In-product "imagery" is composed UI** — persona avatars and council threads,
  not photos. See [imagegen-style-guide.md](./imagegen-style-guide.md) for the
  rare cases where generated illustration is appropriate.

## Applied checklist

When adding a brand surface (OG image, README header, landing section):

- [ ] Warm cream/sand ground, not white-on-gray or a dark chamber
- [ ] One coral accent moment, used for the *act / agreement* concept
- [ ] Persona colors only for persona things
- [ ] Bricolage in the headline, Hanken for body, mono for eyebrows/meta
- [ ] Pill buttons, hairline warm borders, soft warm-tinted shadows
- [ ] Sentence case everywhere — never Title Case UI
- [ ] Tagline: "Give every project a council." (hero) or "Software by
      consensus." (short) — see [brand-strategy.md](./brand-strategy.md)
