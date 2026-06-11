/**
 * Shared Open Graph card renderers (next/og + Satori).
 *
 * Kept out of the route files so opengraph-image.tsx and twitter-image.tsx
 * can each declare their own statically-analyzable route config (runtime,
 * size, contentType, alt) and just call these — Next.js cannot parse those
 * config values when they're re-exported from another module.
 *
 * Satori notes: brand colors are inlined (no CSS vars), the approval check
 * is drawn in CSS (the default font has no ✓ glyph), and rendered copy
 * avoids non-Latin glyphs that trigger dynamic-font fetches.
 */

import { ImageResponse } from "next/og";
import { checkConsensusThreshold } from "@/lib/consensus-threshold";
import type { PersonaId, Ticket } from "@/lib/types";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// Concrete brand values — Satori can't read CSS variables.
const C = {
  cream: "#FCFAF6",
  warm100: "#F7F1E8",
  border: "#E8DCCB",
  ink900: "#2B221C",
  ink700: "#4B3F35",
  faint: "#8C7C6C",
  coral: "#E85D34",
  coral600: "#CF4A28",
  success: "#2E9E6B",
  white: "#FFFFFF",
};

const PERSONA: Record<PersonaId, { label: string; color: string }> = {
  engineer: { label: "Engineer", color: "#1E9C86" },
  designer: { label: "Designer", color: "#7A57D1" },
  "product-owner": { label: "Product Owner", color: "#D9962A" },
  qa: { label: "QA", color: "#2F82C7" },
};
const ORDER: PersonaId[] = ["engineer", "designer", "product-owner", "qa"];

function Mark({ dot = 16 }: { dot?: number }) {
  // The three-pebble council mark.
  const g = Math.round(dot / 4);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: 14 }}>
      <div style={{ display: "flex", marginBottom: g }}>
        <div style={{ width: dot, height: dot, borderRadius: dot, background: C.coral }} />
      </div>
      <div style={{ display: "flex", gap: g }}>
        <div style={{ width: dot, height: dot, borderRadius: dot, background: "#7A57D1" }} />
        <div style={{ width: dot, height: dot, borderRadius: dot, background: "#1E9C86" }} />
      </div>
    </div>
  );
}

/** Dynamic card for a shared council (or a warm fallback when missing). */
export function renderShareCard(ticket: Ticket | undefined, _id: string): ImageResponse {
  if (!ticket) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background: C.cream,
            padding: 80,
            justifyContent: "center",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
            <Mark />
            <div style={{ fontSize: 34, fontWeight: 700, color: C.ink900 }}>Concilium</div>
          </div>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: C.ink900 }}>
            This council has wrapped
          </div>
          <div style={{ display: "flex", fontSize: 30, color: C.ink700, marginTop: 16 }}>
            Convene your own · software by consensus.
          </div>
        </div>
      ),
      { ...OG_SIZE }
    );
  }

  const { progress, reached } = checkConsensusThreshold(ticket);
  const pct = Math.round(progress * 100);
  const approved = ticket.approvals.length;
  const title = ticket.title.length > 90 ? ticket.title.slice(0, 88) + "…" : ticket.title;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: C.cream,
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Mark />
            <div style={{ fontSize: 32, fontWeight: 700, color: C.ink900 }}>Concilium</div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 22,
              fontWeight: 700,
              color: reached ? C.success : C.coral600,
              background: reached ? "rgba(46,158,107,0.12)" : C.warm100,
              border: `1px solid ${reached ? "rgba(46,158,107,0.35)" : C.border}`,
              borderRadius: 999,
              padding: "8px 20px",
            }}
          >
            {ticket.id}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: 60,
            fontWeight: 800,
            lineHeight: 1.1,
            color: C.ink900,
            marginTop: 44,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>

        {/* Consensus bar */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 26,
              fontWeight: 700,
              color: C.ink700,
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex" }}>
              {reached ? "Consensus reached" : "Reaching consensus"}
            </div>
            <div style={{ display: "flex", color: C.faint }}>
              {approved} / 4 seats · {pct}%
            </div>
          </div>
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 16,
              background: C.warm100,
              borderRadius: 999,
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                width: `${pct}%`,
                height: "100%",
                background: reached ? C.success : C.coral,
                borderRadius: 999,
              }}
            />
          </div>

          {/* Seats */}
          <div style={{ display: "flex", gap: 16, marginTop: 32 }}>
            {ORDER.map((pid) => {
              const meta = PERSONA[pid];
              const ok = ticket.approvals.includes(pid);
              return (
                <div
                  key={pid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flex: 1,
                    background: C.white,
                    border: `1px solid ${C.border}`,
                    borderLeft: `5px solid ${meta.color}`,
                    borderRadius: 16,
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: 14,
                      height: 14,
                      borderRadius: 14,
                      background: meta.color,
                      marginRight: 12,
                    }}
                  />
                  <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: C.ink900 }}>
                    {meta.label}
                  </div>
                  {ok && (
                    <div
                      style={{
                        display: "flex",
                        marginLeft: "auto",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 28,
                        height: 28,
                        borderRadius: 28,
                        background: C.success,
                      }}
                    >
                      {/* CSS checkmark — Satori's default font has no ✓ glyph */}
                      <div
                        style={{
                          display: "flex",
                          width: 8,
                          height: 14,
                          marginTop: -3,
                          borderRight: "3px solid #fff",
                          borderBottom: "3px solid #fff",
                          transform: "rotate(45deg)",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}

const SEATS = ORDER.map((pid) => PERSONA[pid]);

/** Static brand card for the marketing root. */
export function renderWelcomeCard(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: C.cream,
          padding: 80,
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
          <Mark dot={20} />
          <div style={{ fontSize: 40, fontWeight: 700, color: C.ink900 }}>Concilium</div>
        </div>

        <div style={{ display: "flex", fontSize: 78, fontWeight: 800, color: C.ink900, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
          Give every project
        </div>
        <div style={{ display: "flex", fontSize: 78, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
          <span style={{ color: C.ink900 }}>a&nbsp;</span>
          <span style={{ color: C.coral }}>council.</span>
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 44 }}>
          {SEATS.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: 24,
                fontWeight: 700,
                color: C.ink700,
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 999,
                padding: "10px 20px",
              }}
            >
              <div style={{ display: "flex", width: 14, height: 14, borderRadius: 14, background: s.color, marginRight: 10 }} />
              {s.label}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", fontSize: 30, color: C.faint, marginTop: 40 }}>
          Software by consensus.
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
