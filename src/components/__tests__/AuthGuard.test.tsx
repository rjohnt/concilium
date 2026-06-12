/**
 * Unit Tests — DEV-81: AuthGuard Component
 *
 * AuthGuard wraps protected routes, handles auth state:
 * - Dev bypass when Supabase credentials missing
 * - Public path detection (startsWith: /login, /signup, /auth/callback; exact: /)
 * - Loading spinner while auth checks
 * - Redirect unauthenticated users to /login
 * - Redirect authenticated users away from auth pages
 *
 * Uses Vitest + @testing-library/react. Follows patterns from Sidebar.test.tsx
 * and Breadcrumb.test.tsx. Dev-bypass tests use vi.resetModules + dynamic import
 * pattern from acceptance-DEV-75.test.tsx.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ============================================================================
// Block A: Auth Logic Tests (static vi.mock — hoisted)
// ============================================================================
// Ensure dev bypass is OFF for these tests by setting a valid Supabase URL
// BEFORE the AuthGuard module is imported. vi.hoisted() runs before imports.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://valid-for-test.supabase.co";
});

// Hoisted mutable refs for dynamic mock return values
// Using vi.hoisted to ensure these are declared before the mock factories run
const { mockUsePathname, mockReplace, mockAuthUser } = vi.hoisted(() => ({
  mockUsePathname: vi.fn(() => "/"),
  mockReplace: vi.fn(),
  mockAuthUser: vi.fn<
    () => { user: Record<string, unknown> | null; loading: boolean; signOut: () => void }
  >(() => ({ user: null, loading: false, signOut: vi.fn() })),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockAuthUser(),
}));

// Must import AFTER mocks are set up (vi.mock is hoisted, so this is fine)
import { AuthGuard } from "../AuthGuard";

// ---- Helpers ----

const testUser = { id: "user-1", email: "test@example.com", user_metadata: { full_name: "Test User" } };

function renderAuthGuard(children?: React.ReactNode) {
  return render(
    <AuthGuard>
      {children ?? <div data-testid="child">Protected Content</div>}
    </AuthGuard>
  );
}

function setupAuthState(user: Record<string, unknown> | null, loading: boolean) {
  mockAuthUser.mockReturnValue({
    user: user as Record<string, unknown> | null,
    loading,
    signOut: vi.fn(),
  });
}

function setPathname(path: string) {
  mockUsePathname.mockReturnValue(path);
}

beforeEach(() => {
  vi.clearAllMocks();
  setPathname("/dashboard");
  setupAuthState(null, false);
});

// ============================================================================
// AC1 — Loading state shows loader
// ============================================================================

describe("AC1 — Loading state", () => {
  it("renders Loader2 spinner with 'Loading...' text when auth is loading on protected route", () => {
    setupAuthState(null, true);
    setPathname("/dashboard");

    renderAuthGuard();

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Loader2 renders as SVG with animate-spin class
    const svg = document.querySelector("svg.animate-spin");
    expect(svg).toBeInTheDocument();
  });

  it("has min-h-screen and coral spinner styling", () => {
    setupAuthState(null, true);
    setPathname("/dashboard");

    const { container } = renderAuthGuard();

    // The loading container has min-h-screen
    const loadingContainer = container.querySelector(".min-h-screen");
    expect(loadingContainer).toBeInTheDocument();

    // Coral rebrand: the spinner uses text-coral-500
    const spinner = container.querySelector("svg.text-coral-500");
    expect(spinner).toBeInTheDocument();
  });

  it("does NOT call router.replace() while loading", () => {
    setupAuthState(null, true);
    setPathname("/dashboard");

    renderAuthGuard();

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("shows spinner even when user is truthy but still loading", () => {
    setupAuthState(testUser as unknown as Record<string, unknown>, true);
    setPathname("/dashboard");

    renderAuthGuard();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not show spinner on public paths while loading (public check comes first)", () => {
    setupAuthState(null, true);
    setPathname("/login");

    const { container } = renderAuthGuard();

    // Public paths bypass loading check — children render directly
    expect(container.querySelector(".min-h-screen")).not.toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});

// ============================================================================
// AC2 — Unauthenticated user redirected to /login on protected routes
// ============================================================================

describe("AC2 — Unauthenticated user on protected routes", () => {
  it("redirects to /login on /dashboard", () => {
    setPathname("/dashboard");
    setupAuthState(null, false);

    const { container } = renderAuthGuard();

    expect(mockReplace).toHaveBeenCalledWith("/login");
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(container.firstChild).toBeNull();
  });

  it("redirects to /login on /ticket/TIX-001", () => {
    setPathname("/ticket/TIX-001");
    setupAuthState(null, false);

    const { container } = renderAuthGuard();

    expect(mockReplace).toHaveBeenCalledWith("/login");
    expect(container.firstChild).toBeNull();
  });

  it("redirects to /login on /new", () => {
    setPathname("/new");
    setupAuthState(null, false);

    const { container } = renderAuthGuard();

    expect(mockReplace).toHaveBeenCalledWith("/login");
    expect(container.firstChild).toBeNull();
  });

  it("redirects to /login on any unknown path", () => {
    setPathname("/some-random-path");
    setupAuthState(null, false);

    renderAuthGuard();

    expect(mockReplace).toHaveBeenCalledWith("/login");
  });
});

// ============================================================================
// AC3 — Authenticated user renders children on protected routes
// ============================================================================

describe("AC3 — Authenticated user on protected routes", () => {
  it("renders children on /dashboard", () => {
    setPathname("/dashboard");
    setupAuthState(testUser as unknown as Record<string, unknown>, false);

    renderAuthGuard(<p data-testid="child">Dashboard Contents</p>);

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Dashboard Contents")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders children on /ticket/TIX-001", () => {
    setPathname("/ticket/TIX-001");
    setupAuthState(testUser as unknown as Record<string, unknown>, false);

    renderAuthGuard();

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// ============================================================================
// AC4 — Authenticated user on auth pages redirected to /
// ============================================================================

describe("AC4 — Authenticated user on auth pages", () => {
  it("redirects from /login to / when authenticated", () => {
    setPathname("/login");
    setupAuthState(testUser as unknown as Record<string, unknown>, false);

    const { container } = renderAuthGuard();

    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(container.firstChild).toBeNull();
  });

  it("redirects from /signup to / when authenticated", () => {
    setPathname("/signup");
    setupAuthState(testUser as unknown as Record<string, unknown>, false);

    const { container } = renderAuthGuard();

    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(container.firstChild).toBeNull();
  });

  it("does NOT redirect from /auth/callback when authenticated (not /login or /signup)", () => {
    setPathname("/auth/callback");
    setupAuthState(testUser as unknown as Record<string, unknown>, false);

    renderAuthGuard();

    // /auth/callback is public and NOT in the login/signup redirect check
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

});

// ============================================================================
// AC5 — Unauthenticated access to public paths
// ============================================================================

describe("AC5 — Unauthenticated access to public paths", () => {
  it("allows access to /login", () => {
    setPathname("/login");
    setupAuthState(null, false);

    renderAuthGuard();

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("allows access to /signup", () => {
    setPathname("/signup");
    setupAuthState(null, false);

    renderAuthGuard();

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("allows access to /auth/callback", () => {
    setPathname("/auth/callback");
    setupAuthState(null, false);

    renderAuthGuard();

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("allows access to /auth/callback?code=abc (startsWith match)", () => {
    setPathname("/auth/callback?code=abc123");
    setupAuthState(null, false);

    renderAuthGuard();

    // startsWith("/auth/callback") matches — treated as public
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("allows access to / (root, exact match)", () => {
    setPathname("/");
    setupAuthState(null, false);

    renderAuthGuard();

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("protects /dashboard (no startsWith or exact match for public)", () => {
    setPathname("/dashboard");
    setupAuthState(null, false);

    const { container } = renderAuthGuard();

    expect(mockReplace).toHaveBeenCalledWith("/login");
    expect(container.firstChild).toBeNull();
  });
});

// ============================================================================
// AC6 — Dev bypass mode
// ============================================================================
// isDevBypass is a module-level constant evaluated at import time.
// We use vi.resetModules() + dynamic import() to reload AuthGuard with
// different env values, following the acceptance-DEV-75.test.tsx pattern.

describe("AC6 — Dev bypass mode", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    // Reset to safe value for other test blocks
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://valid-for-test.supabase.co";
  });

  it("renders children when NEXT_PUBLIC_SUPABASE_URL is missing (unauthenticated, protected route)", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    vi.doMock("next/navigation", () => ({
      usePathname: () => "/dashboard",
      useRouter: () => ({ replace: vi.fn() }),
    }));
    vi.doMock("@/lib/auth-context", () => ({
      useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
    }));

    const { AuthGuard: BypassAuthGuard } = await import("../AuthGuard");
    const mockReplace = vi.fn();

    render(
      <BypassAuthGuard>
        <div data-testid="bypass-child">Bypassed Content</div>
      </BypassAuthGuard>
    );

    expect(screen.getByTestId("bypass-child")).toBeInTheDocument();
    expect(screen.getByText("Bypassed Content")).toBeInTheDocument();
  });

  it("renders children when NEXT_PUBLIC_SUPABASE_URL contains 'placeholder'", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder-project.supabase.co";

    vi.doMock("next/navigation", () => ({
      usePathname: () => "/dashboard",
      useRouter: () => ({ replace: vi.fn() }),
    }));
    vi.doMock("@/lib/auth-context", () => ({
      useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
    }));

    const { AuthGuard: BypassAuthGuard } = await import("../AuthGuard");

    render(
      <BypassAuthGuard>
        <div data-testid="bypass-child">Bypassed Content</div>
      </BypassAuthGuard>
    );

    expect(screen.getByTestId("bypass-child")).toBeInTheDocument();
  });

  it("dev bypass works regardless of auth state (loading=true, path=/dashboard)", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    vi.doMock("next/navigation", () => ({
      usePathname: () => "/dashboard",
      useRouter: () => ({ replace: vi.fn() }),
    }));
    vi.doMock("@/lib/auth-context", () => ({
      useAuth: () => ({ user: null, loading: true, signOut: vi.fn() }),
    }));

    const { AuthGuard: BypassAuthGuard } = await import("../AuthGuard");

    render(
      <BypassAuthGuard>
        <div data-testid="bypass-child">Even Loading Bypassed</div>
      </BypassAuthGuard>
    );

    expect(screen.getByTestId("bypass-child")).toBeInTheDocument();
  });

  it("dev bypass does NOT activate when a valid Supabase URL is set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://real-project.supabase.co";

    const mockBypassReplace = vi.fn();
    vi.doMock("next/navigation", () => ({
      usePathname: () => "/dashboard",
      useRouter: () => ({ replace: mockBypassReplace }),
    }));
    vi.doMock("@/lib/auth-context", () => ({
      useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
    }));

    const { AuthGuard: BypassAuthGuard } = await import("../AuthGuard");

    const { container } = render(
      <BypassAuthGuard>
        <div data-testid="bypass-child">Should Not Render</div>
      </BypassAuthGuard>
    );

    // Valid Supabase URL → normal auth flow: redirect to /login
    expect(mockBypassReplace).toHaveBeenCalledWith("/login");
    expect(container.firstChild).toBeNull();
  });
});

// ============================================================================
// AC7 — All tests pass with npm test
// ============================================================================
// Verified by running: npm test -- src/components/__tests__/AuthGuard.test.tsx
// All tests in this file must pass with exit code 0.

// ============================================================================
// AC8 — Follows Concilium test conventions
// ============================================================================
// - File: src/components/__tests__/AuthGuard.test.tsx ✓
// - Vitest + @testing-library/react ✓
// - jsdom environment (via vitest.config.ts) ✓
// - Mirror source structure ✓
// - Uses existing mock patterns (Sidebar, Breadcrumb, acceptance tests) ✓
// - No 'any' types ✓
// - Proper describe/it blocks with beforeEach/afterEach cleanup ✓
// - Tests from user perspective (checking rendered output, not implementation) ✓
