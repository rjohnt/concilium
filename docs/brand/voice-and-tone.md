# Voice & Tone

Concilium sounds like a well-run council: confident, warm, a little
ceremonial, never bureaucratic. The ceremony is a wink, not a costume —
if a sentence would feel at home in a legal filing, lighten it; if it would
feel at home in a growth-hacking thread, slow it down.

## Vocabulary

Use these terms consistently. Don't invent synonyms — the vocabulary *is*
the brand.

| Term | Meaning | Don't say |
| --- | --- | --- |
| **seat** | A persona slot on a ticket (Engineer, Designer, PO, QA) | role, slot, position |
| **stand-in** | The AI holding a seat until a human claims it | bot, agent, AI assistant |
| **claim / release** | A human taking over / vacating a seat | assign, take, grab |
| **the Mediator** | The facilitator AI that synthesizes feedback | moderator, manager, orchestrator |
| **council** | The full set of seats on a ticket | team, squad, group |
| **consensus** | The approval threshold that triggers a build | sign-off, LGTM, quorum* |
| **verdict** | The council's recorded decision on a ticket | decision, result |
| **living ticket** | A ticket that evolves through deliberation | thread, doc |

\* "quorum" is acceptable in marketing prose for variety, but the product UI
always says "consensus".

## Writing principles

1. **The council acts; the tool serves.** Prefer "The council reached
   consensus" over "Concilium approved your ticket."
2. **Stand-ins are colleagues, not features.** "The QA stand-in flagged two
   edge cases" — not "AI-generated QA feedback is available."
3. **Builds are earned.** Never imply the build is instant magic; it is the
   consequence of agreement. "Consensus reached — building" is a cause and
   an effect.
4. **Plain verbs, occasional ceremony.** One ceremonial word per sentence,
   maximum. "The council convenes" is good; "The esteemed council hereby
   convenes its deliberations" is parody.

## Do / don't examples

| Context | ✅ Do | ❌ Don't |
| --- | --- | --- |
| Empty dashboard | "No tickets before the council yet." | "Nothing here yet! 🚀 Create your first ticket!" |
| Seat claim | "You now hold the Engineer seat." | "Role assigned successfully." |
| Stand-in activity | "The Designer stand-in weighed in." | "AI feedback generated." |
| Consensus event | "Consensus reached. The build begins." | "Approval threshold met. Build job queued." |
| Build failure | "The build fell short. The council can revise and rebuild." | "Error: build failed. Please try again." |
| Error (generic) | "Something went wrong on our side — your deliberations are safe." | "An unexpected error occurred." |
| Marketing CTA | "Convene your council." | "Get started for free today!" |

## Tone by surface

- **Product UI:** warmest and plainest. Ceremony only at moments of meaning
  (consensus, build completion, seat claims).
- **Marketing site:** full council voice. Metaphor can lead.
- **Docs / README:** neutral-technical; vocabulary table still applies, but
  drop the ceremony.
- **Errors:** zero ceremony. Be human, be clear, never blame the user.
