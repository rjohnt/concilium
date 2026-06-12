/**
 * local-claude executor — runs entirely through the SandboxProvider
 * abstraction. These tests verify provider selection (project setting),
 * build-target resolution (repoUrl / branch_override), the claude CLI exec
 * call, artifact collection, conditional branch pushing, and failure paths.
 * No child_process here: the provider itself is a mock.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BuildReport, Project, Ticket } from "../../types";
import { BuildContext } from "../types";

const mocks = vi.hoisted(() => ({
  reportExecute: vi.fn(),
  getProject: vi.fn(),
  getSandboxProvider: vi.fn(),
  maybeCreateBuildPullRequest: vi.fn(),
  provider: {
    name: "mock",
    createWorkspace: vi.fn(),
    exec: vi.fn(),
    collectArtifacts: vi.fn(),
    pushBranch: vi.fn(),
    destroy: vi.fn(),
  },
}));

vi.mock("../report-executor", () => ({
  reportExecutor: { name: "report", execute: mocks.reportExecute },
}));

vi.mock("../../server-db", () => ({
  getProject: mocks.getProject,
}));

vi.mock("../../github", () => ({
  maybeCreateBuildPullRequest: mocks.maybeCreateBuildPullRequest,
}));

vi.mock("../../sandbox", () => ({
  getSandboxProvider: mocks.getSandboxProvider,
  makeArtifact: (buildId: string, type: string, label: string, content: string) => ({
    id: `${buildId}-${type}-mock`,
    type,
    label,
    content,
    createdAt: "2026-01-01T00:00:00.000Z",
  }),
}));

import { localClaudeExecutor } from "../local-claude-executor";

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "TIX-001",
    title: "Test feature",
    description: "Build the thing",
    status: "consensus",
    priority: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    tags: [],
    feedback: [],
    approvals: [],
    ...overrides,
  };
}

function makeContext(ticket: Ticket = makeTicket()): BuildContext {
  return { ticket, history: [], changeRequests: [], buildId: "BLD-007" };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "PRJ-001",
    name: "Acme App",
    repoUrl: "https://github.com/acme/app.git",
    defaultBranch: "develop",
    sandboxProvider: "docker",
    createPr: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function freshReport(): BuildReport {
  return {
    id: "BLD-007",
    ticketId: "TIX-001",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "completed",
    requirements: ["req"],
    designDecisions: ["design"],
    qaCriteria: ["qa"],
    implementationPlan: "the plan",
    consensusSummary: "summary",
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.reportExecute.mockImplementation(async () => ({
    report: freshReport(),
    meta: { executor: "report", processedAt: "2026-01-01T00:00:00.000Z" },
  }));
  mocks.getSandboxProvider.mockReturnValue(mocks.provider);
  mocks.getProject.mockResolvedValue(undefined);

  mocks.provider.createWorkspace.mockImplementation(
    async (opts: { ticketId: string; repoUrl?: string | null; branch?: string | null }) => ({
      provider: "mock",
      ticketId: opts.ticketId,
      path: `/ws/${opts.ticketId}`,
      branch: `concilium/${opts.ticketId.toLowerCase()}`,
      repoUrl: opts.repoUrl ?? null,
    })
  );
  mocks.provider.exec.mockResolvedValue({
    stdout: JSON.stringify({ result: "Implemented the feature." }),
    stderr: "",
    exitCode: 0,
  });
  mocks.provider.collectArtifacts.mockResolvedValue([
    {
      id: "BLD-007-log-abc",
      type: "log",
      label: "Claude Code build log",
      content: "Implemented the feature.",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ]);
  mocks.provider.pushBranch.mockResolvedValue({ pushed: true });
  mocks.provider.destroy.mockResolvedValue(undefined);
  mocks.maybeCreateBuildPullRequest.mockResolvedValue(null);
});

describe("localClaudeExecutor — standalone tickets (no project, regression path)", () => {
  it("creates a local workspace with no repoUrl and the main fallback branch", async () => {
    const execution = await localClaudeExecutor.execute(makeContext());

    expect(mocks.getProject).not.toHaveBeenCalled();
    expect(mocks.getSandboxProvider).toHaveBeenCalledWith(undefined);
    expect(mocks.provider.createWorkspace).toHaveBeenCalledWith({
      ticketId: "TIX-001",
      repoUrl: null,
      branch: "main",
    });
    expect(execution.report.status).toBe("completed");
    expect(execution.meta.executor).toBe("local-claude");
  });

  it("runs the claude CLI through the provider and parses the JSON envelope into the log", async () => {
    await localClaudeExecutor.execute(makeContext());

    expect(mocks.provider.exec).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: "TIX-001" }),
      ["claude", "-p", expect.stringContaining("Test feature"), "--output-format", "json", "--permission-mode", "acceptEdits"],
      expect.objectContaining({ timeoutMs: 15 * 60 * 1000 })
    );
    expect(mocks.provider.collectArtifacts).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: "TIX-001" }),
      { buildId: "BLD-007", log: "Implemented the feature." }
    );
  });

  it("does not push when no repoUrl is configured", async () => {
    const execution = await localClaudeExecutor.execute(makeContext());

    expect(mocks.provider.pushBranch).not.toHaveBeenCalled();
    expect(execution.report.artifacts?.map((a) => a.type)).toEqual(["log"]);
  });

  it("always destroys the workspace handle", async () => {
    await localClaudeExecutor.execute(makeContext());
    expect(mocks.provider.destroy).toHaveBeenCalledTimes(1);
  });

  it("keeps raw stdout as the log when the CLI output is not JSON", async () => {
    mocks.provider.exec.mockResolvedValue({ stdout: "plain text", stderr: "", exitCode: 0 });

    await localClaudeExecutor.execute(makeContext());

    expect(mocks.provider.collectArtifacts).toHaveBeenCalledWith(expect.anything(), {
      buildId: "BLD-007",
      log: "plain text",
    });
  });
});

describe("localClaudeExecutor — project-backed tickets", () => {
  it("selects the project's sandbox provider and clones its repo on the default branch", async () => {
    mocks.getProject.mockResolvedValue(makeProject());

    await localClaudeExecutor.execute(makeContext(makeTicket({ projectId: "PRJ-001" })));

    expect(mocks.getProject).toHaveBeenCalledWith("PRJ-001");
    expect(mocks.getSandboxProvider).toHaveBeenCalledWith("docker");
    expect(mocks.provider.createWorkspace).toHaveBeenCalledWith({
      ticketId: "TIX-001",
      repoUrl: "https://github.com/acme/app.git",
      branch: "develop",
    });
  });

  it("honors the ticket's branch_override", async () => {
    mocks.getProject.mockResolvedValue(makeProject());

    await localClaudeExecutor.execute(
      makeContext(makeTicket({ projectId: "PRJ-001", branchOverride: "hotfix/login" }))
    );

    expect(mocks.provider.createWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ branch: "hotfix/login" })
    );
  });

  it("pushes the work branch and records the outcome as an artifact", async () => {
    mocks.getProject.mockResolvedValue(makeProject());

    const execution = await localClaudeExecutor.execute(
      makeContext(makeTicket({ projectId: "PRJ-001" }))
    );

    expect(mocks.provider.pushBranch).toHaveBeenCalledWith(
      expect.objectContaining({ branch: "concilium/tix-001" }),
      "concilium/tix-001"
    );
    const pushNote = execution.report.artifacts?.find((a) => a.label === "Branch push");
    expect(pushNote?.content).toBe("Pushed concilium/tix-001 to origin.");
  });

  it("records a skipped push with its reason", async () => {
    mocks.getProject.mockResolvedValue(makeProject());
    mocks.provider.pushBranch.mockResolvedValue({
      pushed: false,
      reason: "no 'origin' remote configured for this workspace",
    });

    const execution = await localClaudeExecutor.execute(
      makeContext(makeTicket({ projectId: "PRJ-001" }))
    );

    const pushNote = execution.report.artifacts?.find((a) => a.label === "Branch push");
    expect(pushNote?.content).toContain("Push skipped: no 'origin' remote");
    expect(execution.report.status).toBe("completed");
  });
});

describe("localClaudeExecutor — pull-request wiring", () => {
  it("asks the PR gate to run after a successful push, with the resolved branches", async () => {
    const project = makeProject({ createPr: true });
    mocks.getProject.mockResolvedValue(project);

    await localClaudeExecutor.execute(makeContext(makeTicket({ projectId: "PRJ-001" })));

    expect(mocks.maybeCreateBuildPullRequest).toHaveBeenCalledWith({
      project,
      pushed: true,
      headBranch: "concilium/tix-001",
      baseBranch: "develop",
      ticket: expect.objectContaining({ id: "TIX-001", title: "Test feature" }),
      report: expect.objectContaining({ implementationPlan: "the plan" }),
      buildId: "BLD-007",
    });
  });

  it("reports pushed: false to the gate when the push was skipped (no PR happens)", async () => {
    mocks.getProject.mockResolvedValue(makeProject({ createPr: true }));
    mocks.provider.pushBranch.mockResolvedValue({ pushed: false, reason: "no remote" });

    await localClaudeExecutor.execute(makeContext(makeTicket({ projectId: "PRJ-001" })));

    expect(mocks.maybeCreateBuildPullRequest).toHaveBeenCalledWith(
      expect.objectContaining({ pushed: false })
    );
  });

  it("never consults the PR gate for standalone tickets (no repoUrl, nothing pushed)", async () => {
    await localClaudeExecutor.execute(makeContext());
    expect(mocks.maybeCreateBuildPullRequest).not.toHaveBeenCalled();
  });

  it("attaches the PR artifact to the report when one is returned", async () => {
    mocks.getProject.mockResolvedValue(makeProject({ createPr: true }));
    mocks.maybeCreateBuildPullRequest.mockResolvedValue({
      id: "BLD-007-report-pr",
      type: "report",
      label: "Pull request",
      content: "https://github.com/acme/app/pull/42",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const execution = await localClaudeExecutor.execute(
      makeContext(makeTicket({ projectId: "PRJ-001" }))
    );

    const pr = execution.report.artifacts?.find((a) => a.label === "Pull request");
    expect(pr?.content).toBe("https://github.com/acme/app/pull/42");
    expect(execution.report.status).toBe("completed");
  });

  it("keeps the build completed when PR creation degrades to a failure artifact", async () => {
    mocks.getProject.mockResolvedValue(makeProject({ createPr: true }));
    mocks.maybeCreateBuildPullRequest.mockResolvedValue({
      id: "BLD-007-log-prfail",
      type: "log",
      label: "Pull request failed",
      content: "Could not open a pull request: 403",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const execution = await localClaudeExecutor.execute(
      makeContext(makeTicket({ projectId: "PRJ-001" }))
    );

    expect(execution.report.status).toBe("completed");
    expect(execution.report.errorMessage).toBeUndefined();
    expect(
      execution.report.artifacts?.some((a) => a.label === "Pull request failed")
    ).toBe(true);
  });
});

describe("localClaudeExecutor — failure paths", () => {
  it("fails the report when the claude CLI exits non-zero", async () => {
    mocks.provider.exec.mockResolvedValue({ stdout: "", stderr: "credit exhausted", exitCode: 1 });

    const execution = await localClaudeExecutor.execute(makeContext());

    expect(execution.report.status).toBe("failed");
    expect(execution.report.errorMessage).toContain("credit exhausted");
    expect(execution.report.artifacts?.some((a) => a.label === "Execution error")).toBe(true);
    expect(mocks.provider.destroy).toHaveBeenCalledTimes(1);
  });

  it("fails cleanly when the provider cannot create a workspace (e.g. docker missing)", async () => {
    mocks.getProject.mockResolvedValue(makeProject());
    mocks.provider.createWorkspace.mockRejectedValue(
      new Error("Docker is not available on this machine.")
    );

    const execution = await localClaudeExecutor.execute(
      makeContext(makeTicket({ projectId: "PRJ-001" }))
    );

    expect(execution.report.status).toBe("failed");
    expect(execution.report.errorMessage).toContain("Docker is not available");
    expect(mocks.provider.exec).not.toHaveBeenCalled();
  });
});
