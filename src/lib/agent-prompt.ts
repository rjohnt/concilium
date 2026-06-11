import { Ticket, PersonaId } from "./types";
import { getAllPersonas } from "./personas";

/**
 * Turn a council-refined ticket into a clean, paste-ready prompt for a coding
 * agent (Claude Code, Cursor, etc.). This is the bridge the wedge promises:
 * run the council, then hand the agreed spec straight to your agent.
 *
 * Only roles that actually weighed in get a section, so the prompt stays tight.
 */

const ROLE_HEADING: Record<PersonaId, string> = {
  engineer: "Engineering notes",
  designer: "Design notes",
  "product-owner": "Product notes",
  qa: "QA / acceptance criteria",
};

// The order roles appear in the prompt.
const ROLE_ORDER: PersonaId[] = ["product-owner", "engineer", "designer", "qa"];

/** A single feedback entry rendered as a clean bullet (full text, trimmed). */
function bullets(ticket: Ticket, personaId: PersonaId): string[] {
  return ticket.feedback
    .filter((f) => f.personaId === personaId)
    .map((f) => f.content.trim())
    .filter(Boolean);
}

export function generateAgentPrompt(ticket: Ticket): string {
  const total = getAllPersonas().length;
  const approved = ticket.approvals.length;

  const lines: string[] = [];

  lines.push(`# ${ticket.title}`);
  lines.push("");
  if (ticket.description.trim()) {
    lines.push(ticket.description.trim());
    lines.push("");
  }

  lines.push(
    `Implement the feature above. This spec was refined by a Concilium council — ` +
      `four roles (Product Owner, Engineer, Designer, QA) reviewed it and ` +
      `${approved} of ${total} approved. Honor their notes below.`
  );
  lines.push("");

  for (const personaId of ROLE_ORDER) {
    const items = bullets(ticket, personaId);
    if (items.length === 0) continue;
    const approvedMark = ticket.approvals.includes(personaId) ? " ✓ approved" : "";
    lines.push(`## ${ROLE_HEADING[personaId]}${approvedMark}`);
    for (const item of items) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(
    "Build the feature to satisfy the notes above. Keep the change focused, " +
      "and call out any assumptions or trade-offs you make along the way."
  );

  return lines.join("\n").trim() + "\n";
}
