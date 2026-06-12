/**
 * Repo-URL validation — the allow-list that keeps project repoUrls from
 * reaching `git clone` as remote helpers (ext::), local paths (file://),
 * option-looking values (leading dash), or SSRF targets.
 */

import { describe, it, expect } from "vitest";
import { isAllowedRepoUrl, assertSafeRepoUrl } from "../git-url";

describe("isAllowedRepoUrl", () => {
  it.each([
    "https://github.com/acme/app.git",
    "https://github.com/acme/app",
    "https://gitlab.example.com/group/subgroup/repo.git",
    "ssh://git@github.com/acme/app.git",
    "ssh://git@github.com:2222/acme/app.git",
    "git@github.com:acme/app.git",
    "git@bitbucket.org:team/repo",
  ])("accepts %s", (url) => {
    expect(isAllowedRepoUrl(url)).toBe(true);
  });

  it.each([
    // git remote-helper command execution
    'ext::sh -c "touch /tmp/pwn"',
    "fd::17",
    // argument injection into git clone
    "--upload-pack=touch /tmp/pwn",
    "-oProxyCommand=evil",
    // local file read / SSRF
    "file:///etc/passwd",
    "http://169.254.169.254/latest/meta-data",
    "http://github.com/acme/app.git",
    // junk
    "",
    "   ",
    "not a url",
    "javascript:alert(1)",
    "https://",
    "https://user:pass@github.com/acme/app.git",
    "ftp://example.com/repo.git",
    "/absolute/local/path",
    "git@github.com:-leading/dash",
  ])("rejects %s", (url) => {
    expect(isAllowedRepoUrl(url)).toBe(false);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(isAllowedRepoUrl("  https://github.com/acme/app.git  ")).toBe(true);
  });
});

describe("assertSafeRepoUrl", () => {
  it("passes silently for an allowed URL", () => {
    expect(() => assertSafeRepoUrl("https://github.com/acme/app.git")).not.toThrow();
  });

  it("throws a clear error for a rejected URL", () => {
    expect(() => assertSafeRepoUrl("ext::sh -c id")).toThrow(
      /Refusing to clone unsafe repo URL/
    );
  });
});
