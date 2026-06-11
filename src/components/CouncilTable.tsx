"use client";

import { Ticket, PersonaId } from "@/lib/types";
import {
  getCouncilStatus,
  PERSONA_COUNCIL,
  STANCE_THEME,
  SeatStatus,
} from "@/lib/council";
import {
  Code,
  PenTool,
  Compass,
  Microscope,
  Check,
  AlertTriangle,
  Clock,
  Hammer,
} from "lucide-react";

const GLYPH: Record<PersonaId, React.ComponentType<{ size?: number }>> = {
  engineer: Code,
  designer: PenTool,
  "product-owner": Compass,
  qa: Microscope,
};

const STANCE_GLYPH = {
  approved: Check,
  concerns: AlertTriangle,
  awaiting: Clock,
} as const;

const AREAS = ["top", "right", "bottom", "left"] as const;

// Sample an arc into a polyline path — rounded stroke caps give soft segments.
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number, n = 14) {
  let d = "";
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const rad = ((a - 90) * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return d;
}

function ConsensusRing({
  seats,
  approved,
  total,
  ready,
}: {
  seats: SeatStatus[];
  approved: number;
  total: number;
  ready: boolean;
}) {
  const cx = 60,
    cy = 60,
    r = 46;
  return (
    <svg width={124} height={124} viewBox="0 0 120 120" aria-hidden="true">
      {seats.map((s, i) => (
        <path
          key={"track" + i}
          d={arcPath(cx, cy, r, i * 90 - 43, i * 90 + 43)}
          fill="none"
          stroke={PERSONA_COUNCIL[s.personaId].tintVar}
          strokeWidth={10}
          strokeLinecap="round"
        />
      ))}
      {seats.map((s, i) => (
        <path
          key={"arc" + i}
          className="ctbl-arc"
          d={arcPath(cx, cy, r, i * 90 - 40, i * 90 + 40)}
          fill="none"
          stroke={STANCE_THEME[s.stance].ring}
          strokeWidth={10}
          strokeLinecap="round"
        />
      ))}
      <text
        x="60"
        y="57"
        textAnchor="middle"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 22,
          fill: ready ? "var(--coral-600)" : "var(--ink-900)",
        }}
      >
        {approved}/{total}
      </text>
      <text
        x="60"
        y="73"
        textAnchor="middle"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fill: ready ? "var(--coral-600)" : "var(--ink-400)",
        }}
      >
        {ready ? "ready to build" : "agree"}
      </text>
    </svg>
  );
}

function Seat({ seat, area }: { seat: SeatStatus; area: string }) {
  const p = PERSONA_COUNCIL[seat.personaId];
  const st = STANCE_THEME[seat.stance];
  const Glyph = GLYPH[seat.personaId];
  const StanceGlyph = STANCE_GLYPH[seat.stance];
  return (
    <div
      className="ctbl-seat"
      style={{
        gridArea: area,
        borderColor: st.ring,
        background: seat.stance === "awaiting" ? "var(--surface-card)" : st.tint,
      }}
    >
      <div className="ctbl-row">
        <span className="ctbl-av" style={{ background: p.colorVar }}>
          <Glyph size={18} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span className="ctbl-nm">{seat.label}</span>
          <span className="ctbl-who">{seat.occupantLabel}</span>
        </span>
      </div>
      {seat.note && <p className="ctbl-note">{seat.note}</p>}
      <span
        className="ctbl-chip"
        style={{ color: st.text }}
      >
        <span
          className={"ctbl-dot" + (seat.stance === "awaiting" ? " ctbl-pulse" : "")}
          style={{ background: st.ring }}
        />
        <StanceGlyph size={12} />
        {st.label}
      </span>
    </div>
  );
}

export function CouncilTable({ ticket }: { ticket: Ticket }) {
  const council = getCouncilStatus(ticket);
  const ready = council.reached && !council.hasConcerns;

  return (
    <div className="ctbl">
      <style>{`
        .ctbl{font-family:var(--font-sans)}
        .ctbl-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:16px}
        .ctbl-eyebrow{font-family:var(--font-mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-faint)}
        .ctbl-sub{font-size:13px;color:var(--text-muted)}
        .ctbl-grid{display:grid;grid-template-columns:1fr minmax(168px,188px) 1fr;grid-template-areas:". top ." "left center right" ". bottom .";gap:14px;align-items:center}
        .ctbl-center{grid-area:center;display:flex;flex-direction:column;align-items:center;gap:4px;background:var(--warm-100);border:1px solid var(--border-subtle);border-radius:var(--radius-xl);padding:14px 10px}
        .ctbl-clabel{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-faint)}
        .ctbl-seat{border:1.5px solid var(--border-strong);border-radius:var(--radius-lg);padding:11px 12px;min-width:0}
        .ctbl-row{display:flex;align-items:center;gap:9px}
        .ctbl-av{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;flex:0 0 auto}
        .ctbl-nm{display:block;font-weight:600;font-size:14px;color:var(--ink-900);line-height:1.15}
        .ctbl-who{display:block;font-family:var(--font-mono);font-size:11px;color:var(--text-faint)}
        .ctbl-note{font-size:12.5px;line-height:1.4;color:var(--text-muted);margin:9px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .ctbl-chip{display:inline-flex;align-items:center;gap:5px;margin-top:9px;font-size:11.5px;font-weight:500;padding:3px 9px;border-radius:var(--radius-pill);background:var(--surface-card)}
        .ctbl-dot{width:7px;height:7px;border-radius:50%;flex:0 0 auto}
        .ctbl-arc{transition:stroke .3s var(--ease-out)}
        @keyframes ctblpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .ctbl-pulse{animation:ctblpulse 1.6s ease-in-out infinite}
        @media (max-width:640px){.ctbl-grid{grid-template-columns:1fr;grid-template-areas:"center" "top" "right" "bottom" "left"}}
        @media (prefers-reduced-motion:reduce){.ctbl-pulse{animation:none}.ctbl-arc{transition:none}}
      `}</style>

      <div className="ctbl-head">
        <span className="ctbl-eyebrow">The council</span>
        <span className="ctbl-sub">
          {ready
            ? "Consensus reached — the council is ready to build."
            : council.hasConcerns
            ? "Concerns are open — resolve them to reach consensus."
            : "Engineer, Designer, Product & QA — here's where each seat stands."}
        </span>
      </div>

      <div className="ctbl-grid">
        {council.seats.map((seat, i) => (
          <Seat key={seat.personaId} seat={seat} area={AREAS[i]} />
        ))}
        <div className="ctbl-center">
          <span className="ctbl-clabel">consensus</span>
          <ConsensusRing
            seats={council.seats}
            approved={council.approved}
            total={council.total}
            ready={ready}
          />
          {ready && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 500,
                color: "var(--coral-700)",
                background: "var(--coral-100)",
                borderRadius: "var(--radius-pill)",
                padding: "4px 11px",
              }}
            >
              <Hammer size={13} /> ready to build
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
