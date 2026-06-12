/**
 * Sandbox provider registry — selection order is project setting, then
 * CONCILIUM_SANDBOX_PROVIDER, then "local"; unknown names warn + fall back.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getSandboxProvider,
  localSandboxProvider,
  dockerSandboxProvider,
  daytonaSandboxProvider,
} from "../index";

beforeEach(() => {
  delete process.env.CONCILIUM_SANDBOX_PROVIDER;
});

afterEach(() => {
  delete process.env.CONCILIUM_SANDBOX_PROVIDER;
  vi.restoreAllMocks();
});

describe("getSandboxProvider", () => {
  it("defaults to the local provider", () => {
    expect(getSandboxProvider()).toBe(localSandboxProvider);
    expect(getSandboxProvider(null)).toBe(localSandboxProvider);
    expect(getSandboxProvider("")).toBe(localSandboxProvider);
  });

  it("selects by project setting", () => {
    expect(getSandboxProvider("docker")).toBe(dockerSandboxProvider);
    expect(getSandboxProvider("daytona")).toBe(daytonaSandboxProvider);
    expect(getSandboxProvider("local")).toBe(localSandboxProvider);
  });

  it("falls back to CONCILIUM_SANDBOX_PROVIDER when no project setting is given", () => {
    process.env.CONCILIUM_SANDBOX_PROVIDER = "docker";
    expect(getSandboxProvider()).toBe(dockerSandboxProvider);
  });

  it("prefers the project setting over the env var", () => {
    process.env.CONCILIUM_SANDBOX_PROVIDER = "docker";
    expect(getSandboxProvider("local")).toBe(localSandboxProvider);
  });

  it("warns and falls back to local for unknown provider names", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(getSandboxProvider("fly")).toBe(localSandboxProvider);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"fly"'));
  });
});
