/**
 * Daytona sandbox provider — hosted-sandbox lifecycle against a fully mocked
 * @daytonaio/sdk: config gating (DAYTONA_API_KEY), clone/exec/push/destroy
 * mapping, PAT auth, and sandbox cleanup on both success and failure paths.
 * The real Daytona API is never called.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const git = {
    clone: vi.fn(),
    add: vi.fn(),
    commit: vi.fn(),
    push: vi.fn(),
  };
  const proc = { executeCommand: vi.fn() };
  const sandbox = {
    id: "sbx-123",
    git,
    process: proc,
    getUserRootDir: vi.fn(),
    delete: vi.fn(),
  };
  const create = vi.fn();
  const DaytonaCtor = vi.fn(() => ({ create }));
  return { git, proc, sandbox, create, DaytonaCtor };
});

vi.mock("@daytonaio/sdk", () => ({ Daytona: mocks.DaytonaCtor }));

import { daytonaSandboxProvider, DAYTONA_NOT_CONFIGURED_MESSAGE } from "../daytona-provider";
import { SandboxProvider } from "../types";

// Type-level check: the provider satisfies the SandboxProvider contract.
const _typeCheck: SandboxProvider = daytonaSandboxProvider;
void _typeCheck;

const REPO_URL = "https://github.com/acme/app.git";

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.DAYTONA_API_KEY;
  delete process.env.DAYTONA_API_URL;
  delete process.env.DAYTONA_GIT_PAT;
  process.env.DAYTONA_API_KEY = "dtn_test_key";

  mocks.create.mockResolvedValue(mocks.sandbox);
  mocks.sandbox.getUserRootDir.mockResolvedValue("/home/daytona");
  mocks.sandbox.delete.mockResolvedValue(undefined);
  mocks.proc.executeCommand.mockResolvedValue({ exitCode: 0, result: "" });
  mocks.git.clone.mockResolvedValue(undefined);
  mocks.git.add.mockResolvedValue(undefined);
  mocks.git.commit.mockResolvedValue({ sha: "abc123" });
  mocks.git.push.mockResolvedValue(undefined);
});

function freshTicketId(): string {
  // Each test gets its own ticket so handles never collide in the provider's
  // active-sandbox registry.
  return `TIX-${Math.floor(Math.random() * 900 + 100)}`;
}

describe("daytonaSandboxProvider.createWorkspace", () => {
  it("throws a clear configuration error when DAYTONA_API_KEY is missing", async () => {
    delete process.env.DAYTONA_API_KEY;

    await expect(
      daytonaSandboxProvider.createWorkspace({ ticketId: "TIX-301" })
    ).rejects.toThrow(DAYTONA_NOT_CONFIGURED_MESSAGE);
    expect(mocks.DaytonaCtor).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates a sandbox and clones the repo on the requested branch", async () => {
    const ticketId = "TIX-301";
    const handle = await daytonaSandboxProvider.createWorkspace({
      ticketId,
      repoUrl: REPO_URL,
      branch: "main",
    });

    expect(mocks.DaytonaCtor).toHaveBeenCalledWith({ apiKey: "dtn_test_key" });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.git.clone).toHaveBeenCalledWith(
      REPO_URL,
      `/home/daytona/${ticketId}`,
      "main",
      undefined,
      undefined,
      undefined
    );
    // Work happens on the dedicated concilium branch
    expect(mocks.proc.executeCommand).toHaveBeenCalledWith(
      `git checkout -B concilium/${ticketId.toLowerCase()}`,
      `/home/daytona/${ticketId}`,
      undefined,
      undefined
    );
    expect(handle).toMatchObject({
      provider: "daytona",
      ticketId,
      path: `/home/daytona/${ticketId}`,
      branch: `concilium/${ticketId.toLowerCase()}`,
      repoUrl: REPO_URL,
      sandboxId: "sbx-123",
    });
  });

  it("passes DAYTONA_API_URL and PAT credentials when configured", async () => {
    process.env.DAYTONA_API_URL = "https://daytona.example.com/api";
    process.env.DAYTONA_GIT_PAT = "ghp_secret";

    await daytonaSandboxProvider.createWorkspace({
      ticketId: freshTicketId(),
      repoUrl: REPO_URL,
      branch: "develop",
    });

    expect(mocks.DaytonaCtor).toHaveBeenCalledWith({
      apiKey: "dtn_test_key",
      apiUrl: "https://daytona.example.com/api",
    });
    expect(mocks.git.clone).toHaveBeenCalledWith(
      REPO_URL,
      expect.any(String),
      "develop",
      undefined,
      "git",
      "ghp_secret"
    );
  });

  it("falls back to git init for standalone tickets without a repoUrl", async () => {
    const ticketId = freshTicketId();
    const handle = await daytonaSandboxProvider.createWorkspace({ ticketId });

    expect(mocks.git.clone).not.toHaveBeenCalled();
    const initCall = mocks.proc.executeCommand.mock.calls.find(([cmd]) =>
      String(cmd).includes("git -C")
    );
    expect(initCall?.[0]).toContain("init -q");
    expect(handle.repoUrl).toBeNull();
  });

  it("deletes the sandbox when workspace preparation fails (no leaked sandboxes)", async () => {
    mocks.git.clone.mockRejectedValueOnce(new Error("auth failed"));

    await expect(
      daytonaSandboxProvider.createWorkspace({
        ticketId: freshTicketId(),
        repoUrl: REPO_URL,
      })
    ).rejects.toThrow("auth failed");
    expect(mocks.sandbox.delete).toHaveBeenCalledTimes(1);
  });
});

describe("daytonaSandboxProvider.exec", () => {
  it("maps exec to remote command execution with cwd, env, and timeout", async () => {
    const handle = await daytonaSandboxProvider.createWorkspace({ ticketId: freshTicketId() });
    mocks.proc.executeCommand.mockResolvedValueOnce({ exitCode: 0, result: "hello" });

    const result = await daytonaSandboxProvider.exec(handle, ["echo", "hello world"], {
      timeoutMs: 5000,
      env: { CI: "1" },
    });

    expect(mocks.proc.executeCommand).toHaveBeenLastCalledWith(
      "echo 'hello world'",
      handle.path,
      { CI: "1" },
      5
    );
    expect(result).toEqual({ stdout: "hello", stderr: "", exitCode: 0 });
  });

  it("resolves (does not throw) on non-zero exit codes", async () => {
    const handle = await daytonaSandboxProvider.createWorkspace({ ticketId: freshTicketId() });
    mocks.proc.executeCommand.mockResolvedValueOnce({ exitCode: 2, result: "tests failed" });

    const result = await daytonaSandboxProvider.exec(handle, ["npm", "test"]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("tests failed");
  });
});

describe("daytonaSandboxProvider.collectArtifacts", () => {
  it("harvests log, file-list, and diff artifacts via remote git commands", async () => {
    const handle = await daytonaSandboxProvider.createWorkspace({ ticketId: freshTicketId() });
    mocks.proc.executeCommand.mockImplementation(async (cmd: string) => {
      if (cmd.startsWith("git log")) return { exitCode: 0, result: "commit stats" };
      if (cmd.startsWith("git show")) return { exitCode: 0, result: "diff --git" };
      return { exitCode: 0, result: "" };
    });

    const artifacts = await daytonaSandboxProvider.collectArtifacts(handle, {
      buildId: "BLD-042",
      log: "sandbox run log",
    });

    expect(artifacts.map((a) => a.type)).toEqual(["log", "file-list", "diff"]);
    expect(artifacts[0].content).toBe("sandbox run log");
    expect(artifacts[2].content).toBe("diff --git");
  });

  it("skips git artifacts when the workspace has no commits", async () => {
    const handle = await daytonaSandboxProvider.createWorkspace({ ticketId: freshTicketId() });
    mocks.proc.executeCommand.mockImplementation(async (cmd: string) => {
      if (cmd.startsWith("git log") || cmd.startsWith("git show")) {
        return { exitCode: 128, result: "" };
      }
      return { exitCode: 0, result: "" };
    });

    const artifacts = await daytonaSandboxProvider.collectArtifacts(handle, {
      buildId: "BLD-042",
      log: "ran but committed nothing",
    });
    expect(artifacts.map((a) => a.type)).toEqual(["log"]);
  });
});

describe("daytonaSandboxProvider.pushBranch", () => {
  it("stages, commits, and pushes the work branch with PAT auth", async () => {
    process.env.DAYTONA_GIT_PAT = "ghp_secret";
    const handle = await daytonaSandboxProvider.createWorkspace({
      ticketId: freshTicketId(),
      repoUrl: REPO_URL,
    });

    const result = await daytonaSandboxProvider.pushBranch(handle, handle.branch);

    expect(mocks.git.add).toHaveBeenCalledWith(handle.path, ["."]);
    expect(mocks.git.commit).toHaveBeenCalledWith(
      handle.path,
      expect.stringContaining(handle.branch),
      expect.any(String),
      expect.any(String),
      true
    );
    expect(mocks.git.push).toHaveBeenCalledWith(handle.path, "git", "ghp_secret");
    expect(result).toEqual({ pushed: true });
  });

  it("reports pushed:false without a configured repo (never throws)", async () => {
    const handle = await daytonaSandboxProvider.createWorkspace({ ticketId: freshTicketId() });

    const result = await daytonaSandboxProvider.pushBranch(handle, handle.branch);
    expect(result.pushed).toBe(false);
    expect(result.reason).toMatch(/no 'origin' remote/);
    expect(mocks.git.push).not.toHaveBeenCalled();
  });

  it("reports pushed:false with the failure reason when the push errors", async () => {
    const handle = await daytonaSandboxProvider.createWorkspace({
      ticketId: freshTicketId(),
      repoUrl: REPO_URL,
    });
    mocks.git.push.mockRejectedValueOnce(new Error("remote rejected"));

    const result = await daytonaSandboxProvider.pushBranch(handle, handle.branch);
    expect(result.pushed).toBe(false);
    expect(result.reason).toContain("remote rejected");
  });
});

describe("daytonaSandboxProvider.destroy", () => {
  it("deletes the sandbox on the success path", async () => {
    const handle = await daytonaSandboxProvider.createWorkspace({ ticketId: freshTicketId() });

    await daytonaSandboxProvider.destroy(handle);
    expect(mocks.sandbox.delete).toHaveBeenCalledTimes(1);
  });

  it("deletes the sandbox even when execution throws (executor try/finally contract)", async () => {
    const handle = await daytonaSandboxProvider.createWorkspace({ ticketId: freshTicketId() });
    mocks.proc.executeCommand.mockRejectedValueOnce(new Error("connection lost"));

    // Mirrors the executor pipeline: exec inside try, destroy in finally.
    await expect(
      (async () => {
        try {
          await daytonaSandboxProvider.exec(handle, ["claude", "-p", "build it"]);
        } finally {
          await daytonaSandboxProvider.destroy(handle);
        }
      })()
    ).rejects.toThrow("connection lost");
    expect(mocks.sandbox.delete).toHaveBeenCalledTimes(1);
  });

  it("never throws when sandbox deletion fails (does not mask build errors)", async () => {
    const handle = await daytonaSandboxProvider.createWorkspace({ ticketId: freshTicketId() });
    mocks.sandbox.delete.mockRejectedValueOnce(new Error("already gone"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(daytonaSandboxProvider.destroy(handle)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("already gone"));
    warn.mockRestore();
  });

  it("is a no-op for handles whose sandbox was already destroyed", async () => {
    const handle = await daytonaSandboxProvider.createWorkspace({ ticketId: freshTicketId() });
    await daytonaSandboxProvider.destroy(handle);
    mocks.sandbox.delete.mockClear();

    await expect(daytonaSandboxProvider.destroy(handle)).resolves.toBeUndefined();
    expect(mocks.sandbox.delete).not.toHaveBeenCalled();
  });
});
