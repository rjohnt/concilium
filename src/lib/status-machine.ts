import type { TicketStatus } from "./types";

/**
 * Valid status transitions for Concilium tickets.
 *
 * Rules:
 * - Same-status is always valid (no-op)
 * - Forward: draft → in-review → consensus → building → done
 * - Backward one step: done → building → consensus → in-review → draft
 * - Multi-step jumps (e.g., draft → building) are NOT valid
 */
export const VALID_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  draft: ["draft", "in-review"],
  "in-review": ["draft", "in-review", "consensus"],
  consensus: ["in-review", "consensus", "building"],
  building: ["consensus", "building", "done"],
  done: ["building", "done"],
};

/**
 * Returns true if the transition from `current` to `target` is valid
 * according to the Concilium status machine rules.
 *
 * Same-status transitions are always valid.
 */
export function validateTransition(
  current: TicketStatus,
  target: TicketStatus
): boolean {
  return VALID_TRANSITIONS[current].includes(target);
}
