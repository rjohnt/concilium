/**
 * maybeCreateBuildPullRequest — the gate between a pushed build branch and a
 * real GitHub PR. Verifies gating (create_pr && pushed && repoUrl), the PR
 * payload (title/body/branches), the success artifact, and failure isolation
 * (missing token / API errors become log artifacts, never throws).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Project } from "../../types";

const mocks = vi.hoisted(() => ({
  createPullRequest: vi.fn(),
  getToken: vi.fn(),
}));

vi.mock("../pull-request", () => ({
  createPullRequest: mocks.createPullRequest,
}));

vi.mock("../token-provider", () => ({
  getGitHubTokenProvider: () => ({ name: "mock", getToken: mocks.getToken }),
}));

import {
  maybeCreateBuildPullRequest,
  buildPullRequestBody,
  PULL_REQUEST_ARTIFACT_LABEL,
} from "../build-pr";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "PRJ-001",
    name: "Acme App",
    repoUrl: "https://github.com/acme/app.git",
    defaultBranch: "main",
    sandboxProvider: "local",
    createPr: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeParams(overrides: Partial<Parameters<typeof maybeCreateBuildPullRequest>[0]> = {}) {
  return {
    project: makeProject(),
    pushed: true,
    headBranch: "concilium/tix-001",
    baseBranch: "main",
    ticket: { title: "Test feature" },
    report: { implementationPlan: "the plan", consensusSummary: "the summary" },
    buildId: "BLD-007",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getToken.mockResolvedValue("ghp_test");
  mocks.createPullRequest.mockResolvedValue({
    url: "https://github.com/acme/app/pull/42",
    number: 42,
  });
});

describe("gating", () => {
  it("creates a PR when create_pr is enabled and the push succeeded", async () => {
    const artifact = await maybeCreateBuildPullRequest(makeParams());

    expect(mocks.createPullRequest).toHaveBeenCalledWith({
      repoUrl: "https://github.com/acme/app.git",
      head: "concilium/tix-001",
      base: "main",
      title: "Test feature",
      body: buildPullRequestBody({
        implementationPlan: "the plan",
        consensusSummary: "the summary",
      }),
      token: "ghp_test",
    });
    expect(artifact).toMatchObject({
      type: "report",
      label: PULL_REQUEST_ARTIFACT_LABEL,
      content: "https://github.com/acme/app/pull/42",
    });
  });

  it("does nothing when the project has create_pr disabled", async () => {
    const artifact = await maybeCreateBuildPullRequest(
      makeParams({ project: makeProject({ createPr: false }) })
    );
    expect(artifact).toBeNull();
    expect(mocks.createPullRequest).not.toHaveBeenCalled();
  });

  it("does nothing when the push did not happen", async () => {
    const artifact = await maybeCreateBuildPullRequest(makeParams({ pushed: false }));
    expect(artifact).toBeNull();
    expect(mocks.createPullRequest).not.toHaveBeenCalled();
  });

  it("does nothing for standalone tickets (no project)", async () => {
    const artifact = await maybeCreateBuildPullRequest(makeParams({ project: undefined }));
    expect(artifact).toBeNull();
    expect(mocks.createPullRequest).not.toHaveBeenCalled();
  });

  it("does nothing when the project has no repo URL", async () => {
    const artifact = await maybeCreateBuildPullRequest(
      makeParams({ project: makeProject({ repoUrl: null }) })
    );
    expect(artifact).toBeNull();
    expect(mocks.createPullRequest).not.toHaveBeenCalled();
  });
});

describe("failure isolation — never throws, always degrades to a log artifact", () => {
  it("records a skip artifact when no GitHub token is configured", async () => {
    mocks.getToken.mockResolvedValue(null);

    const artifact = await maybeCreateBuildPullRequest(makeParams());

    expect(mocks.createPullRequest).not.toHaveBeenCalled();
    expect(artifact).toMatchObject({ type: "log", label: "Pull request skipped" });
    expect(artifact?.content).toContain("GITHUB_TOKEN");
  });

  it("records a failure artifact when the GitHub API errors", async () => {
    mocks.createPullRequest.mockRejectedValue(new Error("403 rate limit exceeded"));

    const artifact = await maybeCreateBuildPullRequest(makeParams());

    expect(artifact).toMatchObject({ type: "log", label: "Pull request failed" });
    expect(artifact?.content).toContain("403 rate limit exceeded");
  });

  it("records a failure artifact when even the token provider throws", async () => {
    mocks.getToken.mockRejectedValue(new Error("vault unreachable"));

    const artifact = await maybeCreateBuildPullRequest(makeParams());

    expect(artifact).toMatchObject({ type: "log", label: "Pull request failed" });
    expect(artifact?.content).toContain("vault unreachable");
  });
});

describe("buildPullRequestBody", () => {
  it("contains the plan, the summary, and the Claude Code attribution line", () => {
    const body = buildPullRequestBody({
      implementationPlan: "step 1, step 2",
      consensusSummary: "everyone agreed",
    });

    expect(body).toContain("step 1, step 2");
    expect(body).toContain("everyone agreed");
    expect(body.endsWith("🤖 Generated with [Claude Code](https://claude.com/claude-code)")).toBe(
      true
    );
  });
});
