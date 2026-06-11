# Concilium growth & distribution review — June 2026

Status: reviewed 2026-06-10. Companion to the product roadmap in README.md.

## Core thesis

Concilium is **self-demonstrating**: the output of using it — four stakeholders
(human + AI stand-ins) arguing a ticket into shape, the Mediator brokering
conflicts, an agent building the result with artifacts attached — is inherently
watchable content. The growth strategy is built around that, plus one hard rule:

> **Don't run the megaphone until the viral surfaces exist.**

Wedge audience: solo founders and small teams already using AI coding agents,
pitched as "a product team for your agent," not as a Jira killer. The wedge
audience has no procurement process.

## The two gates before any advertising

1. **Real multi-user.** "Multiplayer" today is cross-tab BroadcastChannel. The
   single highest-leverage growth feature is finishing the Supabase migration,
   because it unlocks the invite: *"claim the Designer seat on my ticket"* is
   the natural-language form of a referral link.
2. **Public ticket share pages.** A read-only page showing the consensus debate
   and the build artifacts is the artifact-as-advertisement loop (what Loom
   links and Figma files did for those products).

## Distribution channels, in rough order of expected return

| Channel | Why it works for Concilium |
|---|---|
| Build in public | The repo builds itself (`DEV-XX` factory builds). Weekly post: idea → stand-in debate → consensus → agent build → artifact, with share link. Nobody else can show this loop; doubles as product QA. |
| No-signup playground | "Type an idea, watch 4 personas fight about it for 60s." Zero-friction top of funnel and the landing-page hero. Rate-limited; one LLM call per persona. |
| Show HN → Product Hunt | HN first: the agile-is-dead discourse runs the thread for you. Lead both with the playground + a 90s build-complete video. |
| AI-builder communities | Claude Code / Cursor / agent-dev Discords, r/SideProject, r/ClaudeAI, dev.to. Pitch the wedge story. |
| AI tooling newsletters | Ben's Bites, TLDR AI, Latent Space — they cover exactly this category; a working demo link does the selling. |
| SEO + GEO | Comparison pages ("Concilium vs Jira for AI-agent teams"). Track whether ChatGPT/Claude/Gemini surface Concilium for "Jira alternative for AI agents" queries. |

## Integrations ranked by traction value

Pattern to exploit: **integrations whose output is visible to people who don't
use Concilium yet.**

1. **GitHub App** — builds open real PRs (credibility unlock + Marketplace
   discovery + PR-footer visibility). Natural evolution of the `local-claude`
   executor behind the same `BuildExecutor` interface.
2. **Slack app** — consensus updates, stand-in feedback, Mediator conflict
   alerts. Slack is the daily re-entry point; retention is a growth feature.
3. **MCP server** — expose Concilium so any coding agent can file tickets,
   request consensus, and read specs. MCP registry = distribution aimed at the
   earliest adopters. "Agents filing tickets for agents, refereed by humans."
4. **Jira/Linear import** — import-only (never sync); steals the backlog and
   frames Concilium as the upgrade.
5. **Marketplaces + template gallery** (later) — GitHub Marketplace, Slack App
   Directory, shareable pre-scoped ticket templates as long-tail acquisition.

## Phased roadmap

### Phase 1 · weeks 1–4 — ship the viral surfaces
- [ ] Supabase multi-user (invite loop)
- [ ] Public ticket share pages (debates as demos)
- [ ] No-signup playground demo

### Phase 2 · weeks 5–8 — launch wave
- [ ] Show HN, then Product Hunt (lead with live demo)
- [ ] Build-in-public content engine (weekly self-build post)
- [ ] 90-second demo video (the build-complete moment)

### Phase 3 · weeks 9–16 — integrations as distribution
- [ ] GitHub App (builds → PRs)
- [ ] Slack app (daily re-entry)
- [ ] MCP server (for AI agents)
- [ ] Jira/Linear import (steal backlogs)

### Phase 4 · month 5+ — compounding channels
- [ ] GitHub Marketplace + Slack App Directory listings
- [ ] SEO/GEO comparison pages
- [ ] Template gallery (shareable workflows)

## One metric per phase

| Phase | Metric |
|---|---|
| 1 | Invites sent per active ticket |
| 2 | Playground → signup conversion |
| 3 | % of builds landing as PRs |
| 4 | Signups from organic search / marketplaces |

## Sequencing rationale

- Phase 1 before Phase 2 is non-negotiable: a launch spike onto a single-player
  demo converts to nothing; the same spike onto share links + invites seeds
  loops that outlive the traffic.
- Phase 3 integrations are ordered by visibility: GitHub PRs are seen by
  collaborators, Slack messages by the whole team, MCP listings by agent
  builders. Each puts Concilium in front of a non-user.
