/**
 * Dynamic Open Graph image for a shared council.
 *
 * Makes /share/[id] links unfurl on Slack / X / Discord / LinkedIn into a
 * branded card — ticket title, consensus progress, and the four persona
 * seats with their approval state. The visual hook of the share loop.
 *
 * Rendered with next/og (Satori) on the Node runtime so it can read the
 * SQLite source of truth.
 */

import { ImageResponse } from "next/og";
import { getTicket } from "@/lib/server-db";
import { checkConsensusThreshold } from "@/lib/consensus-threshold";
import type { PersonaId } from "@/lib/types";

export const runtime = "nodejs";
export const alt = "A Concilium council — software by consensus";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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

function Mark() {
  // The three-pebble council mark.
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: 14 }}>
      <div style={{ display: "flex", marginBottom: 4 }}>
        <div style={{ width: 16, height: 16, borderRadius: 16, background: C.coral }} />
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <div style={{ width: 16, height: 16, borderRadius: 16, background: "#7A57D1" }} />
        <div style={{ width: 16, height: 16, borderRadius: 16, background: "#1E9C86" }} />
      </div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await getTicket(id);

  // Fallback card for a missing / expired link.
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
      { ...size }
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
    { ...size }
  );
}
