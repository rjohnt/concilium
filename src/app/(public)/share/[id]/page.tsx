/**
 * /share/[id] — public, read-only view of a ticket's council.
 *
 * The artifact-as-advertisement surface: anyone with the link sees the
 * consensus debate and the build artifacts without signing in. No app
 * chrome, no auth — a standalone page that doubles as a referral (every
 * shared link ends in "convene your own council").
 *
 * Server-rendered straight from the SQLite source of truth so the page
 * unfurls with real Open Graph metadata on Slack / X / Discord.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { getTicket } from "@/lib/server-db";
import { checkConsensusThreshold } from "@/lib/consensus-threshold";
import { generateAgentPrompt } from "@/lib/agent-prompt";
import { normalizeSeats } from "@/lib/seats";
import CopyPromptButton from "./CopyPromptButton";
import type { PersonaId, Ticket, TicketStatus } from "@/lib/types";
import styles from "../share.module.css";

// Reads the SQLite source of truth per request — never statically prerendered.
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/* Presentation meta                                                   */
/* ------------------------------------------------------------------ */

const PERSONA: Record<PersonaId, { label: string; color: string; emoji: string }> = {
  engineer: { label: "Engineer", color: "var(--persona-eng-500)", emoji: "⚙️" },
  designer: { label: "Designer", color: "var(--persona-des-500)", emoji: "🎨" },
  "product-owner": { label: "Product Owner", color: "var(--persona-prod-500)", emoji: "📋" },
  qa: { label: "QA", color: "var(--persona-res-500)", emoji: "🧪" },
};

const PERSONA_ORDER: PersonaId[] = ["engineer", "designer", "product-owner", "qa"];

const STATUS_META: Record<TicketStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "var(--text-faint)" },
  "in-review": { label: "In review", tone: "var(--persona-prod-500)" },
  consensus: { label: "Consensus", tone: "var(--success-500)" },
  building: { label: "Building", tone: "var(--coral-500)" },
  done: { label: "Done", tone: "var(--success-500)" },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ */
/* Metadata — make the link unfurl                                     */
/* ------------------------------------------------------------------ */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ticket = await getTicket(id);
  if (!ticket) {
    return { title: "Council not found · Concilium" };
  }
  const { progress } = checkConsensusThreshold(ticket);
  const description =
    ticket.buildReport?.consensusSummary?.trim() ||
    ticket.description?.trim() ||
    `A four-seat council refining "${ticket.title}" — ${Math.round(progress * 100)}% to consensus.`;
  return {
    title: `${ticket.title} · Concilium council`,
    description,
    openGraph: {
      title: `${ticket.title} · Concilium council`,
      description,
      type: "article",
    },
    twitter: { card: "summary", title: ticket.title, description },
  };
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function ShareNav() {
  return (
    <nav className={styles.nav}>
      <Link href="/welcome" className={styles.brand}>
        <img src="/brand/logo-mark.svg" width={26} height={26} alt="" />
        <b>Concilium</b>
      </Link>
      <Link href="/signup" className={`${styles.btn} ${styles.btnPrimary}`}>
        Convene your own
        <ArrowRight size={15} />
      </Link>
    </nav>
  );
}

function NotFound() {
  // QA's edge case from the hero demo: an expired link explains itself.
  return (
    <div className={styles.page}>
      <ShareNav />
      <main className={styles.wrap}>
        <div className={styles.empty}>
          <span className={styles.emptyMark}>
            <Sparkles size={22} />
          </span>
          <h1>This council has wrapped</h1>
          <p>
            The shared link has expired or the ticket is no longer public. The conversation may have
            moved on — but you can always convene a fresh one.
          </p>
          <Link href="/signup" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}>
            Start a council
            <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    </div>
  );
}

function ConsensusBar({ ticket }: { ticket: Ticket }) {
  const { progress, reached, threshold } = checkConsensusThreshold(ticket);
  const pct = Math.round(progress * 100);
  const approved = ticket.approvals.length;
  return (
    <div className={styles.consensus}>
      <div className={styles.consensusHead}>
        <span>{reached ? "Consensus reached" : "Reaching consensus"}</span>
        <span className={styles.consensusCount}>
          {approved} / {PERSONA_ORDER.length} seats · {pct}%
        </span>
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{
            width: `${pct}%`,
            background: reached ? "var(--success-500)" : "var(--coral-500)",
          }}
        />
        <span
          className={styles.threshold}
          style={{ left: `${Math.round(threshold * 100)}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

function Seats({ ticket }: { ticket: Ticket }) {
  const seats = normalizeSeats(ticket.seats);
  return (
    <div className={styles.seats}>
      {PERSONA_ORDER.map((pid) => {
        const meta = PERSONA[pid];
        const seat = seats[pid];
        const approved = ticket.approvals.includes(pid);
        const occupant =
          seat.occupant === "human" ? seat.claimedByLabel || "Human" : "AI stand-in";
        return (
          <div
            key={pid}
            className={styles.seat}
            style={{ "--seat-color": meta.color } as React.CSSProperties}
          >
            <span className={styles.seatAvatar} aria-hidden>
              {meta.emoji}
            </span>
            <div className={styles.seatBody}>
              <div className={styles.seatLabel}>{meta.label}</div>
              <div className={styles.seatOccupant}>{occupant}</div>
            </div>
            <span
              className={`${styles.seatStatus} ${approved ? styles.seatApproved : ""}`}
              title={approved ? "Approved" : "Pending"}
            >
              {approved ? <Check size={14} strokeWidth={3} /> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Debate({ ticket }: { ticket: Ticket }) {
  const entries = [...ticket.feedback].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  if (entries.length === 0) {
    return (
      <div className={styles.debateEmpty}>The council hasn&rsquo;t weighed in on this one yet.</div>
    );
  }
  return (
    <div className={styles.debate}>
      {entries.map((f) => {
        const meta = PERSONA[f.personaId];
        const isAi = (f.source ?? "human") === "ai-standin";
        return (
          <div key={f.id} className={styles.msg} style={{ "--msg-color": meta.color } as React.CSSProperties}>
            <span className={styles.msgAvatar} aria-hidden>
              {meta.emoji}
            </span>
            <div className={styles.msgBody}>
              <div className={styles.msgHead}>
                <span className={styles.msgName}>{meta.label}</span>
                <span className={isAi ? styles.tagAi : styles.tagHuman}>
                  {isAi ? "AI stand-in" : "Human"}
                </span>
                {f.approved && (
                  <span className={styles.msgApproved}>
                    <Check size={12} strokeWidth={3} /> approved
                  </span>
                )}
              </div>
              <div className={styles.msgText}>{f.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BuildSection({ ticket }: { ticket: Ticket }) {
  const report = ticket.buildReport;
  if (!report) return null;

  const lists: { title: string; items: string[] }[] = [
    { title: "Requirements", items: report.requirements ?? [] },
    { title: "Design decisions", items: report.designDecisions ?? [] },
    { title: "QA criteria", items: report.qaCriteria ?? [] },
  ].filter((l) => l.items.length > 0);

  const inlineArtifacts = (report.artifacts ?? []).filter(
    (a) => a.type === "diff" || a.type === "log" || a.type === "file-list"
  );

  return (
    <section className={styles.build}>
      <div className={styles.sectionHead}>
        <h2>The build</h2>
        <span className={styles.buildStatus} data-status={report.status}>
          {report.status}
        </span>
      </div>

      {report.consensusSummary && <p className={styles.buildSummary}>{report.consensusSummary}</p>}

      {lists.map((l) => (
        <div key={l.title} className={styles.buildList}>
          <h3>{l.title}</h3>
          <ul>
            {l.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      ))}

      {report.implementationPlan && (
        <div className={styles.buildList}>
          <h3>Implementation plan</h3>
          <p className={styles.buildPlan}>{report.implementationPlan}</p>
        </div>
      )}

      {inlineArtifacts.length > 0 && (
        <div className={styles.artifacts}>
          <h3>Artifacts</h3>
          {inlineArtifacts.map((a) => (
            <details key={a.id} className={styles.artifact}>
              <summary>
                <span className={styles.artifactType}>{a.type}</span>
                {a.label}
              </summary>
              <pre>{a.content}</pre>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await getTicket(id);

  if (!ticket) {
    return <NotFound />;
  }

  const status = STATUS_META[ticket.status];

  return (
    <div className={styles.page}>
      <ShareNav />
      <main className={styles.wrap}>
        <header className={styles.header}>
          <div className={styles.headMeta}>
            <span className={styles.ticketId}>{ticket.id}</span>
            <span className={styles.statusPill} style={{ "--pill": status.tone } as React.CSSProperties}>
              {status.label}
            </span>
            <span className={styles.headDate}>Updated {formatDate(ticket.updatedAt)}</span>
          </div>
          <h1>{ticket.title}</h1>
          {ticket.description && <p className={styles.lead}>{ticket.description}</p>}
        </header>

        <ConsensusBar ticket={ticket} />
        <Seats ticket={ticket} />

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>The debate</h2>
          </div>
          <Debate ticket={ticket} />
        </section>

        {ticket.feedback.length > 0 && (
          <section className={styles.agent}>
            <div className={styles.agentCopy}>
              <h2>Take this spec to your agent</h2>
              <p>
                Copy the council-refined spec as a ready-to-paste prompt for your coding agent —
                Claude Code, Cursor, or anything else.
              </p>
            </div>
            <CopyPromptButton prompt={generateAgentPrompt(ticket)} />
          </section>
        )}

        <BuildSection ticket={ticket} />

        <section className={styles.cta}>
          <h2>Give your next ticket a council</h2>
          <p>
            Four AI stand-ins — Engineer, Designer, Product Owner &amp; QA — refine the ticket before
            anything gets built. Claim the seats you can cover; the stand-ins hold the rest.
          </p>
          <Link href="/signup" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}>
            Convene your council
            <ArrowRight size={16} />
          </Link>
          <div className={styles.ctaNote}>Free to try · no card · bring your own keys</div>
        </section>
      </main>
    </div>
  );
}
