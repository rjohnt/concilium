import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Project } from "@/lib/types";

// --- Mocks ---

vi.mock("@/lib/server-db", () => {
  const projects = new Map<string, Project>();
  let counter = 0;

  return {
    __projects: projects,
    getProjects: vi.fn(async () => Array.from(projects.values())),
    getProject: vi.fn(async (id: string) => projects.get(id)),
    createProject: vi.fn(
      async (
        name: string,
        options: Partial<Project> & { repoUrl?: string | null } = {},
        id?: string
      ) => {
        const projectId = id || `PRJ-${String(++counter).padStart(3, "0")}`;
        const project: Project = {
          id: projectId,
          name,
          repoUrl: options.repoUrl ?? null,
          defaultBranch: options.defaultBranch ?? "main",
          sandboxProvider: options.sandboxProvider ?? "local",
          createPr: options.createPr ?? false,
          createdAt: new Date().toISOString(),
        };
        projects.set(projectId, project);
        return project;
      }
    ),
    updateProject: vi.fn(async (id: string, updates: Record<string, unknown>) => {
      const existing = projects.get(id);
      if (!existing) return undefined;
      const updated = { ...existing, ...updates } as Project;
      projects.set(id, updated);
      return updated;
    }),
    updateTicket: vi.fn(),
    getTicket: vi.fn(),
    getTickets: vi.fn(async () => []),
    createTicket: vi.fn(),
    deleteTicket: vi.fn(),
  };
});

import { GET, POST, PATCH } from "../projects/route";
import { PATCH as ticketsPatch } from "../tickets/route";
import * as serverDb from "@/lib/server-db";
import { resetRateLimitBuckets } from "@/lib/rateLimit";

const mockProjects = (serverDb as unknown as { __projects: Map<string, Project> }).__projects;

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createPatchRequest(id: string | null, body: Record<string, unknown>): NextRequest {
  const url = id
    ? `http://localhost:3000/api/projects?id=${encodeURIComponent(id)}`
    : "http://localhost:3000/api/projects";
  return new NextRequest(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitBuckets();
    mockProjects.clear();
  });

  // --- GET ---

  it("GET returns an empty list when no projects exist", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/api/projects"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.projects).toEqual([]);
  });

  it("GET ?id returns 404 for unknown project", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/projects?id=PRJ-999")
    );
    expect(response.status).toBe(404);
  });

  // --- POST ---

  it("POST creates a project with defaults", async () => {
    const response = await POST(createPostRequest({ name: "Concilium" }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.project.id).toMatch(/^PRJ-\d{3}$/);
    expect(body.project.name).toBe("Concilium");
    expect(body.project.repoUrl).toBeNull();
    expect(body.project.defaultBranch).toBe("main");
    expect(body.project.sandboxProvider).toBe("local");
    expect(body.project.createPr).toBe(false);
  });

  it("POST accepts full settings", async () => {
    const response = await POST(
      createPostRequest({
        name: "Concilium",
        repoUrl: "https://github.com/example/concilium.git",
        defaultBranch: "develop",
        sandboxProvider: "daytona",
        createPr: true,
      })
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.project.repoUrl).toBe("https://github.com/example/concilium.git");
    expect(body.project.defaultBranch).toBe("develop");
    expect(body.project.sandboxProvider).toBe("daytona");
    expect(body.project.createPr).toBe(true);
  });

  it("POST returns 400 when name is missing", async () => {
    const response = await POST(createPostRequest({}));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("name");
  });

  it("POST returns 400 for unknown sandbox provider", async () => {
    const response = await POST(
      createPostRequest({ name: "X", sandboxProvider: "kubernetes" })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("sandboxProvider");
  });

  it("POST returns 400 for invalid default branch", async () => {
    const response = await POST(
      createPostRequest({ name: "X", defaultBranch: "bad branch name!" })
    );
    expect(response.status).toBe(400);
  });

  it.each([
    ["ext:: remote helper", 'ext::sh -c "touch /tmp/pwn"'],
    ["option-looking value", "--upload-pack=touch /tmp/pwn"],
    ["file:// URL", "file:///etc/passwd"],
    ["plain http URL", "http://169.254.169.254/latest/meta-data"],
    ["non-URL junk", "not a git url"],
  ])("POST returns 400 for unsafe repoUrl (%s)", async (_label, repoUrl) => {
    const response = await POST(createPostRequest({ name: "X", repoUrl }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("repoUrl");
    expect(serverDb.createProject).not.toHaveBeenCalled();
  });

  it("POST accepts ssh:// and scp-style git remotes", async () => {
    const ssh = await POST(
      createPostRequest({ name: "A", repoUrl: "ssh://git@github.com/acme/app.git" })
    );
    expect(ssh.status).toBe(201);
    const scp = await POST(
      createPostRequest({ name: "B", repoUrl: "git@github.com:acme/app.git" })
    );
    expect(scp.status).toBe(201);
  });

  // --- PATCH ---

  it("PATCH updates settings on an existing project", async () => {
    await POST(createPostRequest({ name: "Concilium" }));
    const [id] = Array.from(mockProjects.keys());

    const response = await PATCH(
      createPatchRequest(id, {
        repoUrl: "https://github.com/example/repo.git",
        defaultBranch: "release/v2",
        sandboxProvider: "docker",
        createPr: true,
      })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(serverDb.updateProject).toHaveBeenCalledWith(id, {
      repoUrl: "https://github.com/example/repo.git",
      defaultBranch: "release/v2",
      sandboxProvider: "docker",
      createPr: true,
    });
    expect(body.project.defaultBranch).toBe("release/v2");
  });

  it("PATCH clears repoUrl with null", async () => {
    await POST(
      createPostRequest({ name: "Concilium", repoUrl: "https://github.com/x/y.git" })
    );
    const [id] = Array.from(mockProjects.keys());

    const response = await PATCH(createPatchRequest(id, { repoUrl: null }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.project.repoUrl).toBeNull();
  });

  it("PATCH returns 400 for an unsafe repoUrl", async () => {
    await POST(createPostRequest({ name: "Concilium" }));
    const [id] = Array.from(mockProjects.keys());

    const response = await PATCH(createPatchRequest(id, { repoUrl: "ext::sh -c id" }));
    expect(response.status).toBe(400);
    expect(serverDb.updateProject).not.toHaveBeenCalled();
  });

  it("PATCH returns 400 without an id", async () => {
    const response = await PATCH(createPatchRequest(null, { name: "X" }));
    expect(response.status).toBe(400);
  });

  it("PATCH returns 400 for malformed ids", async () => {
    const response = await PATCH(createPatchRequest("not-a-project", { name: "X" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid project ID format");
  });

  it("PATCH returns 404 for unknown project", async () => {
    const response = await PATCH(createPatchRequest("PRJ-999", { name: "X" }));
    expect(response.status).toBe(404);
  });

  // --- Rate limiting ---

  it("rate-limits mutations after 20 requests in a window", async () => {
    for (let i = 0; i < 20; i++) {
      const response = await POST(createPostRequest({ name: `P${i}` }));
      expect(response.status).toBe(201);
    }
    const blocked = await POST(createPostRequest({ name: "P21" }));
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toBe("Too many requests");
    expect(blocked.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("includes rate-limit headers on success", async () => {
    const response = await POST(createPostRequest({ name: "Concilium" }));
    expect(response.status).toBe(201);
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("19");
    expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });
});

describe("PATCH /api/tickets — project assignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitBuckets();
    mockProjects.clear();
  });

  function ticketsPatchRequest(id: string, body: Record<string, unknown>): NextRequest {
    return new NextRequest(`http://localhost:3000/api/tickets?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("assigns a ticket to an existing project and sets a branch override", async () => {
    mockProjects.set("PRJ-001", {
      id: "PRJ-001",
      name: "Concilium",
      repoUrl: null,
      defaultBranch: "main",
      sandboxProvider: "local",
      createPr: false,
      createdAt: new Date().toISOString(),
    });
    vi.mocked(serverDb.updateTicket).mockResolvedValue({ id: "TIX-001" } as never);

    const response = await ticketsPatch(
      ticketsPatchRequest("TIX-001", { projectId: "PRJ-001", branchOverride: "feature/x" })
    );
    expect(response.status).toBe(200);
    expect(serverDb.updateTicket).toHaveBeenCalledWith(
      "TIX-001",
      expect.objectContaining({ projectId: "PRJ-001", branchOverride: "feature/x" })
    );
  });

  it("clears projectId and branchOverride with null", async () => {
    vi.mocked(serverDb.updateTicket).mockResolvedValue({ id: "TIX-001" } as never);

    const response = await ticketsPatch(
      ticketsPatchRequest("TIX-001", { projectId: null, branchOverride: null })
    );
    expect(response.status).toBe(200);
    expect(serverDb.updateTicket).toHaveBeenCalledWith(
      "TIX-001",
      expect.objectContaining({ projectId: null, branchOverride: null })
    );
  });

  it("rejects malformed projectId values", async () => {
    const response = await ticketsPatch(
      ticketsPatchRequest("TIX-001", { projectId: "nope" })
    );
    expect(response.status).toBe(400);
    expect(serverDb.updateTicket).not.toHaveBeenCalled();
  });

  it("returns 404 when assigning a non-existent project", async () => {
    const response = await ticketsPatch(
      ticketsPatchRequest("TIX-001", { projectId: "PRJ-999" })
    );
    expect(response.status).toBe(404);
    expect(serverDb.updateTicket).not.toHaveBeenCalled();
  });

  it("rejects branch overrides with invalid characters", async () => {
    const response = await ticketsPatch(
      ticketsPatchRequest("TIX-001", { branchOverride: "bad branch!" })
    );
    expect(response.status).toBe(400);
    expect(serverDb.updateTicket).not.toHaveBeenCalled();
  });
});
