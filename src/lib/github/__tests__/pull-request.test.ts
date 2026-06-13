/**
 * GitHub PR plumbing — repo-URL parsing and PR creation via a mocked
 * Octokit (no network, ever).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pullsCreate: vi.fn(),
  OctokitCtor: vi.fn(),
}));

vi.mock("@octokit/rest", () => ({
  Octokit: class {
    rest = { pulls: { create: mocks.pullsCreate } };
    constructor(opts: unknown) {
      mocks.OctokitCtor(opts);
    }
  },
}));

import { parseGitHubRepo, createPullRequest } from "../pull-request";

describe("parseGitHubRepo", () => {
  it("parses plain https URLs", () => {
    expect(parseGitHubRepo("https://github.com/acme/app")).toEqual({
      owner: "acme",
      repo: "app",
    });
  });

  it("parses https URLs with a .git suffix", () => {
    expect(parseGitHubRepo("https://github.com/acme/app.git")).toEqual({
      owner: "acme",
      repo: "app",
    });
  });

  it("parses ssh scp-style URLs (git@github.com:owner/repo.git)", () => {
    expect(parseGitHubRepo("git@github.com:acme/app.git")).toEqual({
      owner: "acme",
      repo: "app",
    });
  });

  it("parses ssh scp-style URLs without .git", () => {
    expect(parseGitHubRepo("git@github.com:acme/app")).toEqual({
      owner: "acme",
      repo: "app",
    });
  });

  it("parses ssh:// URLs", () => {
    expect(parseGitHubRepo("ssh://git@github.com/acme/app.git")).toEqual({
      owner: "acme",
      repo: "app",
    });
  });

  it("tolerates surrounding whitespace and a trailing slash", () => {
    expect(parseGitHubRepo("  https://github.com/acme/app/  ")).toEqual({
      owner: "acme",
      repo: "app",
    });
  });

  it("keeps dots and dashes in owner/repo names", () => {
    expect(parseGitHubRepo("https://github.com/my-org/my.repo-name.git")).toEqual({
      owner: "my-org",
      repo: "my.repo-name",
    });
  });

  it("rejects non-GitHub hosts and malformed URLs", () => {
    expect(parseGitHubRepo("https://gitlab.com/acme/app.git")).toBeNull();
    expect(parseGitHubRepo("git@bitbucket.org:acme/app.git")).toBeNull();
    expect(parseGitHubRepo("https://github.com/acme")).toBeNull();
    expect(parseGitHubRepo("not a url")).toBeNull();
    expect(parseGitHubRepo("")).toBeNull();
  });
});

describe("createPullRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pullsCreate.mockResolvedValue({
      data: { html_url: "https://github.com/acme/app/pull/42", number: 42 },
    });
  });

  it("authenticates with the token and opens the PR against the parsed owner/repo", async () => {
    const result = await createPullRequest({
      repoUrl: "git@github.com:acme/app.git",
      head: "concilium/tix-001",
      base: "main",
      title: "Test feature",
      body: "the body",
      token: "ghp_test",
    });

    expect(mocks.OctokitCtor).toHaveBeenCalledWith({ auth: "ghp_test" });
    expect(mocks.pullsCreate).toHaveBeenCalledWith({
      owner: "acme",
      repo: "app",
      head: "concilium/tix-001",
      base: "main",
      title: "Test feature",
      body: "the body",
    });
    expect(result).toEqual({ url: "https://github.com/acme/app/pull/42", number: 42 });
  });

  it("throws on a repo URL it cannot parse (before any API call)", async () => {
    await expect(
      createPullRequest({
        repoUrl: "https://gitlab.com/acme/app.git",
        head: "h",
        base: "b",
        title: "t",
        body: "",
        token: "ghp_test",
      })
    ).rejects.toThrow(/Cannot parse a GitHub owner\/repo/);
    expect(mocks.pullsCreate).not.toHaveBeenCalled();
  });

  it("propagates GitHub API errors (callers isolate them)", async () => {
    mocks.pullsCreate.mockRejectedValue(new Error("Validation Failed: PR already exists"));

    await expect(
      createPullRequest({
        repoUrl: "https://github.com/acme/app",
        head: "h",
        base: "b",
        title: "t",
        body: "",
        token: "ghp_test",
      })
    ).rejects.toThrow("Validation Failed");
  });
});
