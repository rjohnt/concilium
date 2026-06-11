import { renderWelcomeCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Concilium vs Jira for AI-agent teams";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderWelcomeCard();
}
