/**
 * Local Claude Code executor — the first real build path.
 *
 * Pipeline: generate the consensus spec (report executor), then drive a
 * `claude` CLI headlessly inside a sandbox workspace to implement it. All
 * workspace/git/process work goes through a SandboxProvider (local host or
 * docker — selected by the owning project's sandbox_provider setting, then
 * CONCILIUM_SANDBOX_PROVIDER, default local), so this executor never touches
 * child_process directly.
 *
 * The build target (repoUrl + branch) comes from resolveBuildTarget: the
 * ticket's branch_override, else the project default, else 'main'; repoUrl is
 * null for standalone tickets, which keeps the original empty-workspace
 * behavior. When a repoUrl is configured the work branch is pushed to origin
 * after the run.
 *
 * Gated by env:
 *   CONCILIUM_BUILD_EXECUTOR=local-claude   — selects this executor
 *   CONCILIUM_BUILD_WORKSPACE=<dir>         — workspace root
 *                                             (default: data/builds)
 *
 * Requires the Claude Code CLI (`claude`) on PATH with valid credentials.
 */

import { BuildArtifact, Project } from "../types";
import { BuildContext, BuildExecution, BuildExecutor } from "./types";
import { reportExecutor } from "./report-executor";
import { getSandboxProvider, makeArtifact } from "../sandbox";
import { resolveBuildTargetWithProject } from "../build-target";
import { getProject } from "../server-db";

const CLAUDE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const CLAUDE_MAX_BUFFER = 32 * 1024 * 1024;

function buildClaudePrompt(ctx: BuildContext, implementationPlan: string): string {
  return [
    `You are implementing a feature that a team of stakeholders (engineer, designer, product owner, QA) has reached consensus on.`,
    ``,
    `# Feature: ${ctx.ticket.title}`,
    ``,
    ctx.ticket.description,
    ``,
    `# Agreed Implementation Plan`,
    ``,
    implementationPlan,
    ``,
    ctx.changeRequests.length > 0
      ? [
          `# Change Requests From The Previous Build Round`,
          ``,
          `The previous attempt was reviewed; address every one of these:`,
          ...ctx.changeRequests.map((cr) => `- [${cr.personaId}] ${cr.content}`),
          ``,
        ].join("\n")
      : ``,
    `# Instructions`,
    ``,
    `- Work only inside the current directory (it is your sandboxed workspace).`,
    `- Implement the plan as a working prototype. Prefer something runnable over something exhaustive.`,
    `- Commit your work with git when done.`,
    `- Finish with a short summary of what you built and how to run it.`,
  ].join("\n");
}

export const localClaudeExecutor: BuildExecutor = {
  name: "local-claude",

  async execute(ctx: BuildContext): Promise<BuildExecution> {
    // 1) Synthesize the consensus spec — this is also the agent's prompt
    const specExecution = await reportExecutor.execute(ctx);
    const report = specExecution.report;
    report.executor = "local-claude";
    let artifacts: BuildArtifact[] = [];

    try {
      // 2) Resolve where this build runs and lands
      const project: Project | undefined = ctx.ticket.projectId
        ? await getProject(ctx.ticket.projectId)
        : undefined;
      const target = resolveBuildTargetWithProject(ctx.ticket, project);
      const provider = getSandboxProvider(project?.sandboxProvider);

      const handle = await provider.createWorkspace({
        ticketId: ctx.ticket.id,
        repoUrl: target.repoUrl,
        branch: target.branch,
      });

      try {
        // 3) Drive Claude Code headlessly inside the sandbox
        const prompt = buildClaudePrompt(ctx, report.implementationPlan);
        const result = await provider.exec(
          handle,
          ["claude", "-p", prompt, "--output-format", "json", "--permission-mode", "acceptEdits"],
          { timeoutMs: CLAUDE_TIMEOUT_MS, maxBuffer: CLAUDE_MAX_BUFFER }
        );
        if (result.exitCode !== 0) {
          throw new Error(
            result.stderr.trim() || `claude exited with code ${result.exitCode}`
          );
        }

        // The CLI returns a JSON envelope; surface its result text as the log
        let resultText = result.stdout;
        try {
          const envelope = JSON.parse(result.stdout);
          resultText = String(envelope.result ?? result.stdout);
        } catch {
          // non-JSON output — keep raw stdout
        }

        // 4) Collect evidence: build log + changed files + diff
        artifacts = await provider.collectArtifacts(handle, {
          buildId: ctx.buildId,
          log: resultText,
        });

        // 5) Push the work branch when the project has a configured repo
        if (target.repoUrl) {
          const push = await provider.pushBranch(handle, handle.branch);
          artifacts.push(
            makeArtifact(
              ctx.buildId,
              "log",
              "Branch push",
              push.pushed
                ? `Pushed ${handle.branch} to origin.`
                : `Push skipped: ${push.reason ?? "unknown reason"}`
            )
          );
        }
      } finally {
        await provider.destroy(handle);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      report.status = "failed";
      report.errorMessage = `Local Claude Code execution failed: ${message}`;
      artifacts.push(makeArtifact(ctx.buildId, "log", "Execution error", message));
    }

    report.artifacts = artifacts;

    return {
      report,
      meta: {
        ...specExecution.meta,
        executor: "local-claude",
        processedAt: new Date().toISOString(),
      },
    };
  },
};
