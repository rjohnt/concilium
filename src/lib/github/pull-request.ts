/**
 * GitHub pull-request creation for the build pipeline.
 *
 * parseGitHubRepo understands the remote-URL shapes a Project.repoUrl can
 * take (https, ssh, with or without .git) and createPullRequest opens a real
 * PR via Octokit. Server-only — auth comes from the token-provider seam.
 */

import { Octokit } from "@octokit/rest";

export interface GitHubRepoRef {
  owner: string;
  repo: string;
}

/**
 * Parse owner/repo from a GitHub remote URL. Supported shapes:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   git@github.com:owner/repo.git
 *   ssh://git@github.com/owner/repo.git
 * Returns null for anything else (non-GitHub hosts, malformed URLs).
 */
export function parseGitHubRepo(repoUrl: string): GitHubRepoRef | null {
  const url = repoUrl.trim();

  // git@github.com:owner/repo(.git)
  const sshMatch = url.match(/^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };

  // https://github.com/owner/repo(.git) and ssh://git@github.com/owner/repo(.git)
  const webMatch = url.match(
    /^(?:https?:\/\/|ssh:\/\/git@)github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/
  );
  if (webMatch) return { owner: webMatch[1], repo: webMatch[2] };

  return null;
}

export interface CreatePullRequestInput {
  /** Git remote URL of the target repository (https or ssh form). */
  repoUrl: string;
  /** Branch with the changes (e.g. concilium/tix-001). */
  head: string;
  /** Branch the PR merges into (e.g. main). */
  base: string;
  title: string;
  body: string;
  /** Token from the GitHubTokenProvider seam. */
  token: string;
}

export interface CreatedPullRequest {
  url: string;
  number: number;
}

/** Open a pull request. Throws on unparseable repo URLs or API errors. */
export async function createPullRequest(
  input: CreatePullRequestInput
): Promise<CreatedPullRequest> {
  const ref = parseGitHubRepo(input.repoUrl);
  if (!ref) {
    throw new Error(`Cannot parse a GitHub owner/repo from repo URL: ${input.repoUrl}`);
  }

  const octokit = new Octokit({ auth: input.token });
  const { data } = await octokit.rest.pulls.create({
    owner: ref.owner,
    repo: ref.repo,
    head: input.head,
    base: input.base,
    title: input.title,
    body: input.body,
  });

  return { url: data.html_url, number: data.number };
}
