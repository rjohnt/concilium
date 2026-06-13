import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Project, Ticket } from "@/lib/types";

vi.mock("@/lib/server-db", () => ({
  getProject: vi.fn(),
}));

import { resolveBuildTarget, resolveBuildTargetWithProject, FALLBACK_BRANCH } from "../build-target";
import { getProject } from "@/lib/server-db";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "PRJ-001",
    name: "Concilium",
    repoUrl: "https://github.com/example/concilium.git",
    defaultBranch: "develop",
    sandboxProvider: "local",
    createPr: false,
    createdAt: "2026-06-11T00:00:00.000Z",
    ...overrides,
  };
}

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "TIX-001",
    title: "Test",
    description: "",
    status: "consensus",
    priority: 2,
    createdAt: "2026-06-11T00:00:00.000Z",
    updatedAt: "2026-06-11T00:00:00.000Z",
    tags: [],
    feedback: [],
    approvals: [],
    ...overrides,
  };
}

describe("resolveBuildTargetWithProject", () => {
  it("uses the ticket's branch override when set", () => {
    const target = resolveBuildTargetWithProject(
      makeTicket({ branchOverride: "feature/dark-mode" }),
      makeProject()
    );
    expect(target.branch).toBe("feature/dark-mode");
    expect(target.repoUrl).toBe("https://github.com/example/concilium.git");
  });

  it("falls back to the project default branch without an override", () => {
    const target = resolveBuildTargetWithProject(makeTicket(), makeProject());
    expect(target.branch).toBe("develop");
  });

  it("treats a whitespace-only override as unset", () => {
    const target = resolveBuildTargetWithProject(
      makeTicket({ branchOverride: "   " }),
      makeProject()
    );
    expect(target.branch).toBe("develop");
  });

  it("falls back to 'main' with no repoUrl when the ticket has no project", () => {
    const target = resolveBuildTargetWithProject(makeTicket(), undefined);
    expect(target.branch).toBe(FALLBACK_BRANCH);
    expect(target.repoUrl).toBeNull();
  });

  it("honors the override even without a project", () => {
    const target = resolveBuildTargetWithProject(
      makeTicket({ branchOverride: "hotfix/urgent" }),
      null
    );
    expect(target.branch).toBe("hotfix/urgent");
    expect(target.repoUrl).toBeNull();
  });

  it("falls back to 'main' when the project default branch is empty", () => {
    const target = resolveBuildTargetWithProject(
      makeTicket(),
      makeProject({ defaultBranch: "" })
    );
    expect(target.branch).toBe(FALLBACK_BRANCH);
  });
});

describe("resolveBuildTarget (async, loads project from DB)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the ticket's project and uses its default branch", async () => {
    vi.mocked(getProject).mockResolvedValue(makeProject());

    const target = await resolveBuildTarget(makeTicket({ projectId: "PRJ-001" }));

    expect(getProject).toHaveBeenCalledWith("PRJ-001");
    expect(target).toEqual({
      repoUrl: "https://github.com/example/concilium.git",
      branch: "develop",
    });
  });

  it("prefers the ticket override over the project default", async () => {
    vi.mocked(getProject).mockResolvedValue(makeProject());

    const target = await resolveBuildTarget(
      makeTicket({ projectId: "PRJ-001", branchOverride: "feature/x" })
    );
    expect(target.branch).toBe("feature/x");
  });

  it("does not hit the DB for standalone tickets and falls back to 'main'", async () => {
    const target = await resolveBuildTarget(makeTicket({ projectId: null }));

    expect(getProject).not.toHaveBeenCalled();
    expect(target).toEqual({ repoUrl: null, branch: "main" });
  });

  it("falls back gracefully when the project no longer exists", async () => {
    vi.mocked(getProject).mockResolvedValue(undefined);

    const target = await resolveBuildTarget(makeTicket({ projectId: "PRJ-404" }));
    expect(target).toEqual({ repoUrl: null, branch: "main" });
  });
});
