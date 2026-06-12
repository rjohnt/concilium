/**
 * Build-pipeline glue: open a GitHub PR for a pushed work branch.
 *
 * Gating: the owning project must have create_pr enabled AND the provider's
 * pushBranch must have actually pushed. Failure isolation: nothing in here
 * ever throws — a missing token, an unparseable repo URL, or a GitHub API
 * error degrades to a "log" artifact so the build itself still completes.
 * A successful PR is recorded as a "report" artifact whose content is the
 * PR URL (rendered as a link in the build report UI).
 */

import { BuildArtifact, BuildReport, Project, Ticket } from "../types";
import { makeArtifact } from "../sandbox";
import { getGitHubTokenProvider } from "./token-provider";
import { createPullRequest } from "./pull-request";

export const PULL_REQUEST_ARTIFACT_LABEL = "Pull request";

export interface BuildPullRequestParams {
  project: Project | null | undefined;
  /** Did the sandbox provider's pushBranch report pushed: true? */
  pushed: boolean;
  /** Branch that was pushed: concilium/<ticketId>. */
  headBranch: string;
  /** Branch the PR merges into: ticket branch_override || project default_branch. */
  baseBranch: string;
  ticket: Pick<Ticket, "title">;
  report: Pick<BuildReport, "implementationPlan" | "consensusSummary">;
  buildId: string;
}

export function buildPullRequestBody(
  report: Pick<BuildReport, "implementationPlan" | "consensusSummary">
): string {
  return [
    "## Implementation Plan",
    "",
    report.implementationPlan,
    "",
    "## Consensus Summary",
    "",
    report.consensusSummary,
    "",
    "🤖 Generated with [Claude Code](https://claude.com/claude-code)",
  ].join("\n");
}

/**
 * Open a PR for a completed build round. Returns the artifact to attach to
 * the build report ("report" with the PR URL on success, "log" describing
 * the failure otherwise), or null when PR creation is not applicable
 * (no project, create_pr disabled, no repo URL, or the push didn't happen).
 */
export async function maybeCreateBuildPullRequest(
  params: BuildPullRequestParams
): Promise<BuildArtifact | null> {
  const { project, pushed, buildId } = params;
  if (!project?.createPr || !project.repoUrl || !pushed) return null;

  try {
    const token = await getGitHubTokenProvider().getToken(project);
    if (!token) {
      return makeArtifact(
        buildId,
        "log",
        "Pull request skipped",
        "No GitHub credential available — install the Concilium GitHub App on this repository (or set GITHUB_TOKEN). The branch was pushed but no PR was opened."
      );
    }

    const pr = await createPullRequest({
      repoUrl: project.repoUrl,
      head: params.headBranch,
      base: params.baseBranch,
      title: params.ticket.title,
      body: buildPullRequestBody(params.report),
      token,
    });

    return makeArtifact(
      buildId,
      "report",
      PULL_REQUEST_ARTIFACT_LABEL,
      pr.url
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeArtifact(
      buildId,
      "log",
      "Pull request failed",
      `Could not open a pull request: ${message}\nThe branch was pushed — open the PR manually if needed.`
    );
  }
}
