/**
 * Local sandbox provider — clone-vs-init workspace prep, work-branch naming,
 * exec exit-code handling, artifact harvesting, and push-with/without-remote.
 * child_process and fs are fully mocked; no real git runs.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";

const mocks = vi.hoisted(() => ({
  execFileMock: vi.fn(),
  mkdirSync: vi.fn(),
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("child_process", async () => {
  const { promisify } = await import("util");
  const execFile = (...args: unknown[]) => {
    const cb = args[args.length - 1] as (err: unknown, res?: unknown) => void;
    Promise.resolve()
      .then(() => mocks.execFileMock(...args.slice(0, -1)))
      .then(
        (res) => cb(null, res),
        (err) => cb(err)
      );
  };
  (execFile as unknown as Record<symbol, unknown>)[promisify.custom] = mocks.execFileMock;
  return { execFile, default: { execFile } };
});

vi.mock("fs", () => ({
  default: {
    mkdirSync: mocks.mkdirSync,
    existsSync: mocks.existsSync,
    readFileSync: mocks.readFileSync,
  },
  mkdirSync: mocks.mkdirSync,
  existsSync: mocks.existsSync,
  readFileSync: mocks.readFileSync,
}));

import { localSandboxProvider } from "../local-provider";
import { WorkspaceHandle } from "../types";

const ROOT = "/tmp/concilium-test-builds";
const WS = path.join(path.resolve(ROOT), "TIX-101");

function gitCalls(): string[][] {
  return mocks.execFileMock.mock.calls
    .filter(([cmd]) => cmd === "git")
    .map(([, args]) => args as string[]);
}

function makeHandle(overrides: Partial<WorkspaceHandle> = {}): WorkspaceHandle {
  return {
    provider: "local",
    ticketId: "TIX-101",
    path: WS,
    branch: "concilium/tix-101",
    repoUrl: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CONCILIUM_BUILD_WORKSPACE = ROOT;
  mocks.existsSync.mockReturnValue(false);
  mocks.execFileMock.mockResolvedValue({ stdout: "", stderr: "" });
});

afterEach(() => {
  delete process.env.CONCILIUM_BUILD_WORKSPACE;
});

describe("localSandboxProvider.createWorkspace", () => {
  it("falls back to git init for workspaces without a repoUrl, then checks out the work branch", async () => {
    const handle = await localSandboxProvider.createWorkspace({ ticketId: "TIX-101" });

    expect(mocks.mkdirSync).toHaveBeenCalledWith(WS, { recursive: true });
    expect(gitCalls()).toEqual([
      ["init", "-q"],
      ["checkout", "-B", "concilium/tix-101"],
    ]);
    expect(handle).toMatchObject({
      provider: "local",
      ticketId: "TIX-101",
      path: WS,
      branch: "concilium/tix-101",
      repoUrl: null,
    });
  });

  it("clones the repo on the target branch when repoUrl is set", async () => {
    const handle = await localSandboxProvider.createWorkspace({
      ticketId: "TIX-101",
      repoUrl: "https://github.com/acme/app.git",
      branch: "develop",
    });

    expect(gitCalls()).toEqual([
      ["clone", "--branch", "develop", "--", "https://github.com/acme/app.git", "."],
      ["checkout", "-B", "concilium/tix-101"],
    ]);
    expect(handle.repoUrl).toBe("https://github.com/acme/app.git");
    expect(handle.branch).toBe("concilium/tix-101");
  });

  it("clones without --branch when no branch is given", async () => {
    await localSandboxProvider.createWorkspace({
      ticketId: "TIX-101",
      repoUrl: "https://github.com/acme/app.git",
    });

    expect(gitCalls()[0]).toEqual(["clone", "--", "https://github.com/acme/app.git", "."]);
  });

  it.each([
    ["ext:: remote helper", 'ext::sh -c "touch /tmp/pwn"'],
    ["option-looking URL", "--upload-pack=touch /tmp/pwn"],
    ["file:// URL", "file:///etc/passwd"],
    ["plain http URL", "http://169.254.169.254/latest/meta-data"],
  ])("refuses to clone unsafe repo URLs (%s)", async (_label, repoUrl) => {
    await expect(
      localSandboxProvider.createWorkspace({ ticketId: "TIX-101", repoUrl })
    ).rejects.toThrow(/Refusing to clone unsafe repo URL/);
    expect(gitCalls()).not.toContainEqual(expect.arrayContaining(["clone"]));
  });

  it("lowercases the ticket id in the work branch name", async () => {
    const handle = await localSandboxProvider.createWorkspace({ ticketId: "TIX-042" });
    expect(handle.branch).toBe("concilium/tix-042");
  });

  it("reuses an existing workspace without cloning or re-initializing", async () => {
    mocks.existsSync.mockImplementation((p: string) => String(p).endsWith(".git"));

    await localSandboxProvider.createWorkspace({
      ticketId: "TIX-101",
      repoUrl: "https://github.com/acme/app.git",
      branch: "main",
    });

    expect(gitCalls()).toEqual([["checkout", "-B", "concilium/tix-101"]]);
  });

  it("surfaces clone failures as errors", async () => {
    mocks.execFileMock.mockRejectedValueOnce(
      Object.assign(new Error("clone failed"), {
        code: 128,
        stdout: "",
        stderr: "fatal: repository not found",
      })
    );

    await expect(
      localSandboxProvider.createWorkspace({
        ticketId: "TIX-101",
        repoUrl: "https://github.com/acme/missing.git",
        branch: "main",
      })
    ).rejects.toThrow(/repository not found/);
  });
});

describe("localSandboxProvider.exec", () => {
  it("runs the command in the workspace and returns exit code 0 on success", async () => {
    mocks.execFileMock.mockResolvedValueOnce({ stdout: "hello", stderr: "" });

    const result = await localSandboxProvider.exec(makeHandle(), ["echo", "hello"], {
      timeoutMs: 1000,
    });

    expect(mocks.execFileMock).toHaveBeenCalledWith(
      "echo",
      ["hello"],
      expect.objectContaining({ cwd: WS, timeout: 1000 })
    );
    expect(result).toEqual({ stdout: "hello", stderr: "", exitCode: 0 });
  });

  it("resolves with the exit code instead of throwing on non-zero exits", async () => {
    mocks.execFileMock.mockRejectedValueOnce(
      Object.assign(new Error("Command failed"), { code: 3, stdout: "out", stderr: "boom" })
    );

    const result = await localSandboxProvider.exec(makeHandle(), ["claude", "-p", "x"]);
    expect(result).toEqual({ stdout: "out", stderr: "boom", exitCode: 3 });
  });

  it("rethrows spawn failures (missing binary)", async () => {
    mocks.execFileMock.mockRejectedValueOnce(
      Object.assign(new Error("spawn claude ENOENT"), { code: "ENOENT" })
    );

    await expect(localSandboxProvider.exec(makeHandle(), ["claude", "-p", "x"])).rejects.toThrow(
      /ENOENT/
    );
  });
});

describe("localSandboxProvider.collectArtifacts", () => {
  it("harvests log, changed-file list, and diff artifacts", async () => {
    mocks.execFileMock.mockImplementation(async (cmd: string, args: string[]) => {
      if (cmd === "git" && args[0] === "log") {
        return { stdout: "commit abc\n src/app.ts | 3 +", stderr: "" };
      }
      if (cmd === "git" && args[0] === "show") {
        return { stdout: "diff --git a/src/app.ts b/src/app.ts", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    });

    const artifacts = await localSandboxProvider.collectArtifacts(makeHandle(), {
      buildId: "BLD-007",
      log: "agent summary",
    });

    expect(artifacts.map((a) => a.type)).toEqual(["log", "file-list", "diff"]);
    expect(artifacts[0].content).toBe("agent summary");
    expect(artifacts[0].id).toMatch(/^BLD-007-log-/);
    expect(artifacts[1].content).toContain("src/app.ts | 3 +");
    expect(artifacts[2].content).toContain("diff --git");
  });

  it("returns only the log artifact when the workspace repo has no commits", async () => {
    mocks.execFileMock.mockRejectedValue(
      Object.assign(new Error("bad revision"), { code: 128, stdout: "", stderr: "fatal" })
    );

    const artifacts = await localSandboxProvider.collectArtifacts(makeHandle(), {
      buildId: "BLD-007",
      log: "nothing committed",
    });

    expect(artifacts.map((a) => a.type)).toEqual(["log"]);
  });
});

describe("localSandboxProvider.pushBranch", () => {
  it("pushes to origin when a remote exists", async () => {
    mocks.execFileMock.mockImplementation(async (cmd: string, args: string[]) => {
      if (cmd === "git" && args[0] === "remote") return { stdout: "origin\n", stderr: "" };
      return { stdout: "", stderr: "" };
    });

    const result = await localSandboxProvider.pushBranch(makeHandle(), "concilium/tix-101");

    expect(gitCalls()).toContainEqual(["push", "-u", "origin", "concilium/tix-101"]);
    expect(result).toEqual({ pushed: true });
  });

  it("skips the defensive commit when the agent already committed everything", async () => {
    mocks.execFileMock.mockImplementation(async (cmd: string, args: string[]) => {
      if (cmd === "git" && args[0] === "remote") return { stdout: "origin\n", stderr: "" };
      // `git diff --cached --quiet` exits 0 → nothing staged
      return { stdout: "", stderr: "" };
    });

    await localSandboxProvider.pushBranch(makeHandle(), "concilium/tix-101");

    expect(gitCalls()).toContainEqual(["add", "-A"]);
    expect(gitCalls().some((args) => args.includes("commit"))).toBe(false);
  });

  it("sweeps uncommitted work into a commit with an explicit identity before pushing", async () => {
    mocks.execFileMock.mockImplementation(async (cmd: string, args: string[]) => {
      if (cmd === "git" && args[0] === "remote") return { stdout: "origin\n", stderr: "" };
      if (cmd === "git" && args[0] === "diff") {
        // staged changes present → diff --cached --quiet exits 1
        throw Object.assign(new Error("dirty"), { code: 1, stdout: "", stderr: "" });
      }
      return { stdout: "", stderr: "" };
    });

    const result = await localSandboxProvider.pushBranch(makeHandle(), "concilium/tix-101");

    const commitCall = gitCalls().find((args) => args.includes("commit"));
    expect(commitCall).toEqual([
      "-c",
      "user.name=Concilium Build",
      "-c",
      "user.email=builds@concilium.local",
      "commit",
      "-m",
      "concilium: build output for concilium/tix-101",
    ]);
    // commit happens before the push
    const calls = gitCalls();
    expect(calls.indexOf(commitCall!)).toBeLessThan(
      calls.findIndex((args) => args[0] === "push")
    );
    expect(result).toEqual({ pushed: true });
  });

  it("returns pushed:false when the defensive commit fails", async () => {
    mocks.execFileMock.mockImplementation(async (cmd: string, args: string[]) => {
      if (cmd === "git" && args[0] === "remote") return { stdout: "origin\n", stderr: "" };
      if (cmd === "git" && args[0] === "diff") {
        throw Object.assign(new Error("dirty"), { code: 1, stdout: "", stderr: "" });
      }
      if (cmd === "git" && args.includes("commit")) {
        throw Object.assign(new Error("commit failed"), {
          code: 128,
          stdout: "",
          stderr: "fatal: could not write commit",
        });
      }
      return { stdout: "", stderr: "" };
    });

    const result = await localSandboxProvider.pushBranch(makeHandle(), "concilium/tix-101");

    expect(result.pushed).toBe(false);
    expect(result.reason).toMatch(/could not write commit/);
    expect(gitCalls().some((args) => args[0] === "push")).toBe(false);
  });

  it("returns pushed:false with a reason when no remote is configured", async () => {
    mocks.execFileMock.mockResolvedValue({ stdout: "", stderr: "" });

    const result = await localSandboxProvider.pushBranch(makeHandle(), "concilium/tix-101");

    expect(result.pushed).toBe(false);
    expect(result.reason).toMatch(/no 'origin' remote/);
    expect(gitCalls()).not.toContainEqual(["push", "-u", "origin", "concilium/tix-101"]);
  });

  it("returns pushed:false with the git error when the push is rejected", async () => {
    mocks.execFileMock.mockImplementation(async (cmd: string, args: string[]) => {
      if (cmd === "git" && args[0] === "remote") return { stdout: "origin\n", stderr: "" };
      if (cmd === "git" && args[0] === "push") {
        throw Object.assign(new Error("push failed"), {
          code: 1,
          stdout: "",
          stderr: "remote: permission denied",
        });
      }
      return { stdout: "", stderr: "" };
    });

    const result = await localSandboxProvider.pushBranch(makeHandle(), "concilium/tix-101");

    expect(result.pushed).toBe(false);
    expect(result.reason).toMatch(/permission denied/);
  });
});

describe("localSandboxProvider.destroy", () => {
  it("keeps the workspace (no commands run)", async () => {
    await localSandboxProvider.destroy(makeHandle());
    expect(mocks.execFileMock).not.toHaveBeenCalled();
  });
});
