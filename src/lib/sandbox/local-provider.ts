/**
 * Local sandbox provider — runs build commands directly on the host.
 *
 * Workspace lives at <CONCILIUM_BUILD_WORKSPACE | data/builds>/<ticketId>.
 * With a project repoUrl the workspace is a clone of that repo on the
 * concilium/<ticketId> work branch; without one it falls back to the
 * original empty `git init` workspace. Workspaces persist across build
 * rounds so change-request iterations keep their history.
 */

import { SandboxProvider } from "./types";
import {
  collectGitArtifacts,
  prepareGitWorkspace,
  pushBranchToOrigin,
  runHostCommand,
} from "./git-workspace";

export const localSandboxProvider: SandboxProvider = {
  name: "local",

  async createWorkspace(opts) {
    return prepareGitWorkspace("local", opts);
  },

  async exec(handle, command, opts = {}) {
    return runHostCommand(command, { ...opts, cwd: handle.path });
  },

  async collectArtifacts(handle, opts) {
    return collectGitArtifacts(handle, opts);
  },

  async pushBranch(handle, branchName) {
    return pushBranchToOrigin(handle, branchName);
  },

  async destroy() {
    // Keep the workspace on disk — it is reused by follow-up build rounds.
  },
};
