/**
 * Daytona sandbox provider — builds run in a hosted Daytona sandbox instead
 * of on this machine. Same SandboxProvider contract as local/docker, so the
 * executor pipeline is unchanged.
 *
 * Lifecycle: createWorkspace spins up a fresh Daytona sandbox and prepares
 * the per-ticket repo inside it (sandbox.git.clone when the project has a
 * repoUrl, plain `git init` otherwise), exec maps to Daytona's remote command
 * execution, pushBranch stages/commits/pushes via the sandbox git API, and
 * destroy deletes the sandbox (hosted sandboxes bill while alive, so unlike
 * local/docker workspaces they do NOT persist across build rounds).
 *
 * Config via env:
 *   DAYTONA_API_KEY  — required; createWorkspace throws a clear configuration
 *                      error when missing (surfaces as a failed-build message,
 *                      not a crash mid-build)
 *   DAYTONA_API_URL  — optional; defaults to Daytona's hosted API
 *   DAYTONA_GIT_PAT  — optional; personal access token for cloning/pushing
 *                      private repos
 *
 * The SDK is imported lazily inside createWorkspace so that merely loading
 * the provider registry never pulls in (or requires config for) the SDK.
 */

import type { Daytona, Sandbox } from "@daytonaio/sdk";
import { BuildArtifact } from "../types";
import {
  CollectArtifactsOptions,
  CreateWorkspaceOptions,
  ExecOptions,
  ExecResult,
  PushResult,
  SandboxProvider,
  WorkspaceHandle,
  workBranchName,
} from "./types";
import {
  COMMIT_AUTHOR,
  COMMIT_EMAIL,
  collectArtifactsViaExec,
} from "./git-workspace";
import { assertSafeRepoUrl } from "../git-url";

export const DAYTONA_NOT_CONFIGURED_MESSAGE =
  "Daytona is not configured: set the DAYTONA_API_KEY environment variable " +
  "(and optionally DAYTONA_API_URL / DAYTONA_GIT_PAT), or switch this " +
  "project's sandbox provider to 'local' in Project Settings.";

/** Username sent alongside a PAT for HTTPS git auth (GitHub convention). */
const GIT_PAT_USERNAME = "git";

/** Live sandboxes keyed by sandbox id — a handle is just data, so the
 *  provider keeps the client/sandbox pair here between calls. */
const activeSandboxes = new Map<string, { client: Daytona; sandbox: Sandbox }>();

function getGitPat(): string | undefined {
  return process.env.DAYTONA_GIT_PAT?.trim() || undefined;
}

function requireSandbox(handle: WorkspaceHandle): { client: Daytona; sandbox: Sandbox } {
  const entry = handle.sandboxId ? activeSandboxes.get(handle.sandboxId) : undefined;
  if (!entry) {
    throw new Error(
      `Daytona sandbox for ${handle.ticketId} is no longer active — ` +
        `workspaces must be created and used within the same build run.`
    );
  }
  return entry;
}

/** Quote an argv-style command into a single shell string for remote exec. */
function shellJoin(command: string[]): string {
  return command
    .map((arg) =>
      /^[A-Za-z0-9_/.=:@%^+-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`
    )
    .join(" ");
}

async function runInSandbox(
  sandbox: Sandbox,
  command: string[],
  cwd?: string,
  opts: ExecOptions = {}
): Promise<ExecResult> {
  const response = await sandbox.process.executeCommand(
    shellJoin(command),
    cwd,
    opts.env,
    opts.timeoutMs ? Math.ceil(opts.timeoutMs / 1000) : undefined
  );
  return {
    stdout: response.result ?? "",
    stderr: "",
    exitCode: response.exitCode ?? 0,
  };
}

async function runInSandboxOrThrow(
  sandbox: Sandbox,
  command: string[],
  cwd?: string
): Promise<ExecResult> {
  const result = await runInSandbox(sandbox, command, cwd);
  if (result.exitCode !== 0) {
    throw new Error(
      `${command[0]} ${command[1] ?? ""} failed in Daytona sandbox (exit ${result.exitCode}): ${result.stdout.trim()}`
    );
  }
  return result;
}

export const daytonaSandboxProvider: SandboxProvider = {
  name: "daytona",

  async createWorkspace(opts: CreateWorkspaceOptions): Promise<WorkspaceHandle> {
    const apiKey = process.env.DAYTONA_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(DAYTONA_NOT_CONFIGURED_MESSAGE);
    }

    const { Daytona: DaytonaClient } = await import("@daytonaio/sdk");
    const apiUrl = process.env.DAYTONA_API_URL?.trim();
    const client = new DaytonaClient({ apiKey, ...(apiUrl ? { apiUrl } : {}) });

    const sandbox = await client.create({
      labels: { "concilium/ticket": opts.ticketId },
    });

    try {
      const rootDir = (await sandbox.getUserRootDir()) || "/home/daytona";
      const workspacePath = `${rootDir}/${opts.ticketId}`;
      const repoUrl = opts.repoUrl ?? null;
      const branch = workBranchName(opts.ticketId);

      if (repoUrl) {
        // Same guard as the host providers: never clone option-looking,
        // ext::/file://-style, or otherwise unsafe remote URLs.
        assertSafeRepoUrl(repoUrl);
        const pat = getGitPat();
        await sandbox.git.clone(
          repoUrl,
          workspacePath,
          opts.branch?.trim() || undefined,
          undefined,
          pat ? GIT_PAT_USERNAME : undefined,
          pat
        );
      } else {
        await runInSandboxOrThrow(sandbox, [
          "sh",
          "-c",
          `mkdir -p ${workspacePath} && git -C ${workspacePath} init -q`,
        ]);
      }

      // All build work happens on a dedicated branch.
      await runInSandboxOrThrow(sandbox, ["git", "checkout", "-B", branch], workspacePath);

      activeSandboxes.set(sandbox.id, { client, sandbox });
      return {
        provider: "daytona",
        ticketId: opts.ticketId,
        path: workspacePath,
        branch,
        repoUrl,
        sandboxId: sandbox.id,
      };
    } catch (err) {
      // Workspace prep failed — don't leak a billing sandbox.
      await sandbox.delete().catch(() => {});
      throw err;
    }
  },

  async exec(handle, command, opts = {}) {
    const { sandbox } = requireSandbox(handle);
    return runInSandbox(sandbox, command, handle.path, opts);
  },

  async collectArtifacts(handle, opts: CollectArtifactsOptions): Promise<BuildArtifact[]> {
    // Shared artifact pipeline, executed through the remote sandbox.
    return collectArtifactsViaExec((command) => this.exec(handle, command), opts);
  },

  async pushBranch(handle, branchName): Promise<PushResult> {
    if (!handle.repoUrl) {
      return { pushed: false, reason: "no 'origin' remote configured for this workspace" };
    }
    try {
      const { sandbox } = requireSandbox(handle);
      const pat = getGitPat();

      // Sweep up anything the build agent left uncommitted, then push the
      // work branch. allowEmpty keeps this idempotent when the agent already
      // committed everything itself.
      await sandbox.git.add(handle.path, ["."]);
      await sandbox.git.commit(
        handle.path,
        `concilium: build output for ${branchName}`,
        COMMIT_AUTHOR,
        COMMIT_EMAIL,
        true
      );
      await sandbox.git.push(handle.path, pat ? GIT_PAT_USERNAME : undefined, pat);
      return { pushed: true };
    } catch (err) {
      return {
        pushed: false,
        reason: `git push failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async destroy(handle): Promise<void> {
    const entry = handle.sandboxId ? activeSandboxes.get(handle.sandboxId) : undefined;
    if (!entry) return;
    activeSandboxes.delete(handle.sandboxId!);
    try {
      await entry.sandbox.delete();
    } catch (err) {
      // destroy() runs in the executor's finally — never mask the build error.
      console.warn(
        `Failed to delete Daytona sandbox ${handle.sandboxId}: ` +
          `${err instanceof Error ? err.message : String(err)}`
      );
    }
  },
};
