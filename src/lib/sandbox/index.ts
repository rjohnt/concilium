/**
 * Sandbox provider registry.
 *
 * Selection order: the owning project's sandbox_provider setting, then the
 * CONCILIUM_SANDBOX_PROVIDER env var, then "local". Unknown names (including
 * not-yet-implemented ones like "daytona") warn and fall back to local.
 */

import { SandboxProvider } from "./types";
import { localSandboxProvider } from "./local-provider";
import { dockerSandboxProvider } from "./docker-provider";

export type {
  CollectArtifactsOptions,
  CreateWorkspaceOptions,
  ExecOptions,
  ExecResult,
  PushResult,
  SandboxProvider,
  WorkspaceHandle,
} from "./types";
export { workBranchName } from "./types";
export { makeArtifact } from "./git-workspace";
export { localSandboxProvider } from "./local-provider";
export { dockerSandboxProvider, DOCKER_UNAVAILABLE_MESSAGE } from "./docker-provider";

const providers: Record<string, SandboxProvider> = {
  local: localSandboxProvider,
  docker: dockerSandboxProvider,
};

export function getSandboxProvider(projectSetting?: string | null): SandboxProvider {
  const name = projectSetting?.trim() || process.env.CONCILIUM_SANDBOX_PROVIDER || "local";
  const provider = providers[name];
  if (!provider) {
    console.warn(
      `Unknown sandbox provider "${name}" — falling back to "local". Known: ${Object.keys(providers).join(", ")}`
    );
    return localSandboxProvider;
  }
  return provider;
}
