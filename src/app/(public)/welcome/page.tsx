import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import CouncilDemo from "./CouncilDemo";
import { PersonaAvatar, ROLE, ROLE_ORDER } from "./persona-kit";
import styles from "./welcome.module.css";
import DemoLightbox from "./DemoLightbox";
import CouncilChamber3D from "./CouncilChamber3D";

export const metadata: Metadata = {
  title: "Concilium — give every project a council",
  description:
    "Concilium puts AI personas — Engineer, Designer, Product Owner & QA — around your tickets. They weigh in; you steer; approvals reach consensus.",
};

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function Nav() {
  return (
    <nav className={styles.nav}>
      <div className={styles.wrap}>
        <div className={styles.navIn}>
          <div className={styles.navBrand}>
            <img src="/brand/logo-mark.svg" alt="" />
            <b>Concilium</b>
          </div>
          <div className={styles.navLinks}>
            <a href="#how-it-works">Product</a>
            <a href="#council">The council</a>
            <Link href="/compare">vs Jira</Link>
          </div>
          <div className={styles.navRight}>
            <Link href="/login" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}>
              Sign in
            </Link>
            <Link href="/signup" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}>
              Start free
              <span className={styles.btnIcon}>
                <ArrowRight size={15} />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <div>
          <span className={styles.heroEyebrow}>
            <Sparkles size={14} /> AI-mediated ticket consensus
          </span>
          <h1>
            Give every project a <span className={styles.u}>council.</span>
          </h1>
          <p className={styles.heroLead}>
            Concilium puts AI personas — Engineer, Designer, Product Owner &amp; QA — around your
            tickets. They weigh in; you steer; approvals reach consensus.
          </p>
          <div className={styles.heroCta}>
            <Link href="/signup" className={`${styles.btn} ${styles.btnLg} ${styles.btnPrimary}`}>
              Start a project
              <span className={styles.btnIcon}>
                <ArrowRight size={17} />
              </span>
            </Link>
            <DemoLightbox />
          </div>
          <div className={styles.heroNote}>
            <Check size={15} style={{ color: "var(--success-500)" }} /> Free to try · no card ·
            bring your own keys
          </div>
        </div>
        <CouncilDemo />
      </div>
    </div>
  );
}

function Council() {
  return (
    <div className={`${styles.sec} ${styles.secAlt}`} id="council">
      <div className={styles.wrap}>
        <div className={styles.secHead}>
          <div className={styles.eyebrowC}>Meet the council</div>
          <h2>Four personas, one shared goal</h2>
          <p>
            Each persona owns a point of view and a color. You always know who said what — at a
            glance.
          </p>
        </div>
        <div className={styles.councilGrid}>
          {ROLE_ORDER.map((k) => {
            const r = ROLE[k];
            return (
              <div
                className={styles.pcard}
                key={k}
                style={{ "--pc-color": r.color } as React.CSSProperties}
              >
                <PersonaAvatar role={k} size="lg" tagIcon />
                <h3>{r.name}</h3>
                <div className={styles.pcardRole}>{r.label}</div>
                <p>{r.blurb}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: 1,
      t: "Write the ticket",
      p: "Drop in a goal, a bug, or a spec. Concilium opens a ticket and convenes the room.",
    },
    {
      n: 2,
      t: "Convene the council",
      p: "The personas weigh in — Engineer, Designer, Product Owner & QA each take a position.",
    },
    {
      n: 3,
      t: "Reach consensus",
      p: "Review the thread, nudge a persona, and approve when the council agrees.",
    },
  ];
  return (
    <div className={styles.sec} id="how-it-works">
      <div className={styles.wrap}>
        <div className={styles.secHead}>
          <div className={styles.eyebrowC}>How it works</div>
          <h2>From ticket to consensus, together</h2>
        </div>
        <div className={styles.steps}>
          {steps.map((s) => (
            <div className={styles.step} key={s.n}>
              <div className={styles.stepN}>{s.n}</div>
              <h3>{s.t}</h3>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuoteSec() {
  return (
    <div className={`${styles.sec} ${styles.secAlt}`}>
      <div className={styles.wrap}>
        <div className={styles.quote}>
          <blockquote>
            “It feels less like prompting a tool and more like running a small, very fast team that
            never loses the thread.”
          </blockquote>
          <div className={styles.quoteBy}>
            <span className={styles.quoteAvatar}>SR</span>
            <div className={styles.quoteMeta}>
              <div className={styles.quoteName}>Sol Reyes</div>
              <div className={styles.quoteTitle}>Founder, Lumen Studio</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CTA() {
  return (
    <div className={styles.sec}>
      <div className={styles.wrap}>
        <div className={styles.cta}>
          <div className={styles.ctaBlobs}>
            <span
              className={styles.ctaBlob}
              style={{ background: "var(--coral-500)", top: -40, left: -20 }}
            />
            <span
              className={styles.ctaBlob}
              style={{ background: "var(--persona-des-500)", bottom: -60, right: 40 }}
            />
            <span
              className={styles.ctaBlob}
              style={{ background: "var(--persona-eng-500)", top: 20, right: 200 }}
            />
          </div>
          <div className={styles.ctaInner}>
            <h2>Convene your first council</h2>
            <p>Start a ticket in two minutes. The room&rsquo;s already warm.</p>
            <Link href="/signup" className={`${styles.btn} ${styles.btnLg} ${styles.btnPrimary}`}>
              Get started free
              <span className={styles.btnIcon}>
                <ArrowRight size={17} />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className={styles.foot}>
      <div className={styles.wrap}>
        <div className={styles.footIn}>
          <div className={styles.footBrand}>
            <img src="/brand/logo-mark.svg" width={24} height={24} alt="" />
            <b>Concilium</b>
          </div>
          <div className={styles.footLinks}>
            <a href="#how-it-works">Product</a>
            <a href="#council">The council</a>
            <Link href="/compare">vs Jira</Link>
          </div>
          <div className={styles.footCopy}>© 2026 Concilium</div>
        </div>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <div className={styles.mk}>
      <Nav />
      <Hero />
      <CouncilChamber3D />
      <Council />
      <HowItWorks />
      <QuoteSec />
      <CTA />
      <Footer />
    </div>
  );
}
