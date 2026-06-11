/**
 * Build executor registry. Select with CONCILIUM_BUILD_EXECUTOR:
 *   "report"        (default) — LLM-generated build spec only
 *   "local-claude"            — spec + local Claude Code run in a sandboxed
 *                               workspace with diff/log artifacts
 */

import { BuildExecutor } from "./types";
import { reportExecutor } from "./report-executor";
import { localClaudeExecutor } from "./local-claude-executor";

export type { BuildContext, BuildExecution, BuildExecutor } from "./types";

const executors: Record<string, BuildExecutor> = {
  report: reportExecutor,
  "local-claude": localClaudeExecutor,
};

export function getBuildExecutor(): BuildExecutor {
  const name = process.env.CONCILIUM_BUILD_EXECUTOR || "report";
  const executor = executors[name];
  if (!executor) {
    console.warn(
      `Unknown CONCILIUM_BUILD_EXECUTOR "${name}" — falling back to "report". Known: ${Object.keys(executors).join(", ")}`
    );
    return reportExecutor;
  }
  return executor;
}
