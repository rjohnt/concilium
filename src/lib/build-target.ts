/**
 * build-target.ts — Resolve where a ticket's build should land.
 *
 * A ticket's build targets its branch_override when set; otherwise the owning
 * project's default_branch; otherwise 'main' for standalone tickets with no
 * project. The repo URL comes from the project (null when the ticket has no
 * project or the project has no repo configured — executors then work in
 * their local workspace as before).
 *
 * `resolveBuildTarget` is the async server-side entry point (loads the
 * project from the DB); `resolveBuildTargetWithProject` is the pure core for
 * callers that already hold the project.
 */

import { Project, Ticket } from "./types";
import { getProject } from "./server-db";

export const FALLBACK_BRANCH = "main";

export interface BuildTarget {
  /** Git remote to clone/push, or null for local-workspace builds. */
  repoUrl: string | null;
  /** Branch the build targets. Never empty — falls back to 'main'. */
  branch: string;
}

/** Pure resolution: ticket.branchOverride || project.defaultBranch || 'main'. */
export function resolveBuildTargetWithProject(
  ticket: Pick<Ticket, "branchOverride">,
  project?: Project | null
): BuildTarget {
  const override = ticket.branchOverride?.trim();
  return {
    repoUrl: project?.repoUrl ?? null,
    branch: override || project?.defaultBranch?.trim() || FALLBACK_BRANCH,
  };
}

/** Server-side resolution: loads the ticket's project (if any) from the DB. */
export async function resolveBuildTarget(
  ticket: Pick<Ticket, "projectId" | "branchOverride">
): Promise<BuildTarget> {
  const project = ticket.projectId ? await getProject(ticket.projectId) : undefined;
  return resolveBuildTargetWithProject(ticket, project);
}
