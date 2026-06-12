/**
 * Docker sandbox provider — docker-availability gate, devcontainer image
 * detection, and the exact `docker run` argv (bind mount, workdir, resource
 * limits). child_process and fs are fully mocked; no real docker runs.
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

import {
  dockerSandboxProvider,
  DEFAULT_DOCKER_IMAGE,
  DOCKER_UNAVAILABLE_MESSAGE,
} from "../docker-provider";
import { WorkspaceHandle } from "../types";

const ROOT = "/tmp/concilium-test-builds";
const WS = path.join(path.resolve(ROOT), "TIX-202");
const DEVCONTAINER = path.join(WS, ".devcontainer", "devcontainer.json");

function makeHandle(overrides: Partial<WorkspaceHandle> = {}): WorkspaceHandle {
  return {
    provider: "docker",
    ticketId: "TIX-202",
    path: WS,
    branch: "concilium/tix-202",
    repoUrl: null,
    image: DEFAULT_DOCKER_IMAGE,
    ...overrides,
  };
}

// Credential vars the provider forwards into containers — snapshot/clear so
// the host machine's real ANTHROPIC_*/CLAUDE_* env never leaks into argv
// assertions, and restore afterwards.
const FORWARDED_ENV_PATTERN = /^(ANTHROPIC_|CLAUDE_)/;
let savedForwardedEnv: Record<string, string> = {};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CONCILIUM_BUILD_WORKSPACE = ROOT;
  savedForwardedEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && FORWARDED_ENV_PATTERN.test(key)) {
      savedForwardedEnv[key] = value;
      delete process.env[key];
    }
  }
  mocks.existsSync.mockReturnValue(false);
  mocks.execFileMock.mockResolvedValue({ stdout: "", stderr: "" });
});

afterEach(() => {
  delete process.env.CONCILIUM_BUILD_WORKSPACE;
  delete process.env.CONCILIUM_SANDBOX_MEMORY;
  delete process.env.CONCILIUM_SANDBOX_CPUS;
  delete process.env.ANTHROPIC_API_KEY;
  Object.assign(process.env, savedForwardedEnv);
});

describe("dockerSandboxProvider.createWorkspace", () => {
  it("fails with a clear user-facing error when docker is not installed", async () => {
    mocks.execFileMock.mockRejectedValueOnce(
      Object.assign(new Error("spawn docker ENOENT"), { code: "ENOENT" })
    );

    await expect(dockerSandboxProvider.createWorkspace({ ticketId: "TIX-202" })).rejects.toThrow(
      DOCKER_UNAVAILABLE_MESSAGE
    );
    // No workspace prep happened
    expect(mocks.mkdirSync).not.toHaveBeenCalled();
  });

  it("fails the same way when the docker daemon is not running", async () => {
    mocks.execFileMock.mockRejectedValueOnce(
      Object.assign(new Error("docker info failed"), {
        code: 1,
        stdout: "",
        stderr: "Cannot connect to the Docker daemon",
      })
    );

    await expect(dockerSandboxProvider.createWorkspace({ ticketId: "TIX-202" })).rejects.toThrow(
      /Docker is not available/
    );
  });

  it("prepares the workspace and uses the default image without a devcontainer", async () => {
    const handle = await dockerSandboxProvider.createWorkspace({
      ticketId: "TIX-202",
      repoUrl: "https://github.com/acme/app.git",
      branch: "main",
    });

    expect(mocks.execFileMock).toHaveBeenCalledWith("docker", ["info"], expect.anything());
    expect(mocks.execFileMock).toHaveBeenCalledWith(
      "git",
      ["clone", "--branch", "main", "--", "https://github.com/acme/app.git", "."],
      expect.objectContaining({ cwd: WS })
    );
    expect(handle.provider).toBe("docker");
    expect(handle.image).toBe(DEFAULT_DOCKER_IMAGE);
  });

  it("uses the devcontainer image when .devcontainer/devcontainer.json declares one", async () => {
    mocks.existsSync.mockImplementation((p: string) => String(p) === DEVCONTAINER);
    mocks.readFileSync.mockReturnValue(
      `{\n  // project dev image\n  "image": "python:3.12-bookworm"\n}`
    );

    const handle = await dockerSandboxProvider.createWorkspace({ ticketId: "TIX-202" });

    expect(mocks.readFileSync).toHaveBeenCalledWith(DEVCONTAINER, "utf8");
    expect(handle.image).toBe("python:3.12-bookworm");
  });

  it("falls back to the default image when devcontainer.json is malformed", async () => {
    mocks.existsSync.mockImplementation((p: string) => String(p) === DEVCONTAINER);
    mocks.readFileSync.mockReturnValue("{ not json at all");

    const handle = await dockerSandboxProvider.createWorkspace({ ticketId: "TIX-202" });
    expect(handle.image).toBe(DEFAULT_DOCKER_IMAGE);
  });
});

describe("dockerSandboxProvider.exec", () => {
  it("builds the docker run argv with bind mount, workdir, and resource limits", async () => {
    mocks.execFileMock.mockResolvedValueOnce({ stdout: "hi", stderr: "" });

    const result = await dockerSandboxProvider.exec(makeHandle(), ["echo", "hi"], {
      timeoutMs: 5000,
    });

    expect(mocks.execFileMock).toHaveBeenCalledWith(
      "docker",
      [
        "run",
        "--rm",
        "--memory",
        "2g",
        "--cpus",
        "2",
        "-v",
        `${WS}:/workspace`,
        "-w",
        "/workspace",
        DEFAULT_DOCKER_IMAGE,
        "echo",
        "hi",
      ],
      expect.objectContaining({ timeout: 5000 })
    );
    expect(result).toEqual({ stdout: "hi", stderr: "", exitCode: 0 });
  });

  it("uses the handle's devcontainer image and passes env vars as -e flags", async () => {
    await dockerSandboxProvider.exec(
      makeHandle({ image: "python:3.12-bookworm" }),
      ["pytest"],
      { env: { CI: "1" } }
    );

    const [, args] = mocks.execFileMock.mock.calls[0];
    expect(args).toContain("python:3.12-bookworm");
    const eIndex = (args as string[]).indexOf("-e");
    expect(eIndex).toBeGreaterThan(-1);
    expect((args as string[])[eIndex + 1]).toBe("CI=1");
    // env flags come before the image, command after it
    expect((args as string[]).indexOf("python:3.12-bookworm")).toBeGreaterThan(eIndex);
    expect((args as string[]).indexOf("pytest")).toBeGreaterThan(
      (args as string[]).indexOf("python:3.12-bookworm")
    );
  });

  it("forwards host agent credentials (ANTHROPIC_*/CLAUDE_*) into the container", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-123";

    await dockerSandboxProvider.exec(makeHandle(), ["claude", "-p", "build it"]);

    const [, args] = mocks.execFileMock.mock.calls[0];
    expect(args).toEqual(
      expect.arrayContaining(["-e", "ANTHROPIC_API_KEY=sk-ant-test-123"])
    );
    // forwarded credentials come before the image, like other -e flags
    expect((args as string[]).indexOf("-e")).toBeLessThan(
      (args as string[]).indexOf(DEFAULT_DOCKER_IMAGE)
    );
  });

  it("lets explicit exec env override forwarded host credentials", async () => {
    process.env.ANTHROPIC_API_KEY = "host-key";

    await dockerSandboxProvider.exec(makeHandle(), ["claude", "-p", "x"], {
      env: { ANTHROPIC_API_KEY: "explicit-key" },
    });

    const [, args] = mocks.execFileMock.mock.calls[0];
    expect(args).toEqual(expect.arrayContaining(["-e", "ANTHROPIC_API_KEY=explicit-key"]));
    expect(args).not.toEqual(expect.arrayContaining(["ANTHROPIC_API_KEY=host-key"]));
  });

  it("does not forward unrelated host env vars into the container", async () => {
    await dockerSandboxProvider.exec(makeHandle(), ["true"]);

    const [, args] = mocks.execFileMock.mock.calls[0];
    const envFlags = (args as string[]).filter((_, i, all) => all[i - 1] === "-e");
    expect(envFlags.some((v) => v.startsWith("PATH="))).toBe(false);
    expect(envFlags.some((v) => v.startsWith("HOME="))).toBe(false);
  });

  it("honors CONCILIUM_SANDBOX_MEMORY / CONCILIUM_SANDBOX_CPUS overrides", async () => {
    process.env.CONCILIUM_SANDBOX_MEMORY = "8g";
    process.env.CONCILIUM_SANDBOX_CPUS = "4";

    await dockerSandboxProvider.exec(makeHandle(), ["true"]);

    const [, args] = mocks.execFileMock.mock.calls[0];
    expect(args).toEqual(expect.arrayContaining(["--memory", "8g", "--cpus", "4"]));
  });

  it("resolves with the container exit code on non-zero exits", async () => {
    mocks.execFileMock.mockRejectedValueOnce(
      Object.assign(new Error("Command failed"), { code: 2, stdout: "", stderr: "tests failed" })
    );

    const result = await dockerSandboxProvider.exec(makeHandle(), ["npm", "test"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toBe("tests failed");
  });
});

describe("dockerSandboxProvider artifact/push parity with local", () => {
  it("harvests git artifacts from the bind-mounted workspace on the host", async () => {
    mocks.execFileMock.mockImplementation(async (cmd: string, args: string[]) => {
      if (cmd === "git" && args[0] === "log") return { stdout: "commit", stderr: "" };
      if (cmd === "git" && args[0] === "show") return { stdout: "diff --git", stderr: "" };
      return { stdout: "", stderr: "" };
    });

    const artifacts = await dockerSandboxProvider.collectArtifacts(makeHandle(), {
      buildId: "BLD-009",
      log: "container run log",
    });

    expect(artifacts.map((a) => a.type)).toEqual(["log", "file-list", "diff"]);
  });

  it("reports pushed:false when the workspace has no remote", async () => {
    const result = await dockerSandboxProvider.pushBranch(makeHandle(), "concilium/tix-202");
    expect(result.pushed).toBe(false);
    expect(result.reason).toMatch(/no 'origin' remote/);
  });
});
