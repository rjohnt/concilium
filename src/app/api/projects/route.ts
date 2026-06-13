/**
 * /api/projects — project settings CRUD.
 *
 * GET   /api/projects        — list all projects
 * GET   /api/projects?id=X   — get a single project
 * POST  /api/projects        — create a project { name, repoUrl?, defaultBranch?, sandboxProvider?, createPr? }
 * PATCH /api/projects?id=X   — update a project's settings
 *
 * Mutations are rate-limited per IP, mirroring /api/build.
 */

import { NextRequest, NextResponse } from "next/server";
import * as serverDb from "@/lib/server-db";
import { SANDBOX_PROVIDERS, SandboxProvider } from "@/lib/types";
import type { RateLimitConfig } from "@/lib/types";
import { checkRateLimit, extractIp, applyRateLimitHeaders } from "@/lib/rateLimit";
import { sanitize } from "@/lib/sanitize";
import { isAllowedRepoUrl, REPO_URL_REQUIREMENTS } from "@/lib/git-url";

const PROJECT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000, // 1 minute
  maxRequests: 20,
};

const PROJECT_ID_PATTERN = /^PRJ-\d{3}$/;
/** Git branch names: conservative allow-list (letters, digits, ._/-). */
const BRANCH_PATTERN = /^[A-Za-z0-9._\/-]{1,200}$/;

type ParsedSettings =
  | { ok: true; updates: serverDb.ProjectUpdates }
  | { ok: false; error: string };

/** Validate + sanitize the optional settings fields shared by POST and PATCH. */
function parseSettings(body: Record<string, unknown>): ParsedSettings {
  const updates: serverDb.ProjectUpdates = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return { ok: false, error: "Invalid field: name must be a non-empty string" };
    }
    updates.name = sanitize(body.name.trim());
  }

  if (body.repoUrl !== undefined) {
    if (body.repoUrl === null || body.repoUrl === "") {
      updates.repoUrl = null;
    } else if (typeof body.repoUrl === "string") {
      // repoUrl flows into `git clone` in the sandbox layer — reject anything
      // that is not a plain https/ssh/scp-style git remote (no ext::, no
      // file://, no option-looking values). See @/lib/git-url.
      const repoUrl = sanitize(body.repoUrl.trim());
      if (!isAllowedRepoUrl(repoUrl)) {
        return { ok: false, error: `Invalid field: ${REPO_URL_REQUIREMENTS}` };
      }
      updates.repoUrl = repoUrl;
    } else {
      return { ok: false, error: "Invalid field: repoUrl must be a string or null" };
    }
  }

  if (body.defaultBranch !== undefined) {
    if (typeof body.defaultBranch !== "string" || !BRANCH_PATTERN.test(body.defaultBranch.trim())) {
      return { ok: false, error: "Invalid field: defaultBranch must be a valid branch name" };
    }
    updates.defaultBranch = body.defaultBranch.trim();
  }

  if (body.sandboxProvider !== undefined) {
    if (
      typeof body.sandboxProvider !== "string" ||
      !SANDBOX_PROVIDERS.includes(body.sandboxProvider as SandboxProvider)
    ) {
      return {
        ok: false,
        error: `Invalid field: sandboxProvider must be one of ${SANDBOX_PROVIDERS.join(", ")}`,
      };
    }
    updates.sandboxProvider = body.sandboxProvider as SandboxProvider;
  }

  if (body.createPr !== undefined) {
    if (typeof body.createPr !== "boolean") {
      return { ok: false, error: "Invalid field: createPr must be a boolean" };
    }
    updates.createPr = body.createPr;
  }

  return { ok: true, updates };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const project = await serverDb.getProject(id);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      return NextResponse.json({ project });
    }

    const projects = await serverDb.getProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ip = extractIp(request);
  const rateLimitResult = checkRateLimit(ip, PROJECT_RATE_LIMIT);

  if (!rateLimitResult.allowed) {
    const retryAfter = rateLimitResult.reset - Math.ceil(Date.now() / 1000);
    const response = NextResponse.json(
      { error: "Too many requests", retryAfter: Math.max(0, retryAfter) },
      { status: 429 }
    );
    return applyRateLimitHeaders(response, rateLimitResult);
  }

  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      const response = NextResponse.json(
        { error: "Missing required field: name (string)" },
        { status: 400 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    const parsed = parseSettings(body);
    if (!parsed.ok) {
      const response = NextResponse.json({ error: parsed.error }, { status: 400 });
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    const { name, ...options } = parsed.updates;
    const project = await serverDb.createProject(name!, options);

    const response = NextResponse.json({ project }, { status: 201 });
    return applyRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error("POST /api/projects error:", error);
    const response = NextResponse.json({ error: "Internal server error" }, { status: 500 });
    return applyRateLimitHeaders(response, rateLimitResult);
  }
}

export async function PATCH(request: NextRequest) {
  const ip = extractIp(request);
  const rateLimitResult = checkRateLimit(ip, PROJECT_RATE_LIMIT);

  if (!rateLimitResult.allowed) {
    const retryAfter = rateLimitResult.reset - Math.ceil(Date.now() / 1000);
    const response = NextResponse.json(
      { error: "Too many requests", retryAfter: Math.max(0, retryAfter) },
      { status: 429 }
    );
    return applyRateLimitHeaders(response, rateLimitResult);
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      const response = NextResponse.json(
        { error: "Missing project id query parameter" },
        { status: 400 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    if (!PROJECT_ID_PATTERN.test(id)) {
      const response = NextResponse.json(
        { error: "Invalid project ID format. Expected: PRJ-XXX" },
        { status: 400 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    const body = await request.json();
    const parsed = parseSettings(body);
    if (!parsed.ok) {
      const response = NextResponse.json({ error: parsed.error }, { status: 400 });
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    const project = await serverDb.updateProject(id, parsed.updates);
    if (!project) {
      const response = NextResponse.json({ error: "Project not found" }, { status: 404 });
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    const response = NextResponse.json({ project });
    return applyRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error("PATCH /api/projects error:", error);
    const response = NextResponse.json({ error: "Internal server error" }, { status: 500 });
    return applyRateLimitHeaders(response, rateLimitResult);
  }
}
