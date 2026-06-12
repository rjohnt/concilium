/**
 * git-url.ts — strict validation for project repository URLs.
 *
 * A project's repoUrl ends up as the argument to `git clone` inside a sandbox
 * workspace, so it is a command-injection sink, not just a display string:
 *   - git's `ext::` transport executes arbitrary shell on the host
 *   - a leading dash turns the URL into a git option (`--upload-pack=...`)
 *   - `file://`, plain paths, and internal `http://` hosts allow local file
 *     reads / SSRF with the server's network position
 *
 * Only well-formed https://, ssh://, and scp-style git@host:path remotes are
 * accepted. Validate at the API boundary (POST/PATCH /api/projects) AND again
 * in the sandbox layer right before cloning (defense in depth).
 */

/** scp-style remote: user@host:path (e.g. git@github.com:org/repo.git). */
const SCP_REMOTE_PATTERN = /^[A-Za-z0-9._-]+@[A-Za-z0-9][A-Za-z0-9.-]*:[A-Za-z0-9][A-Za-z0-9._/-]*$/;

/** Path allowed after the host in https/ssh URLs (no spaces, no dashes-first). */
const URL_PATH_PATTERN = /^\/[A-Za-z0-9][A-Za-z0-9._/~-]*$/;

/**
 * Whether `url` is an acceptable git remote for a project.
 * Allowed forms: https://host/path, ssh://[user@]host[:port]/path,
 * and scp-style user@host:path.
 */
export function isAllowedRepoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("-")) return false;
  // Reject git's remote-helper syntax (ext::, fd::, etc.) outright.
  if (/^[A-Za-z0-9]+::/.test(trimmed)) return false;

  if (trimmed.startsWith("https://") || trimmed.startsWith("ssh://")) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return false;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "ssh:") return false;
    if (!parsed.hostname) return false;
    if (parsed.username && parsed.protocol === "https:") return false;
    return URL_PATH_PATTERN.test(parsed.pathname);
  }

  return SCP_REMOTE_PATTERN.test(trimmed);
}

export const REPO_URL_REQUIREMENTS =
  "repoUrl must be an https://, ssh://, or git@host:path git remote URL";

/** Throw when `url` is not a safe git remote (sandbox-layer guard). */
export function assertSafeRepoUrl(url: string): void {
  if (!isAllowedRepoUrl(url)) {
    throw new Error(`Refusing to clone unsafe repo URL: ${REPO_URL_REQUIREMENTS}`);
  }
}
