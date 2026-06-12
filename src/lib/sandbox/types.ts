/**
 * Sandbox provider abstraction — where a ticket's build actually runs.
 *
 * A provider owns the lifecycle of a per-ticket workspace: create it (clone
 * the project repo or init an empty one), run commands in it, harvest build
 * evidence (log/diff/file-list artifacts), push the work branch, and tear
 * down. Executors talk only to this interface — never to child_process or
 * git directly — so swapping local execution for Docker (or a remote runner
 * like Daytona) is a registry change, not an executor rewrite.
 *
 * Note: the string union `SandboxProvider` in @/lib/types is the *name* of a
 * provider as stored on a Project row; the interface below is the runtime
 * contract those names select via getSandboxProvider().
 */

import { BuildArtifact } from "../types";

export interface WorkspaceHandle {
  /** Name of the provider that created this workspace ("local", "docker", "daytona"). */
  provider: string;
  ticketId: string;
  /** Absolute workspace directory path — on the host for local/docker, inside
   *  the remote sandbox for daytona. */
  path: string;
  /** Branch the build's work happens on: concilium/<ticketId> (lowercased). */
  branch: string;
  /** Remote the workspace was cloned from, or null for a fresh local repo. */
  repoUrl: string | null;
  /** Container image used for exec (docker provider only). */
  image?: string;
  /** Remote sandbox id (daytona provider only). */
  sandboxId?: string;
}

export interface CreateWorkspaceOptions {
  ticketId: string;
  /** Git remote to clone. When absent the workspace starts as an empty repo. */
  repoUrl?: string | null;
  /** Branch to clone (from resolveBuildTarget). Ignored without repoUrl. */
  branch?: string | null;
}

export interface ExecOptions {
  timeoutMs?: number;
  maxBuffer?: number;
  /** Extra environment variables layered over the inherited environment. */
  env?: Record<string, string>;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  /** 0 on success. Non-zero exits resolve (they do not throw). */
  exitCode: number;
}

export interface CollectArtifactsOptions {
  /** Build id used to namespace artifact ids. */
  buildId: string;
  /** Pre-captured build log text to include as a "log" artifact. */
  log?: string;
}

export interface PushResult {
  pushed: boolean;
  /** Why the push did not happen (e.g. no remote configured). */
  reason?: string;
}

export interface SandboxProvider {
  name: string;
  /** Prepare the per-ticket workspace. Throws with a user-facing message when
   *  the provider's runtime (e.g. Docker) is unavailable. */
  createWorkspace(opts: CreateWorkspaceOptions): Promise<WorkspaceHandle>;
  /** Run an argv-style command inside the workspace. */
  exec(handle: WorkspaceHandle, command: string[], opts?: ExecOptions): Promise<ExecResult>;
  /** Harvest build evidence (log, changed-file list, diff) from the workspace. */
  collectArtifacts(handle: WorkspaceHandle, opts: CollectArtifactsOptions): Promise<BuildArtifact[]>;
  /** Push the work branch to origin when a remote exists. Never throws. */
  pushBranch(handle: WorkspaceHandle, branchName: string): Promise<PushResult>;
  /** Release provider resources. Workspaces persist across build rounds. */
  destroy(handle: WorkspaceHandle): Promise<void>;
}

/** The branch a ticket's build work happens on. */
export function workBranchName(ticketId: string): string {
  return `concilium/${ticketId.toLowerCase()}`;
}
