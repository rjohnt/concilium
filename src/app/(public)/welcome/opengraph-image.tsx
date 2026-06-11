/**
 * Static Open Graph card for the marketing root, so concilium.* links
 * unfurl into a branded hero — the council mark, the promise, the tagline.
 */

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Concilium — give every project a council";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = {
  cream: "#FCFAF6",
  ink900: "#2B221C",
  ink700: "#4B3F35",
  faint: "#8C7C6C",
  coral: "#E85D34",
};

const SEATS: { label: string; color: string }[] = [
  { label: "Engineer", color: "#1E9C86" },
  { label: "Designer", color: "#7A57D1" },
  { label: "Product Owner", color: "#D9962A" },
  { label: "QA", color: "#2F82C7" },
];

export default function Image() {
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
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: 16 }}>
            <div style={{ display: "flex", marginBottom: 5 }}>
              <div style={{ width: 20, height: 20, borderRadius: 20, background: C.coral }} />
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <div style={{ width: 20, height: 20, borderRadius: 20, background: "#7A57D1" }} />
              <div style={{ width: 20, height: 20, borderRadius: 20, background: "#1E9C86" }} />
            </div>
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: C.ink900 }}>Concilium</div>
        </div>

        {/* Promise */}
        <div style={{ display: "flex", fontSize: 78, fontWeight: 800, color: C.ink900, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
          Give every project
        </div>
        <div style={{ display: "flex", fontSize: 78, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
          <span style={{ color: C.ink900 }}>a&nbsp;</span>
          <span style={{ color: C.coral }}>council.</span>
        </div>

        {/* Seats */}
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
                background: "#FFFFFF",
                border: "1px solid #E8DCCB",
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
    { ...size }
  );
}
