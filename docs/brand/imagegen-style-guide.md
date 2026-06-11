# Image-Gen Style Guide

How to generate on-brand imagery with external image models (Gemini image
models, FLUX, etc.) so output stays consistent across tools and sessions.

> **Most "imagery" in Concilium is composed UI, not generated art.** The warm
> Claude Design system leans on persona avatars, council threads, and soft
> color — not photos or illustration. Reach for image-gen only for the rare
> marketing illustration or empty-state flourish, and keep it warm and human.

## Division of labor

| Asset | Tool | Notes |
| --- | --- | --- |
| Logo / wordmark | **Never image-gen for finals.** | The council mark is hand-tuned SVG in `public/brand/`. Generate explorations only. |
| Hero & marketing illustration | Gemini image models (quality, text adherence) | Prefer composed UI (persona avatars, council thread cards) over generated scenes. Iterate style locally on FLUX first to save spend. |
| OG / social share images | Either, with locked prompt | 1200×630; keep text out of the image, overlay type in code. |
| Persona portraits (4 stand-ins) | Gemini, batch with one prompt + persona swap | Same framing/style across all four; each tinted by its seat color. |
| Empty-state art | FLUX local | Low stakes, high iteration. |

## The locked style prompt

Prepend this to every marketing-illustration generation. Do not freestyle the
style portion — only the subject changes.

```text
Warm, soft, hand-drawn vector illustration with rounded organic shapes and
gentle flat color. Cream background (#FCFAF6), warm-ink linework (#2B221C,
soft brown-black, never pure black). Accent palette used sparingly and only
where it carries meaning: terracotta coral (#E85D34) for the focal "action"
element; persona hues — pine (#1E9C86), iris (#7A57D1), amber (#D9962A),
sky (#2F82C7) — for the four collaborators. Warm, even, studio-soft light.
Friendly, collaborative, optimistic mood. No text, no lettering, no
watermarks. Negative: photorealism, 3D render, harsh gradients, neon, cold
blue tints, dark/slate backgrounds, busy patterns, grain, sci-fi.
```

Then append the subject, e.g.:

- *Hero:* "Subject: four collaborators of different colors gathered around a
  warm round table, working together on a shared document, one coral element
  in focus."
- *Stand-in feature:* "Subject: an open seat at a warm council table with a
  soft, friendly translucent figure settling into it, welcoming posture."
- *Build moment:* "Subject: a small shared artifact lifting off the table with
  a soft coral glow, the four collaborators looking on."

## Persona portrait prompt

```text
Warm, friendly character illustration, rounded soft shapes, three-quarter
view, cream background, warm-ink linework, a single accent of the seat's
color on one garment detail, studio-soft light, no text. Subject: [PERSONA].
```

| Persona | Seat color | Subject line |
| --- | --- | --- |
| Engineer | pine `#1E9C86` | "a maker holding a small bridge model and a wrench" |
| Designer | iris `#7A57D1` | "an artisan holding a drafting pen and a folded paper form" |
| Product Owner | amber `#D9962A` | "a navigator holding a compass and a short scroll of priorities" |
| QA | sky `#2F82C7` | "a keen-eyed inspector holding a magnifying lens over a small gem" |

## Workflow

1. **Iterate style locally** (free, private): FLUX via the local `mflux`
   setup — run the locked prompt + subject, 4–8 seeds, pick composition.
2. **Generate finals** on Gemini image models with the winning subject line.
3. **Post-process:** crop to target aspect, overlay any text in
   code/Figma (never baked into the image), export PNG + WebP into
   `public/brand/`.
4. **Record the prompt** used for each shipped asset in a sidecar
   `<asset>.prompt.txt` so it can be regenerated or extended later.

## Consistency checks before shipping an asset

- [ ] Warm cream ground (#FCFAF6), never dark/slate or pure white
- [ ] Warm-ink linework (#2B221C), not pure black
- [ ] Coral reserved for the one focal "action" element
- [ ] Persona hues only on persona/collaborator elements
- [ ] Warm, soft, studio light — friendly and human, no cold blue
- [ ] No baked-in text
- [ ] Subject expresses a council concept (seats, shared table, collaborators)
