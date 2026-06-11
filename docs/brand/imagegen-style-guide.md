# Image-Gen Style Guide

How to generate on-brand imagery with external image models (Gemini image
models, FLUX, etc.) so output stays consistent across tools and sessions.

## Division of labor

| Asset | Tool | Notes |
| --- | --- | --- |
| Logo / wordmark | **Never image-gen for finals.** | Generate explorations, rebuild the winner as hand-tuned SVG. |
| Hero & marketing illustration | Gemini image models (quality, text adherence) | Iterate style locally on FLUX first to save API spend. |
| OG / social share images | Either, with locked prompt | 1200×630; keep text out of the image, overlay type in code. |
| Persona portraits (4 stand-ins) | Gemini, batch with one prompt + persona swap | Same framing/style across all four. |
| Empty-state art | FLUX local | Low stakes, high iteration. |

## The locked style prompt

Prepend this to every marketing-illustration generation. Do not freestyle the
style portion — only the subject changes.

```text
Engraved line illustration in the style of fine banknote etching,
single-weight ink lines, cross-hatching for shading, on a deep
slate-indigo ground (#0f172a). Single accent color: soft indigo glow
(#6366f1) used sparingly on one focal element. No text, no lettering,
no watermarks. Composed, symmetrical, ceremonial but modern.
Negative: photorealism, 3D render, gradients, neon, sci-fi,
fantasy armor, busy backgrounds.
```

Then append the subject, e.g.:

- *Hero:* "Subject: a round council table viewed from slightly above, four
  empty chairs, one chair glowing with the accent color, a beam of light on
  the table center."
- *Stand-in feature:* "Subject: an empty chair at a council table with a
  softly glowing translucent figure seated in it, patient posture."
- *Build moment:* "Subject: a wax seal being pressed onto a document, the
  seal glowing with the accent color."

## Persona portrait prompt

```text
Engraved portrait bust in fine etching style, facing three-quarter view,
on deep slate-indigo ground, single indigo accent on one garment detail,
no text. Subject: [PERSONA].
```

| Persona | Subject line |
| --- | --- |
| Engineer | "a builder holding calipers and a small bridge model" |
| Designer | "an artisan holding a drafting compass and a folded paper form" |
| Product Owner | "a navigator holding a small astrolabe and a scroll of priorities" |
| QA | "a keen-eyed inspector holding a magnifying lens over a gem" |

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

- [ ] Ground color matches `deep` (#0f172a), not pure black
- [ ] Exactly one accent color, and it's the indigo `gold` token
- [ ] No baked-in text
- [ ] Etching style (lines/cross-hatch), not painterly or 3D
- [ ] Subject expresses a council concept (seats, table, seal, deliberation)
