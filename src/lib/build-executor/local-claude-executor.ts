/**
 * Local Claude Code executor — the first real build path.
 *
 * Pipeline: generate the consensus spec (report executor), then drive a local
 * `claude` CLI headlessly inside a sandboxed workspace directory to implement
 * it. The workspace is its own git repo, so the diff and changed-file list
 * become reviewable artifacts on the build report.
 *
 * Gated by env:
 *   CONCILIUM_BUILD_EXECUTOR=local-claude   — selects this executor
 *   CONCILIUM_BUILD_WORKSPACE=<dir>         — workspace root
 *                                             (default: data/builds)
 *
 * Requires the Claude Code CLI (`claude`) on PATH with valid credentials.
 * This is deliberately the simplest possible sandbox; a Daytona/remote
 * executor can replace it behind the same interface.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { BuildArtifact } from "../types";
import { BuildContext, BuildExecution, BuildExecutor } from "./types";
import { reportExecutor } from "./report-executor";

const execFileAsync = promisify(execFile);

const CLAUDE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const ARTIFACT_CHAR_LIMIT = 20_000;

function getWorkspaceRoot(): string {
  return process.env.CONCILIUM_BUILD_WORKSPACE
    ? path.resolve(process.env.CONCILIUM_BUILD_WORKSPACE)
    : path.resolve(process.cwd(), "data", "builds");
}

async function ensureWorkspace(ticketId: string): Promise<string> {
  const workspace = path.join(getWorkspaceRoot(), ticketId);
  fs.mkdirSync(workspace, { recursive: true });
  if (!fs.existsSync(path.join(workspace, ".git"))) {
    await execFileAsync("git", ["init", "-q"], { cwd: workspace });
  }
  return workspace;
}

function truncate(text: string): string {
  return text.length > ARTIFACT_CHAR_LIMIT
    ? text.slice(0, ARTIFACT_CHAR_LIMIT) + "\n… [truncated]"
    : text;
}

function artifact(
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
    const artifacts: BuildArtifact[] = [];

    // 2) Drive Claude Code headlessly in the sandboxed workspace
    try {
      const workspace = await ensureWorkspace(ctx.ticket.id);
      const prompt = buildClaudePrompt(ctx, report.implementationPlan);

      const { stdout } = await execFileAsync(
        "claude",
        ["-p", prompt, "--output-format", "json", "--permission-mode", "acceptEdits"],
        {
          cwd: workspace,
          timeout: CLAUDE_TIMEOUT_MS,
          maxBuffer: 32 * 1024 * 1024,
          env: { ...process.env },
        }
      );

      // The CLI returns a JSON envelope; surface its result text as the log
      let resultText = stdout;
      try {
        const envelope = JSON.parse(stdout);
        resultText = String(envelope.result ?? stdout);
      } catch {
        // non-JSON output — keep raw stdout
      }
      artifacts.push(artifact(ctx.buildId, "log", "Claude Code build log", resultText));

      // 3) Collect evidence: changed files + diff from the workspace repo
      const { stdout: fileList } = await execFileAsync(
        "git",
        ["log", "--stat", "-1"],
        { cwd: workspace, maxBuffer: 8 * 1024 * 1024 }
      ).catch(() => ({ stdout: "" }));
      if (fileList.trim()) {
        artifacts.push(artifact(ctx.buildId, "file-list", "Changed files (last commit)", fileList));
      }

      const { stdout: diff } = await execFileAsync(
        "git",
        ["show", "--format=", "HEAD"],
        { cwd: workspace, maxBuffer: 32 * 1024 * 1024 }
      ).catch(() => ({ stdout: "" }));
      if (diff.trim()) {
        artifacts.push(artifact(ctx.buildId, "diff", "Implementation diff", diff));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      report.status = "failed";
      report.errorMessage = `Local Claude Code execution failed: ${message}`;
      artifacts.push(artifact(ctx.buildId, "log", "Execution error", message));
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
