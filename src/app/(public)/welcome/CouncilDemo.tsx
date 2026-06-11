"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Scale } from "lucide-react";
import { PersonaAvatar, PersonaBadge, ROLE, type RoleKey } from "./persona-kit";
import styles from "./welcome.module.css";

/* ------------------------------------------------------------------ */
/* Interactive council demo — the landing-page hero / no-signup        */
/* playground. Pick a sample ticket; its four-persona debate streams   */
/* in, the Mediator brokers it, and the council reaches consensus, then */
/* loops. No signup, no API keys — an honest, watchable cut of the live */
/* playground in the growth roadmap.                                    */
/* ------------------------------------------------------------------ */

type Speaker = RoleKey | "mediator";

interface Line {
  role: Speaker;
  /** ms the "typing" indicator shows before this line appears */
  typing: number;
  text: string;
}

interface Scenario {
  id: string;
  label: string;
  /** label shown in the demo window's title bar */
  ticket: string;
  script: Line[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "dark-mode",
    label: "Dark mode",
    ticket: "TKT-128 · dark mode toggle",
    script: [
      { role: "product", typing: 700, text: "Goal: add a dark mode toggle in settings — and remember the choice." },
      { role: "qa", typing: 1100, text: "Edge case: respect the OS preference on first load, before any click." },
      { role: "designer", typing: 1300, text: "Cool-gray palette, a sun/moon switch with a smooth cross-fade." },
      { role: "engineer", typing: 1200, text: "CSS variables + a data-theme attr, persisted to localStorage. ~Half a day." },
      { role: "mediator", typing: 1400, text: "Consensus: OS-aware default, persisted toggle, no flash. QA's first-load case is covered." },
    ],
  },
  {
    id: "stripe",
    label: "Stripe checkout",
    ticket: "TKT-204 · Pro checkout",
    script: [
      { role: "product", typing: 700, text: "Goal: let users upgrade to Pro with Stripe checkout." },
      { role: "engineer", typing: 1300, text: "Hosted Checkout Session + a webhook to flip the subscription flag. Secrets stay server-side." },
      { role: "qa", typing: 1200, text: "Cover the cancel and failed-payment paths, not just the happy one." },
      { role: "designer", typing: 1200, text: "A calm upgrade screen — make it clear what Pro unlocks before they pay." },
      { role: "mediator", typing: 1400, text: "Consensus: hosted checkout, webhook-driven entitlement, cancel/fail handled." },
    ],
  },
  {
    id: "flaky-test",
    label: "Fix a flaky test",
    ticket: "TKT-377 · flaky login test",
    script: [
      { role: "product", typing: 700, text: "The login E2E test fails intermittently in CI — it's blocking merges." },
      { role: "engineer", typing: 1300, text: "Smells like a race on the redirect. Wait on the network, not a fixed timeout." },
      { role: "qa", typing: 1100, text: "Reproduce by running it 50× in a loop before we call it fixed." },
      { role: "designer", typing: 1100, text: "No UI change — but let's make the loading state deterministic to assert on." },
      { role: "mediator", typing: 1400, text: "Consensus: fix the race, assert on network state, prove it with a 50× run." },
    ],
  },
];

const HOLD_AFTER_MS = 4200; // pause on the consensus banner before looping

const MEDIATOR = {
  name: "Mediator",
  color: "var(--coral-500)",
};

function TypingBubble({ role }: { role: Speaker }) {
  const color = role === "mediator" ? MEDIATOR.color : ROLE[role].color;
  return (
    <div className={`${styles.herovizMsg} ${styles.demoMsgEnter}`}>
      {role === "mediator" ? (
        <span className={styles.demoMediatorAvatar} aria-hidden>
          <Scale size={16} strokeWidth={2.5} />
        </span>
      ) : (
        <PersonaAvatar role={role} size="sm" tagIcon />
      )}
      <div className={styles.herovizBody}>
        <div className={styles.demoTyping} style={{ "--type-color": color } as React.CSSProperties}>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

function DemoLine({ line }: { line: Line }) {
  if (line.role === "mediator") {
    return (
      <div className={`${styles.herovizMsg} ${styles.demoMsgEnter}`}>
        <span className={styles.demoMediatorAvatar} aria-hidden>
          <Scale size={16} strokeWidth={2.5} />
        </span>
        <div className={styles.herovizBody}>
          <div className={styles.herovizName}>
            {MEDIATOR.name}
            <span className={styles.demoMediatorTag}>Mediator</span>
          </div>
          <div className={`${styles.herovizText} ${styles.demoMediatorText}`}>{line.text}</div>
        </div>
      </div>
    );
  }
  return (
    <div className={`${styles.herovizMsg} ${styles.demoMsgEnter}`}>
      <PersonaAvatar role={line.role} size="sm" tagIcon />
      <div className={styles.herovizBody}>
        <div className={styles.herovizName}>
          {ROLE[line.role].name}
          <PersonaBadge role={line.role} />
        </div>
        <div className={styles.herovizText}>{line.text}</div>
      </div>
    </div>
  );
}

export default function CouncilDemo() {
  const [selected, setSelected] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [typing, setTyping] = useState(true);
  const [consensus, setConsensus] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scenario = SCENARIOS[selected];
  const script = scenario.script;

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  // Re-runs whenever the selected scenario changes — cleanup cancels the old
  // animation, and the new one starts fresh.
  useEffect(() => {
    const lines = SCENARIOS[selected].script;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setRevealed(lines.length);
      setTyping(false);
      setConsensus(true);
      return;
    }

    let cancelled = false;
    const schedule = (fn: () => void, ms: number) => {
      timer.current = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    };

    const playFrom = (index: number) => {
      if (index >= lines.length) {
        setConsensus(true);
        schedule(() => {
          setConsensus(false);
          setRevealed(0);
          setTyping(true);
          schedule(() => playFrom(0), 500);
        }, HOLD_AFTER_MS);
        return;
      }
      setTyping(true);
      schedule(() => {
        setTyping(false);
        setRevealed(index + 1);
        schedule(() => playFrom(index + 1), 650);
      }, lines[index].typing);
    };

    setRevealed(0);
    setConsensus(false);
    setTyping(true);
    schedule(() => playFrom(0), 500);

    return () => {
      cancelled = true;
      clear();
    };
  }, [clear, selected]);

  const nextTyping = !consensus && typing && revealed < script.length ? script[revealed].role : null;

  return (
    <div className={styles.demoWrap}>
      <div className={styles.demoChips} role="tablist" aria-label="Try a sample ticket">
        <span className={styles.demoChipsLabel}>Try a ticket:</span>
        {SCENARIOS.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={i === selected}
            onClick={() => setSelected(i)}
            className={`${styles.demoChip} ${i === selected ? styles.demoChipActive : ""}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className={styles.heroviz}>
        <div className={styles.herovizBar}>
          <span className={styles.herovizDot} style={{ background: "var(--persona-prod-400)" }} />
          <span className={styles.herovizDot} style={{ background: "var(--persona-des-400)" }} />
          <span className={styles.herovizDot} style={{ background: "var(--persona-eng-400)" }} />
          <span className={styles.herovizLabel}>{scenario.ticket}</span>
        </div>

        {script.slice(0, revealed).map((line, i) => (
          <DemoLine key={`${scenario.id}-${i}`} line={line} />
        ))}

        {nextTyping && <TypingBubble role={nextTyping} />}

        {consensus && (
          <div className={styles.demoConsensus} role="status">
            <span className={styles.demoConsensusIcon}>
              <Check size={14} strokeWidth={3} />
            </span>
            <span>
              Consensus reached · <b>4 / 4 seats</b> →{" "}
              <span className={styles.demoConsensusBuild}>building</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
