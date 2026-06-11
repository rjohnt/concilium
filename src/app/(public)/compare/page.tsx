import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X, Sparkles } from "lucide-react";
import styles from "./compare.module.css";

export const metadata: Metadata = {
  title: "Concilium vs Jira for AI-agent teams",
  description:
    "Jira was built for humans handing tickets to humans. Concilium is built for humans steering AI agents — a product team of AI stand-ins that refine the ticket, reach consensus, and build it.",
  alternates: { canonical: "/compare" },
};

/* ------------------------------------------------------------------ */

interface Row {
  dim: string;
  jira: string;
  concilium: string;
}

const ROWS: Row[] = [
  {
    dim: "The ticket",
    jira: "A static artifact thrown over the wall — context dies at every handoff.",
    concilium: "A living negotiation that builds itself once the stakeholders agree.",
  },
  {
    dim: "Empty seats",
    jira: "You cover every role yourself, or nobody does.",
    concilium: "An AI stand-in holds every unclaimed seat — Engineer, Designer, PO, QA.",
  },
  {
    dim: "Refinement",
    jira: "Manual grooming meetings; conflicts surface late, if at all.",
    concilium: "An AI Mediator reads the whole room, surfaces real conflicts, proposes compromises.",
  },
  {
    dim: "Reaching done",
    jira: "Someone decides it's ready and assigns it out.",
    concilium: "Approvals from humans and stand-ins count equally; 75% reaches consensus.",
  },
  {
    dim: "Spec → build",
    jira: "Hand the ticket to a developer and wait.",
    concilium: "The agreed consensus becomes the prompt; an agent builds it, artifacts attached.",
  },
  {
    dim: "Review loop",
    jira: "Comments on a PR, days later, with the context gone.",
    concilium: "Role-scoped change requests feed a rebuild with delta context.",
  },
  {
    dim: "Built for",
    jira: "Large human teams with established process.",
    concilium: "Solo founders & small teams steering AI coding agents.",
  },
  {
    dim: "Getting started",
    jira: "Procurement, admin, seats, configuration.",
    concilium: "Free to try, no card, bring your own keys.",
  },
];

function Nav() {
  return (
    <nav className={styles.nav}>
      <div className={styles.wrap}>
        <div className={styles.navIn}>
          <Link href="/welcome" className={styles.brand}>
            <img src="/brand/logo-mark.svg" width={26} height={26} alt="" />
            <b>Concilium</b>
          </Link>
          <Link href="/signup" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}>
            Start free
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function ComparePage() {
  return (
    <div className={styles.page}>
      <Nav />

      <header className={styles.hero}>
        <div className={styles.wrap}>
          <span className={styles.eyebrow}>
            <Sparkles size={14} /> Concilium vs Jira
          </span>
          <h1>
            Jira hands tickets between people.
            <br />
            <span className={styles.u}>Concilium helps you steer agents.</span>
          </h1>
          <p className={styles.lead}>
            Traditional trackers treat a ticket as a static thing to pass down a chain of humans.
            That model breaks when the &ldquo;team&rdquo; is you and a coding agent. Concilium gives
            every ticket a council — AI stand-ins for the roles you can&rsquo;t cover — that argues
            the work into shape, reaches consensus, and turns it into a build.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/signup" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}>
              Give your agent a product team
              <ArrowRight size={17} />
            </Link>
            <Link href="/welcome" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnLg}`}>
              See how it works
            </Link>
          </div>
        </div>
      </header>

      <section className={styles.tableSec}>
        <div className={styles.wrap}>
          <div className={styles.table}>
            <div className={`${styles.trow} ${styles.thead}`}>
              <div className={styles.cDim} />
              <div className={styles.cJira}>Jira &amp; friends</div>
              <div className={styles.cCon}>
                <img src="/brand/logo-mark.svg" width={20} height={20} alt="" />
                Concilium
              </div>
            </div>
            {ROWS.map((r) => (
              <div className={styles.trow} key={r.dim}>
                <div className={styles.cDim}>{r.dim}</div>
                <div className={styles.cJira}>
                  <X size={16} className={styles.xIcon} />
                  <span>{r.jira}</span>
                </div>
                <div className={styles.cCon}>
                  <Check size={16} className={styles.checkIcon} />
                  <span>{r.concilium}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.wedge}>
        <div className={styles.wrap}>
          <h2>Not a Jira killer. A product team for your agent.</h2>
          <p>
            You don&rsquo;t need more process — you need the roles a real team would bring to the
            table before code gets written. Concilium pushes back on the ticket the way a designer,
            a product owner, and QA would, so what your agent builds is the thing you actually meant.
          </p>
          <Link href="/signup" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}>
            Convene your first council
            <ArrowRight size={17} />
          </Link>
          <div className={styles.note}>
            <Check size={15} className={styles.checkIcon} /> Free to try · no card · bring your own
            keys
          </div>
        </div>
      </section>

      <footer className={styles.foot}>
        <div className={styles.wrap}>
          <div className={styles.footIn}>
            <Link href="/welcome" className={styles.brand}>
              <img src="/brand/logo-mark.svg" width={22} height={22} alt="" />
              <b>Concilium</b>
            </Link>
            <span className={styles.footCopy}>Software by consensus · © 2026 Concilium</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
