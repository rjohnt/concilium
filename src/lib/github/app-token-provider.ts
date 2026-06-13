/**
 * GitHub App installation-token provider — the customer-repeatable auth path.
 *
 * A customer installs the ConciliumAI GitHub App on their org/account and
 * picks which repositories it can see. For each build, this provider resolves
 * the installation that covers the project's repo and mints a short-lived
 * access token scoped to just that repository. No personal tokens, PRs are
 * authored by the app's bot account, and access is revocable from the
 * customer's side.
 *
 * Config via env (the app's identity, server-only):
 *   GITHUB_APP_ID               — numeric app id
 *   GITHUB_APP_PRIVATE_KEY      — PEM content ("\n"-escaped newlines allowed), or
 *   GITHUB_APP_PRIVATE_KEY_PATH — path to the downloaded .pem file
 *
 * Failure posture matches the seam contract: every miss (not configured, app
 * not installed on the repo, API error) returns null so the build degrades to
 * a "PR skipped" artifact — installation problems must never fail a build.
 */

import { createPrivateKey } from "crypto";
import { readFileSync } from "fs";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { Project } from "../types";
import type { GitHubTokenProvider } from "./token-provider";
import { parseGitHubRepo } from "./pull-request";

interface AppConfig {
  appId: string;
  privateKey: string;
}

/**
 * GitHub serves app keys in PKCS#1 ("BEGIN RSA PRIVATE KEY"); some signing
 * backends only accept PKCS#8. Normalize so either form works.
 */
function normalizePrivateKey(pem: string): string {
  try {
    return createPrivateKey(pem)
      .export({ type: "pkcs8", format: "pem" })
      .toString();
  } catch {
    return pem;
  }
}

export function getAppConfig(): AppConfig | null {
  const appId = process.env.GITHUB_APP_ID?.trim();
  if (!appId) return null;

  const inline = process.env.GITHUB_APP_PRIVATE_KEY;
  if (inline?.trim()) {
    return { appId, privateKey: normalizePrivateKey(inline.replace(/\\n/g, "\n")) };
  }

  const path = process.env.GITHUB_APP_PRIVATE_KEY_PATH?.trim();
  if (path) {
    try {
      return { appId, privateKey: normalizePrivateKey(readFileSync(path, "utf8")) };
    } catch (err) {
      console.warn(
        `GITHUB_APP_PRIVATE_KEY_PATH is set but unreadable (${err instanceof Error ? err.message : String(err)})`
      );
      return null;
    }
  }

  return null;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

/** Installation tokens live 1h; refresh once within this margin of expiry. */
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

const tokenCache = new Map<string, CachedToken>();

/** Test hook — installation tokens are otherwise cached across calls. */
export function clearAppTokenCache(): void {
  tokenCache.clear();
}

export const appGitHubTokenProvider: GitHubTokenProvider = {
  name: "github-app",

  async getToken(project: Project): Promise<string | null> {
    const config = getAppConfig();
    if (!config) return null;

    const ref = project.repoUrl ? parseGitHubRepo(project.repoUrl) : null;
    if (!ref) return null;

    const cacheKey = `${ref.owner}/${ref.repo}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) {
      return cached.token;
    }

    try {
      const octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: { appId: config.appId, privateKey: config.privateKey },
      });

      const { data: installation } = await octokit.rest.apps.getRepoInstallation({
        owner: ref.owner,
        repo: ref.repo,
      });

      const { data: created } = await octokit.rest.apps.createInstallationAccessToken({
        installation_id: installation.id,
        repositories: [ref.repo],
      });

      tokenCache.set(cacheKey, {
        token: created.token,
        expiresAt: new Date(created.expires_at).getTime(),
      });
      return created.token;
    } catch (err) {
      const status = (err as { status?: number }).status;
      console.warn(
        status === 404
          ? `GitHub App is not installed on ${cacheKey} — install it on that repository to enable PR creation.`
          : `GitHub App token request for ${cacheKey} failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return null;
    }
  },
};
