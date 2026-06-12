/**
 * Docker sandbox provider — same workspace contract as the local provider,
 * but commands run inside a disposable container with the workspace
 * bind-mounted at /workspace.
 *
 * Image selection: if the cloned repo carries a devcontainer.json (at
 * .devcontainer/devcontainer.json or the repo root) with an "image" field,
 * that image is used; otherwise node:22-bookworm. Resource limits default to
 * --memory 2g / --cpus 2 (override with CONCILIUM_SANDBOX_MEMORY /
 * CONCILIUM_SANDBOX_CPUS).
 *
 * Git operations (clone, branch, artifact harvesting, push) happen on the
 * host against the bind-mounted workspace, exactly like the local provider.
 */

import fs from "fs";
import path from "path";
import { SandboxProvider, WorkspaceHandle } from "./types";
import {
  collectGitArtifacts,
  prepareGitWorkspace,
  pushBranchToOrigin,
  runHostCommand,
} from "./git-workspace";

export const DEFAULT_DOCKER_IMAGE = "node:22-bookworm";
const DEFAULT_MEMORY = "2g";
const DEFAULT_CPUS = "2";

export const DOCKER_UNAVAILABLE_MESSAGE =
  "Docker is not available on this machine. Start Docker (or install Docker Desktop), " +
  "or switch this project's sandbox provider to 'local' in Project Settings.";

/** devcontainer.json is JSONC — strip comments before parsing. */
function stripJsonComments(raw: string): string {
  return raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function detectDevcontainerImage(workspacePath: string): string {
  const candidates = [
    path.join(workspacePath, ".devcontainer", "devcontainer.json"),
    path.join(workspacePath, "devcontainer.json"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const parsed = JSON.parse(stripJsonComments(fs.readFileSync(file, "utf8"))) as {
        image?: unknown;
      };
      if (typeof parsed.image === "string" && parsed.image.trim()) {
        return parsed.image.trim();
      }
    } catch {
      // Malformed devcontainer.json — fall through to the default image.
    }
  }
  return DEFAULT_DOCKER_IMAGE;
}

async function assertDockerAvailable(): Promise<void> {
  try {
    const info = await runHostCommand(["docker", "info"]);
    if (info.exitCode !== 0) throw new Error(info.stderr.trim());
  } catch {
    throw new Error(DOCKER_UNAVAILABLE_MESSAGE);
  }
}

export const dockerSandboxProvider: SandboxProvider = {
  name: "docker",

  async createWorkspace(opts): Promise<WorkspaceHandle> {
    await assertDockerAvailable();
    const handle = await prepareGitWorkspace("docker", opts);
    handle.image = detectDevcontainerImage(handle.path);
    return handle;
  },

  async exec(handle, command, opts = {}) {
    const envFlags = Object.entries(opts.env ?? {}).flatMap(([key, value]) => [
      "-e",
      `${key}=${value}`,
    ]);
    const dockerArgv = [
      "docker",
      "run",
      "--rm",
      "--memory",
      process.env.CONCILIUM_SANDBOX_MEMORY || DEFAULT_MEMORY,
      "--cpus",
      process.env.CONCILIUM_SANDBOX_CPUS || DEFAULT_CPUS,
      "-v",
      `${handle.path}:/workspace`,
      "-w",
      "/workspace",
      ...envFlags,
      handle.image ?? DEFAULT_DOCKER_IMAGE,
      ...command,
    ];
    return runHostCommand(dockerArgv, {
      timeoutMs: opts.timeoutMs,
      maxBuffer: opts.maxBuffer,
    });
  },

  async collectArtifacts(handle, opts) {
    return collectGitArtifacts(handle, opts);
  },

  async pushBranch(handle, branchName) {
    return pushBranchToOrigin(handle, branchName);
  },

  async destroy() {
    // Containers are run with --rm; the workspace persists for later rounds.
  },
};
