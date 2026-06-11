import { ImageResponse } from "next/og";

// Apple touch icon (home-screen) — the three-pebble council mark on cream.
export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Brand mark (viewBox 120) scaled ×1.5 to the 180px canvas. Each value is a
// pebble's top-left corner + diameter (= 2r).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#FCFAF6", position: "relative" }}>
        <div style={{ position: "absolute", top: 36, left: 62, width: 57, height: 57, borderRadius: 57, background: "#E85D34" }} />
        <div style={{ position: "absolute", top: 83, left: 36, width: 57, height: 57, borderRadius: 57, background: "#7A57D1" }} />
        <div style={{ position: "absolute", top: 83, left: 87, width: 57, height: 57, borderRadius: 57, background: "#1E9C86" }} />
        <div style={{ position: "absolute", top: 79, left: 76, width: 29, height: 29, borderRadius: 29, background: "#2B221C" }} />
      </div>
    ),
    { ...size }
  );
}
