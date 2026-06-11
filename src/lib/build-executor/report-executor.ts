/**
 * Report executor — the default build path.
 *
 * Synthesizes the consensus feedback into a structured build spec
 * (requirements, design decisions, QA criteria, implementation plan) via
 * DeepSeek Pro. Produces no code; the spec itself is the work product and
 * doubles as the prompt for code-producing executors layered on top.
 */

import { BuildReport } from "../types";
import { getAllPersonas } from "../personas";
import { callDeepSeek, DEEPSEEK_PRO_MODEL } from "../llm";
import { checkConsensusThreshold, generateBuildSummary } from "../consensus-threshold";
import { BuildContext, BuildExecution, BuildExecutor } from "./types";

const SYSTEM_PROMPT = `You are the Concilium Build Engine. Your job is to analyze persona feedback on a feature ticket and produce a structured build report that developers can execute against.

You MUST respond with ONLY valid JSON — no markdown, no code fences, no explanation. The JSON must match this exact schema:

{
  "requirements": ["string — concrete technical requirement 1", "string — concrete technical requirement 2"],
  "designDecisions": ["string — design decision 1", "string — design decision 2"],
  "qaCriteria": ["string — QA/test criteria 1", "string — QA/test criteria 2"],
  "implementationPlan": "string — step-by-step implementation plan as markdown",
  "consensusSummary": "string — summary of persona consensus state"
}

Guidelines:
- requirements: Synthesize concrete, actionable technical requirements from all persona feedback (especially engineer and QA). Each should be a single clear statement.
- designDecisions: Extract design decisions from designer and product-owner feedback. Include UX patterns, visual choices, and interaction design specifics.
- qaCriteria: Derive test criteria from QA feedback, engineer edge-case analysis, and product-owner acceptance criteria. Be specific and testable.
- implementationPlan: Write a step-by-step implementation plan as markdown. Include setup, core implementation, design integration, QA verification, and deployment steps. Reference specific feedback points.
- consensusSummary: Summarize the consensus state — who approved, who has concerns, overall readiness.
- If change requests from a previous build round are provided, the plan MUST address every one of them explicitly.`;

function safeArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  return [];
}

export function buildSpecPrompt(ctx: BuildContext): string {
  const { ticket, history, changeRequests } = ctx;
  const allPersonas = getAllPersonas();
  const consensus = checkConsensusThreshold(ticket);
  const buildSummary = generateBuildSummary(ticket);

  const personaFeedback = allPersonas
    .map((persona) => {
      const feedback = history.filter((f) => f.personaId === persona.id);
      const approved = ticket.approvals.includes(persona.id);
      const status = approved ? "APPROVED" : "PENDING";
      const content =
        feedback.length > 0
          ? feedback.map((f) => `  - ${f.content}`).join("\n")
          : "  - No feedback provided";
      return `${persona.emoji} ${persona.label} [${status}]:\n${content}`;
    })
    .join("\n\n");

  const changeRequestBlock =
    changeRequests.length > 0
      ? [
          ``,
          `## Change Requests From Previous Build Round`,
          ``,
          `A previous build was reviewed and these changes were requested. The new plan must address each one:`,
          ...changeRequests.map((cr) => `- [${cr.personaId}] ${cr.content}`),
        ].join("\n")
      : "";

  return `## Ticket

**ID:** ${ticket.id}
**Title:** ${ticket.title}
**Description:** ${ticket.description}
**Priority:** ${ticket.priority === 0 ? "Urgent" : ticket.priority === 1 ? "High" : ticket.priority === 2 ? "Medium" : "Low"}
**Status:** ${ticket.status}

## Consensus State

Progress: ${consensus.progress * 100}% (${ticket.approvals.length}/${allPersonas.length} approvals)
Threshold: ${consensus.threshold * 100}%
Reached: ${consensus.reached ? "Yes" : "No"}

## Persona Feedback

${personaFeedback}

## Build Summary (auto-generated)

${buildSummary}
${changeRequestBlock}
---

Based on the above ticket context, consensus state, and persona feedback, generate a complete build report. Focus on producing actionable, specific items for each section.`;
}

/**
 * Parse the LLM JSON response into a structured BuildReport.
 * Handles both clean JSON and markdown-fenced JSON.
 */
export function parseSpecResponse(
  rawContent: string,
  ticketId: string,
  buildId: string
): BuildReport {
  let parsed: Record<string, unknown> = {};

  try {
    parsed = JSON.parse(rawContent);
  } catch {
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1].trim());
      } catch {
        // fall through to fallback
      }
    }
  }

  const now = new Date().toISOString();

  return {
    id: buildId,
    ticketId,
    createdAt: now,
    status: "building",
    requirements: safeArray(parsed.requirements),
    designDecisions: safeArray(parsed.designDecisions),
    qaCriteria: safeArray(parsed.qaCriteria),
    implementationPlan: String(parsed.implementationPlan ?? ""),
    consensusSummary: String(parsed.consensusSummary ?? ""),
  };
}

export const reportExecutor: BuildExecutor = {
  name: "report",

  async execute(ctx: BuildContext): Promise<BuildExecution> {
    const llmResponse = await callDeepSeek({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildSpecPrompt(ctx),
      expectJson: true,
      model: DEEPSEEK_PRO_MODEL,
    });

    const report = parseSpecResponse(llmResponse.content, ctx.ticket.id, ctx.buildId);
    report.executor = "report";
    // Carry forward open change requests so the review loop can resolve them
    report.changeRequests = ctx.changeRequests.map((cr) => ({
      ...cr,
      resolvedByBuildId: ctx.buildId,
    }));

    return {
      report,
      meta: {
        executor: "report",
        processedAt: new Date().toISOString(),
        model: llmResponse.model,
        tokensUsed: llmResponse.usage.totalTokens,
      },
    };
  },
};
