# Concilium Brand Resources

Brand strategy, voice, and visual identity for Concilium. These docs are the
source of truth for how Concilium presents itself — in the product UI, the
README, marketing pages, and generated imagery.

The visual system is the **Claude Design** brand that shipped on 2026-06-10: a
warm, human, light identity — cream canvas, warm ink, a terracotta-coral action
color, and a four-color persona palette. Tokens live in `src/app/globals.css`.

## Contents

| Doc | What it covers |
| --- | --- |
| [brand-strategy.md](./brand-strategy.md) | Positioning, brand pillars, taglines, audience, "we are / we are not" |
| [voice-and-tone.md](./voice-and-tone.md) | Vocabulary, writing principles, do/don't examples for UI and marketing copy |
| [visual-identity.md](./visual-identity.md) | Palette (mapped to live CSS tokens), typography, logo direction, persona colors |
| [imagegen-style-guide.md](./imagegen-style-guide.md) | Reusable prompts for generating on-brand imagery with external image models |
| [assets/](./assets/) | Logo concept SVGs and other brand assets |

## The one-sentence brand

**Concilium is software by consensus** — every ticket has a council of seats
(Engineer, Designer, Product Owner, QA), every seat is held by an AI stand-in
until a human claims it, and nothing builds until the council agrees.

## How to use these docs

- **Writing UI copy?** Start with [voice-and-tone.md](./voice-and-tone.md) —
  especially the vocabulary table. Use "seat", "stand-in", "Mediator",
  "consensus" consistently; don't invent synonyms.
- **Styling a component?** [visual-identity.md](./visual-identity.md) maps
  brand colors to the CSS variables in `src/app/globals.css`. Use the tokens,
  never raw hex.
- **Generating marketing/illustration assets?**
  [imagegen-style-guide.md](./imagegen-style-guide.md) has locked style
  prompts so output stays consistent across models and sessions.
