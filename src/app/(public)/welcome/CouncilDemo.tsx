"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Scale } from "lucide-react";
import { PersonaAvatar, PersonaBadge, ROLE, type RoleKey } from "./persona-kit";
import styles from "./welcome.module.css";

/* ------------------------------------------------------------------ */
/* Self-playing council demo — the landing-page hero.                  */
/* A scripted ticket debate streams in message by message, the         */
/* Mediator brokers it, and the council reaches consensus, then loops.  */
/* No signup, no API keys — a watchable, honest first cut of the live   */
/* playground in the growth roadmap.                                    */
/* ------------------------------------------------------------------ */

type Speaker = RoleKey | "mediator";

interface Line {
  role: Speaker;
  /** ms the "typing" indicator shows before this line appears */
  typing: number;
  text: string;
}

const SCRIPT: Line[] = [
  {
    role: "product",
    typing: 700,
    text: "Goal: ship public ticket share pages — let buyers see the council's debate without signing in.",
  },
  {
    role: "qa",
    typing: 1100,
    text: "Edge case: an expired share link should explain itself, not throw a bare 404.",
  },
  {
    role: "designer",
    typing: 1300,
    text: "On it — a warm empty-state: “this council has wrapped” with a way back in. ✨",
  },
  {
    role: "engineer",
    typing: 1200,
    text: "I'll gate it behind a signed token and render read-only from the server. ~Half a day.",
  },
  {
    role: "mediator",
    typing: 1400,
    text: "Consensus forming: read-only + signed links + a warm expiry state. QA's edge case is covered.",
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
  // -1 … SCRIPT.length-1 of lines fully revealed; `typing` flags the next bubble.
  const [revealed, setRevealed] = useState(0);
  const [typing, setTyping] = useState(true);
  const [consensus, setConsensus] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => {
    // Respect reduced-motion: render the whole thread + banner, no looping.
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setRevealed(SCRIPT.length);
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
      if (index >= SCRIPT.length) {
        setConsensus(true);
        schedule(() => {
          // reset and loop
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
      }, SCRIPT[index].typing);
    };

    setRevealed(0);
    setConsensus(false);
    schedule(() => playFrom(0), 500);

    return () => {
      cancelled = true;
      clear();
    };
  }, [clear]);

  const nextTyping = !consensus && typing && revealed < SCRIPT.length ? SCRIPT[revealed].role : null;

  return (
    <div className={styles.heroviz}>
      <div className={styles.herovizBar}>
        <span className={styles.herovizDot} style={{ background: "var(--persona-prod-400)" }} />
        <span className={styles.herovizDot} style={{ background: "var(--persona-des-400)" }} />
        <span className={styles.herovizDot} style={{ background: "var(--persona-eng-400)" }} />
        <span className={styles.herovizLabel}>TKT-128 · council in session</span>
      </div>

      {SCRIPT.slice(0, revealed).map((line, i) => (
        <DemoLine key={i} line={line} />
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
  );
}
