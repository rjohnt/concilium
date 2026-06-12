import { describe, it, expect, afterEach, vi } from "vitest";
import { envGitHubTokenProvider, getGitHubTokenProvider } from "../token-provider";
import { Project } from "../../types";

const project: Project = {
  id: "PRJ-001",
  name: "Acme App",
  repoUrl: "https://github.com/acme/app.git",
  defaultBranch: "main",
  sandboxProvider: "local",
  createPr: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("envGitHubTokenProvider", () => {
  it("returns the GITHUB_TOKEN env var", async () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_abc123");
    expect(await envGitHubTokenProvider.getToken(project)).toBe("ghp_abc123");
  });

  it("returns null when GITHUB_TOKEN is unset or blank", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    expect(await envGitHubTokenProvider.getToken(project)).toBeNull();

    vi.stubEnv("GITHUB_TOKEN", "   ");
    expect(await envGitHubTokenProvider.getToken(project)).toBeNull();
  });
});

describe("getGitHubTokenProvider", () => {
  it("selects the env provider in v1", () => {
    expect(getGitHubTokenProvider()).toBe(envGitHubTokenProvider);
  });
});
