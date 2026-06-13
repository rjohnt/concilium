# Concilium reel variants

## Series 4 — the heist (Ocean's-style)

v16/v17 share `council-post.js` (bloom/grain/CA pipeline + PMREM env) and the
council-kit crew figures with role props. Letterboxed, title-slam typography,
tense A-minor pulse beds.

| File | Cut | Length | The job |
| --- | --- | --- | --- |
| `concilium-heist.mp4` | The Heist | 27s | Crew intros (Mastermind / Safecracker / Artist / Lookout), laser-grid vault, Ada rappels to the coral diamond — "Plan the job. Execute together." |
| `concilium-getaway.mp4` | The Getaway | 27s | "The Concilium Job" title, street intros out of the fog, the crew loads the quad-logo van, light-trail exit — "In. Out. Shipped." |

Ten finished cuts of the council concept. Source compositions live in
[`marketing/variants/`](../variants/); re-render any of them with
`npx hyperframes render --quality high` inside its folder.

## Series 1 — the council table (shared scene)

v1–v5 share the config-driven scene in
[`marketing/_shared/council-scene.js`](../_shared/council-scene.js)
(table, chairs, seated persona figures, consensus ring, light beam, motes).

| File | Cut | Length | Mood |
| --- | --- | --- | --- |
| `concilium-chamber.mp4` | The flagship story | 31s | Cinematic dark chamber that blooms warm at consensus |
| `concilium-daylight.mp4` | Site-matched product cut | 24s | Bright studio cream, calm pacing |
| `concilium-midnight.mp4` | Bold brand piece | 20s | Dark throughout, glow-lit council, dark lockup |
| `concilium-verdict.mp4` | Fast social cut | 15s | Punchy, question → council → verdict |
| `concilium-seat.mp4` | Intimate ident | 12s | One glowing held seat, then it's claimed |

## Series 2 — bespoke 3D worlds (one scene per cut)

v6–v10 each have their own Three.js scene (`variants/v*/assets/vendor/scene.js`)
with multi-shot camera direction — tracking shots, crane-ups, dolly-ins.

| File | Cut | Length | The world |
| --- | --- | --- | --- |
| `concilium-journey.mp4` | The ticket's journey | 26s | A glowing 3D ticket is tracked through the chamber, stamped by every seat, and flies through the build portal |
| `concilium-rises.mp4` | The build rises | 24s | A tower of instanced blocks assembles from the consensus ring under orbiting persona lights; crane-up shot |
| `concilium-voices.mp4` | A thousand opinions | 22s | 6,000 persona-colored particles swirl as a storm, then resolve into the seated council |
| `concilium-dawn.mp4` | The rotunda at dawn | 20s | Columned rotunda, god-ray shaft, long shadows; walk-in dolly between the columns |
| `concilium-blueprint.mp4` | Decided, then built | 26s | The whole room starts as a wireframe plan and solidifies into reality at consensus |

## Series 3 — grand worlds, new persona models, role props

v11–v15 use the builders in
[`marketing/_shared/council-kit.js`](../_shared/council-kit.js): three persona
model sets (lathe "lanterns", low-poly "faceted", and "crafts-folk" with arms),
parametric role props (wrench / brush / spec scroll / magnifier), and
`makeMark3D` — the exact `public/brand/logo-mark.svg` as 3D spheres. Lockups
inline the exact logo SVG, animated per-pebble.

| File | Cut | Length | Vibe & world |
| --- | --- | --- | --- |
| `concilium-concord.mp4` | Launch day | 22s | **Upbeat** — confetti plaza, rising lantern orbs, the giant 3D council mark assembling overhead (112bpm kick-driven bed) |
| `concilium-summit.mp4` | The summit | 28s | **Dramatic** — hexagonal platform above the clouds, aurora, starfield; camera climbs the cliff face (sub-drone bed) |
| `concilium-colossus.mp4` | The monument | 24s | **Monumental** — the logo at colossal scale rising from the dunes; tiny personas make the pilgrimage |
| `concilium-workshop.mp4` | Every craft | 22s | **Role props, warm-upbeat** — Engineer's wrench, Designer's brush, PO's scroll, QA's magnifier; product assembles mid-table |
| `concilium-procession.mp4` | The procession | 24s | **Role props, ceremonial** — crafts-folk carry their instruments down a torchlit banner hall to their seats; props raised at the verdict |

All 1920×1080 30fps h264+aac, faststart. Music is synthesized in-repo
(license-clean): pad progressions that cadence on each cut's consensus beat,
plus an upbeat recipe (kick pulse + plucked arp) and a dramatic recipe
(sub-drone + phrase booms) for Series 3.
