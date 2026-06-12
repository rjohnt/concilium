/**
 * GitHub token provider seam.
 *
 * Callers never read auth env vars directly — they ask the active provider
 * for a token scoped to a project. v1 ships a single env-backed provider
 * (GITHUB_TOKEN), but the interface is per-project so a GitHub App
 * installation-token provider (minting short-lived tokens per repo/org) can
 * be slotted in later via getGitHubTokenProvider() without touching callers.
 */

import { Project } from "../types";

export interface GitHubTokenProvider {
  name: string;
  /**
   * Resolve a token that can act on the given project's repository.
   * Returns null when no credential is configured (callers degrade
   * gracefully — never throw on a missing token).
   */
  getToken(project: Project): Promise<string | null>;
}

/** v1: a single personal-access/fine-grained token from the environment. */
export const envGitHubTokenProvider: GitHubTokenProvider = {
  name: "env",
  async getToken(): Promise<string | null> {
    const token = process.env.GITHUB_TOKEN?.trim();
    return token ? token : null;
  },
};

/**
 * App installation tokens first (the customer-repeatable path), falling back
 * to a plain GITHUB_TOKEN for single-user / local setups. Both misses → null,
 * which callers already degrade on.
 */
export const chainGitHubTokenProvider: GitHubTokenProvider = {
  name: "github-app+env",
  async getToken(project: Project): Promise<string | null> {
    const { appGitHubTokenProvider } = await import("./app-token-provider");
    const appToken = await appGitHubTokenProvider.getToken(project);
    if (appToken) return appToken;
    return envGitHubTokenProvider.getToken(project);
  },
};

/** Select the active token provider. */
export function getGitHubTokenProvider(): GitHubTokenProvider {
  return chainGitHubTokenProvider;
}
