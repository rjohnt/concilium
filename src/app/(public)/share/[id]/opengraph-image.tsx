import { getTicket } from "@/lib/server-db";
import { renderShareCard } from "@/lib/og";

// Node runtime: the card reads the SQLite source of truth via getTicket.
export const runtime = "nodejs";
export const alt = "A Concilium council — software by consensus";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return renderShareCard(await getTicket(id), id);
}
