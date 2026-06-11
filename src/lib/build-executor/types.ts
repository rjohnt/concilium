/**
 * Build executor abstraction — how a consensus ticket becomes work product.
 *
 * Executors take the consensus context (ticket, full feedback history, any
 * open change requests from a previous round) and produce a BuildReport with
 * artifacts. The default "report" executor generates a structured spec via
 * LLM; the "local-claude" executor additionally drives a local Claude Code
 * CLI in a sandboxed workspace to actually implement it. Future executors
 * (Daytona, remote runners) implement the same interface.
 */

import { BuildChangeRequest, BuildReport, FeedbackEntry, Ticket } from "../types";

export interface BuildContext {
  ticket: Ticket;
  history: FeedbackEntry[];
  /** Unresolved change requests from a previous build round (delta context). */
  changeRequests: BuildChangeRequest[];
  buildId: string;
}

export interface BuildExecution {
  report: BuildReport;
  meta: {
    executor: string;
    processedAt: string;
    model?: string;
    tokensUsed?: number;
  };
}

export interface BuildExecutor {
  name: string;
  execute(ctx: BuildContext): Promise<BuildExecution>;
}
