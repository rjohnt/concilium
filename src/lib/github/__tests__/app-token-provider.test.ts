import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { generateKeyPairSync } from "crypto";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  appGitHubTokenProvider,
  clearAppTokenCache,
  getAppConfig,
} from "../app-token-provider";
import { Project } from "../../types";

const { mockGetRepoInstallation, mockCreateInstallationAccessToken, mockOctokit, mockCreateAppAuth } =
  vi.hoisted(() => {
    const mockGetRepoInstallation = vi.fn();
    const mockCreateInstallationAccessToken = vi.fn();
    const mockOctokit = vi.fn(() => ({
      rest: {
        apps: {
          getRepoInstallation: mockGetRepoInstallation,
          createInstallationAccessToken: mockCreateInstallationAccessToken,
        },
      },
    }));
    const mockCreateAppAuth = vi.fn();
    return { mockGetRepoInstallation, mockCreateInstallationAccessToken, mockOctokit, mockCreateAppAuth };
  });

vi.mock("@octokit/rest", () => ({ Octokit: mockOctokit }));
vi.mock("@octokit/auth-app", () => ({ createAppAuth: mockCreateAppAuth }));

// A real PKCS#1 RSA key, as GitHub serves them ("BEGIN RSA PRIVATE KEY").
const pkcs1Pem = generateKeyPairSync("rsa", { modulusLength: 2048 })
  .privateKey.export({ type: "pkcs1", format: "pem" })
  .toString();

const project: Project = {
  id: "PRJ-001",
  name: "Acme App",
  repoUrl: "https://github.com/acme/app.git",
  defaultBranch: "main",
  sandboxProvider: "local",
  createPr: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function stubAppEnv() {
  vi.stubEnv("GITHUB_APP_ID", "4033787");
  vi.stubEnv("GITHUB_APP_PRIVATE_KEY", pkcs1Pem);
}

function stubInstallationApi() {
  mockGetRepoInstallation.mockResolvedValue({ data: { id: 555 } });
  mockCreateInstallationAccessToken.mockResolvedValue({
    data: {
      token: "ghs_installation_token",
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  });
}

beforeEach(() => {
  clearAppTokenCache();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("getAppConfig", () => {
  it("returns null when GITHUB_APP_ID is unset", () => {
    vi.stubEnv("GITHUB_APP_ID", "");
    expect(getAppConfig()).toBeNull();
  });

  it("returns null when the app id is set but no key is provided", () => {
    vi.stubEnv("GITHUB_APP_ID", "4033787");
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY", "");
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY_PATH", "");
    expect(getAppConfig()).toBeNull();
  });

  it("normalizes an inline PKCS#1 key (with \\n-escaped newlines) to PKCS#8", () => {
    vi.stubEnv("GITHUB_APP_ID", "4033787");
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY", pkcs1Pem.replace(/\n/g, "\\n"));
    const config = getAppConfig();
    expect(config?.appId).toBe("4033787");
    expect(config?.privateKey).toContain("BEGIN PRIVATE KEY");
  });

  it("loads the key from GITHUB_APP_PRIVATE_KEY_PATH", () => {
    const dir = mkdtempSync(join(tmpdir(), "concilium-app-key-"));
    const keyPath = join(dir, "app.pem");
    writeFileSync(keyPath, pkcs1Pem);
    vi.stubEnv("GITHUB_APP_ID", "4033787");
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY", "");
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY_PATH", keyPath);
    expect(getAppConfig()?.privateKey).toContain("BEGIN PRIVATE KEY");
  });

  it("warns and returns null when the key path is unreadable", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("GITHUB_APP_ID", "4033787");
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY", "");
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY_PATH", "/nonexistent/app.pem");
    expect(getAppConfig()).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});

describe("appGitHubTokenProvider.getToken", () => {
  it("returns null without app config (never throws)", async () => {
    vi.stubEnv("GITHUB_APP_ID", "");
    expect(await appGitHubTokenProvider.getToken(project)).toBeNull();
    expect(mockOctokit).not.toHaveBeenCalled();
  });

  it("returns null for a project without a parseable GitHub repo URL", async () => {
    stubAppEnv();
    expect(
      await appGitHubTokenProvider.getToken({ ...project, repoUrl: null })
    ).toBeNull();
    expect(
      await appGitHubTokenProvider.getToken({ ...project, repoUrl: "https://gitlab.com/a/b" })
    ).toBeNull();
    expect(mockOctokit).not.toHaveBeenCalled();
  });

  it("mints an installation token scoped to the project's repository", async () => {
    stubAppEnv();
    stubInstallationApi();

    const token = await appGitHubTokenProvider.getToken(project);

    expect(token).toBe("ghs_installation_token");
    expect(mockGetRepoInstallation).toHaveBeenCalledWith({ owner: "acme", repo: "app" });
    expect(mockCreateInstallationAccessToken).toHaveBeenCalledWith({
      installation_id: 555,
      repositories: ["app"],
    });
    // Authenticates as the app (JWT strategy), not with a static token.
    expect(mockOctokit).toHaveBeenCalledWith(
      expect.objectContaining({
        authStrategy: mockCreateAppAuth,
        auth: expect.objectContaining({ appId: "4033787" }),
      })
    );
  });

  it("caches the token per repo until expiry", async () => {
    stubAppEnv();
    stubInstallationApi();

    await appGitHubTokenProvider.getToken(project);
    const again = await appGitHubTokenProvider.getToken(project);

    expect(again).toBe("ghs_installation_token");
    expect(mockGetRepoInstallation).toHaveBeenCalledTimes(1);
    expect(mockCreateInstallationAccessToken).toHaveBeenCalledTimes(1);
  });

  it("re-mints when the cached token is within the expiry margin", async () => {
    stubAppEnv();
    mockGetRepoInstallation.mockResolvedValue({ data: { id: 555 } });
    mockCreateInstallationAccessToken.mockResolvedValue({
      data: {
        token: "ghs_nearly_expired",
        // Inside the 5-minute refresh margin.
        expires_at: new Date(Date.now() + 60 * 1000).toISOString(),
      },
    });

    await appGitHubTokenProvider.getToken(project);
    await appGitHubTokenProvider.getToken(project);

    expect(mockCreateInstallationAccessToken).toHaveBeenCalledTimes(2);
  });

  it("returns null with a warning when the app is not installed on the repo (404)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubAppEnv();
    mockGetRepoInstallation.mockRejectedValue(
      Object.assign(new Error("Not Found"), { status: 404 })
    );

    expect(await appGitHubTokenProvider.getToken(project)).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("not installed on acme/app"));
    warn.mockRestore();
  });

  it("returns null (never throws) on other API errors", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubAppEnv();
    mockGetRepoInstallation.mockRejectedValue(
      Object.assign(new Error("boom"), { status: 500 })
    );

    expect(await appGitHubTokenProvider.getToken(project)).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("failed: boom"));
    warn.mockRestore();
  });
});
