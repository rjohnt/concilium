/**
 * Shared host-side workspace plumbing for sandbox providers.
 *
 * Both the local and docker providers keep the workspace itself on the host
 * filesystem (docker bind-mounts it), so workspace preparation, artifact
 * harvesting, and branch pushing are common host-git operations that live
 * here. This is the only sandbox module that touches child_process.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { BuildArtifact } from "../types";
import { assertSafeRepoUrl } from "../git-url";
import {
  CollectArtifactsOptions,
  CreateWorkspaceOptions,
  ExecOptions,
  ExecResult,
  PushResult,
  WorkspaceHandle,
  workBranchName,
} from "./types";

const execFileAsync = promisify(execFile);

const ARTIFACT_CHAR_LIMIT = 20_000;
const DEFAULT_MAX_BUFFER = 32 * 1024 * 1024;

/** Git identity used for the defensive pre-push commit (kept in sync with the
 *  Daytona provider, which commits through the SDK with the same identity). */
export const COMMIT_AUTHOR = "Concilium Build";
export const COMMIT_EMAIL = "builds@concilium.local";

export function getWorkspaceRoot(): string {
  return process.env.CONCILIUM_BUILD_WORKSPACE
    ? path.resolve(process.env.CONCILIUM_BUILD_WORKSPACE)
    : path.resolve(process.cwd(), "data", "builds");
}

/**
 * Run an argv-style command on the host. Non-zero exits resolve with their
 * exit code; spawn failures (binary missing, timeout) still throw.
 */
export async function runHostCommand(
  command: string[],
  opts: ExecOptions & { cwd?: string } = {}
): Promise<ExecResult> {
  const [bin, ...args] = command;
  try {
    const { stdout, stderr } = await execFileAsync(bin, args, {
      cwd: opts.cwd,
      timeout: opts.timeoutMs,
      maxBuffer: opts.maxBuffer ?? DEFAULT_MAX_BUFFER,
      env: opts.env ? { ...process.env, ...opts.env } : undefined,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    const e = err as Error & { code?: number | string; stdout?: string; stderr?: string };
    if (typeof e.code === "number") {
      return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", exitCode: e.code };
    }
    throw err;
  }
}

async function git(cwd: string, args: string[]): Promise<ExecResult> {
  return runHostCommand(["git", ...args], { cwd });
}

async function gitOrThrow(cwd: string, args: string[]): Promise<ExecResult> {
  const result = await git(cwd, args);
  if (result.exitCode !== 0) {
    throw new Error(
      `git ${args[0]} failed (exit ${result.exitCode}): ${result.stderr.trim() || result.stdout.trim()}`
    );
  }
  return result;
}

/**
 * Prepare the per-ticket workspace: clone the project repo when configured
 * (first run only — reused across build rounds), otherwise init an empty
 * repo, then check out the concilium/<ticketId> work branch.
 */
export async function prepareGitWorkspace(
  provider: string,
  opts: CreateWorkspaceOptions
): Promise<WorkspaceHandle> {
  const workspace = path.join(getWorkspaceRoot(), opts.ticketId);
  fs.mkdirSync(workspace, { recursive: true });

  const repoUrl = opts.repoUrl ?? null;
  const branch = workBranchName(opts.ticketId);

  if (!fs.existsSync(path.join(workspace, ".git"))) {
    if (repoUrl) {
      // Defense in depth: the API boundary validates repoUrl, but never hand
      // git anything that could select a remote helper (ext::), read local
      // files (file://), or be parsed as an option (leading dash). The `--`
      // separator ends option parsing before the URL.
      assertSafeRepoUrl(repoUrl);
      const cloneBranch = opts.branch?.trim();
      await gitOrThrow(workspace, [
        "clone",
        ...(cloneBranch ? ["--branch", cloneBranch] : []),
        "--",
        repoUrl,
        ".",
      ]);
    } else {
      await gitOrThrow(workspace, ["init", "-q"]);
    }
  }

  // All build work happens on a dedicated branch (idempotent across rounds).
  await gitOrThrow(workspace, ["checkout", "-B", branch]);

  return { provider, ticketId: opts.ticketId, path: workspace, branch, repoUrl };
}

function truncate(text: string): string {
  return text.length > ARTIFACT_CHAR_LIMIT
    ? text.slice(0, ARTIFACT_CHAR_LIMIT) + "\n… [truncated]"
    : text;
}

export function makeArtifact(
  buildId: string,
  type: BuildArtifact["type"],
  label: string,
  content: string
): BuildArtifact {
  return {
    id: `${buildId}-${type}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    label,
    content: truncate(content),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Harvest build evidence — optional log, changed-file list, and diff — via an
 * arbitrary exec function, so every provider (host git for local/docker,
 * remote exec for Daytona) shares one artifact pipeline.
 */
export async function collectArtifactsViaExec(
  run: (command: string[]) => Promise<ExecResult>,
  opts: CollectArtifactsOptions
): Promise<BuildArtifact[]> {
  const artifacts: BuildArtifact[] = [];

  if (opts.log !== undefined) {
    artifacts.push(makeArtifact(opts.buildId, "log", "Claude Code build log", opts.log));
  }

  const failed: ExecResult = { stdout: "", stderr: "", exitCode: 1 };

  const fileList = await run(["git", "log", "--stat", "-1"]).catch(() => failed);
  if (fileList.exitCode === 0 && fileList.stdout.trim()) {
    artifacts.push(
      makeArtifact(opts.buildId, "file-list", "Changed files (last commit)", fileList.stdout)
    );
  }

  const diff = await run(["git", "show", "--format=", "HEAD"]).catch(() => failed);
  if (diff.exitCode === 0 && diff.stdout.trim()) {
    artifacts.push(makeArtifact(opts.buildId, "diff", "Implementation diff", diff.stdout));
  }

  return artifacts;
}

/** Harvest build evidence from a host-filesystem workspace. */
export async function collectGitArtifacts(
  handle: WorkspaceHandle,
  opts: CollectArtifactsOptions
): Promise<BuildArtifact[]> {
  return collectArtifactsViaExec(
    (command) => runHostCommand(command, { cwd: handle.path }),
    opts
  );
}

/**
 * Push the work branch to origin; no-op result when no remote exists.
 *
 * Before pushing, defensively sweep up anything the build agent left
 * uncommitted — with an explicit git identity, since a fresh clone (clean
 * sandbox/CI) has none configured. Mirrors the Daytona provider's
 * add/commit/push sequence so all providers push equivalent branches.
 */
export async function pushBranchToOrigin(
  handle: WorkspaceHandle,
  branchName: string
): Promise<PushResult> {
  try {
    const remotes = await git(handle.path, ["remote"]);
    const names = remotes.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (remotes.exitCode !== 0 || !names.includes("origin")) {
      return { pushed: false, reason: "no 'origin' remote configured for this workspace" };
    }

    await git(handle.path, ["add", "-A"]);
    const staged = await git(handle.path, ["diff", "--cached", "--quiet"]);
    if (staged.exitCode !== 0) {
      const commit = await git(handle.path, [
        "-c",
        `user.name=${COMMIT_AUTHOR}`,
        "-c",
        `user.email=${COMMIT_EMAIL}`,
        "commit",
        "-m",
        `concilium: build output for ${branchName}`,
      ]);
      if (commit.exitCode !== 0) {
        return {
          pushed: false,
          reason: `git commit failed (exit ${commit.exitCode}): ${commit.stderr.trim() || commit.stdout.trim()}`,
        };
      }
    }

    const push = await git(handle.path, ["push", "-u", "origin", branchName]);
    if (push.exitCode !== 0) {
      return {
        pushed: false,
        reason: `git push failed (exit ${push.exitCode}): ${push.stderr.trim()}`,
      };
    }
    return { pushed: true };
  } catch (err) {
    return {
      pushed: false,
      reason: `git push failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
