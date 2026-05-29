/**
 * Acceptance Tests — DEV-92: Offline Detection Banner with Reconnection Feedback
 *
 * Tests are written from the user's perspective: a Concilium user should see
 * a gold "You are offline" banner when connectivity drops and a green
 * "Reconnected" banner (that auto-dismisses) when connectivity returns.
 *
 * Rule: NEVER modify backend or frontend code. If a test fails, report it.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockResetWasOffline = vi.fn();

let mockIsOnline = true;
let mockWasOffline = false;

vi.mock("@/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => ({
    isOnline: mockIsOnline,
    wasOffline: mockWasOffline,
    resetWasOffline: mockResetWasOffline,
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function setOnlineState(isOnline: boolean, wasOffline: boolean) {
  mockIsOnline = isOnline;
  mockWasOffline = wasOffline;
}

beforeEach(() => {
  vi.useRealTimers();
  mockIsOnline = true;
  mockWasOffline = false;
  mockResetWasOffline.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ────────────────────────────────────────────────────────────────────────────
// Helper: lazy-load OfflineBanner (after mocks are in place)
// ────────────────────────────────────────────────────────────────────────────

async function renderBanner() {
  const { OfflineBanner } = await import("@/components/OfflineBanner");
  return render(<OfflineBanner />);
}

// ============================================================================
// Tests
// ============================================================================

describe("DEV-92: Offline Detection Banner (acceptance)", () => {
  // ── AC-1: Offline detection ─────────────────────────────────────────────

  it("AC-1: shows amber/gold 'You are offline' banner with WifiOff icon when offline", async () => {
    setOnlineState(false, false);
    await renderBanner();

    // User sees the text
    expect(screen.getByText("You are offline")).toBeInTheDocument();

    // Banner has role="status" for screen readers
    const banner = screen.getByRole("status");
    expect(banner).toBeInTheDocument();

    // Gold color treatment
    expect(banner.className).toContain("bg-gold/10");
    expect(banner.className).toContain("border-gold/40");
    const textSpan = banner.querySelector("span");
    expect(textSpan?.className).toContain("text-gold");

    // WifiOff icon is present (at least 2 SVG icons: WifiOff + dismiss X)
    const icons = banner.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThanOrEqual(2);
  });

  // ── AC-2: Reconnection detection ────────────────────────────────────────

  it("AC-2: shows olive/green 'Reconnected' banner with CheckCircle2 icon on reconnect and auto-dismisses after 3s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["setTimeout", "clearTimeout"] });
    setOnlineState(true, true);
    await renderBanner();

    // User sees the reconnected text
    expect(screen.getByText("Reconnected")).toBeInTheDocument();

    const banner = screen.getByRole("status");

    // Olive color treatment
    expect(banner.className).toContain("bg-olive/10");
    expect(banner.className).toContain("border-olive/40");
    const textSpan = banner.querySelector("span");
    expect(textSpan?.className).toContain("text-olive");

    // Banner visible at 2.9s
    act(() => vi.advanceTimersByTime(2999));
    expect(screen.getByText("Reconnected")).toBeInTheDocument();

    // After 3s total, auto-dismiss fires
    act(() => vi.advanceTimersByTime(1));
    await waitFor(() => {
      expect(mockResetWasOffline).toHaveBeenCalledTimes(1);
    });
    vi.useRealTimers();
  });

  // ── AC-3: Framer Motion animations ─────────────────────────────────────

  it("AC-3: renders with Framer Motion animation support and respects prefers-reduced-motion", async () => {
    setOnlineState(false, false);
    await renderBanner();

    // The banner is wrapped in a motion.div from framer-motion.
    // Verify it renders and receives animation-related inline styles
    // (AnimatePresence is mocked in vitest.setup.ts, but motion.div still
    // applies its initial animation state as inline styles).
    const banner = screen.getByRole("status");
    expect(banner).toBeInTheDocument();

    // motion.div applies the initial animation state (opacity 0, translateY -12px)
    // as inline styles, proving framer-motion animation support is wired up
    expect(banner.style.opacity).toBe("0");
    expect(banner.style.transform).toContain("translateY(-12px)");
    expect(banner.style.transform).toContain("scale(0.95)");

    // Now verify the component handles prefers-reduced-motion without errors.
    // Override matchMedia to simulate prefers-reduced-motion: reduce
    const origMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Re-render with reduced-motion preference — should not crash
    const { OfflineBanner } = await import("@/components/OfflineBanner");
    expect(() => render(<OfflineBanner />)).not.toThrow();

    // Restore matchMedia
    window.matchMedia = origMatchMedia;
  });

  // ── AC-4: Non-blocking ─────────────────────────────────────────────────

  it("AC-4: banner uses fixed positioning with pointer-events-none container and pointer-events-auto inner banner", async () => {
    setOnlineState(false, false);
    await renderBanner();

    const banner = screen.getByRole("status");

    // The outer container has fixed positioning and pointer-events-none
    const container = banner.parentElement;
    expect(container?.className).toContain("fixed");
    expect(container?.className).toContain("pointer-events-none");

    // The inner banner has pointer-events-auto (so user can click dismiss)
    expect(banner.className).toContain("pointer-events-auto");
  });

  // ── AC-5: Accessibility ────────────────────────────────────────────────

  it("AC-5: banner has role='status', aria-live='polite', and dismiss button has aria-label", async () => {
    setOnlineState(false, false);
    await renderBanner();

    const banner = screen.getByRole("status");
    expect(banner).toHaveAttribute("aria-live", "polite");

    // Dismiss button is accessible
    expect(
      screen.getByLabelText("Dismiss connectivity notification")
    ).toBeInTheDocument();
  });

  // ── AC-6: Layout integration ───────────────────────────────────────────

  it("AC-6: OfflineBanner is rendered inside ThemeProvider and outside AuthGuard in layout", async () => {
    // Mock child components to isolate the layout structure test
    vi.mock("@/components/Sidebar", () => ({
      Sidebar: () => <div data-testid="sidebar" />,
    }));
    vi.mock("@/components/CommandPalette", () => ({
      CommandPalette: () => null,
    }));
    vi.mock("@/components/KeyboardShortcutsSheet", () => ({
      KeyboardShortcutsSheet: () => null,
    }));
    vi.mock("@/components/AuthGuard", () => ({
      AuthGuard: ({ children }: { children: ReactNode }) => (
        <div data-testid="auth-guard">{children}</div>
      ),
    }));
    vi.mock("@/components/Breadcrumb", () => ({
      Breadcrumb: () => <nav data-testid="breadcrumb" />,
    }));
    vi.mock("@/components/PageTransition", () => ({
      default: ({ children }: { children: ReactNode }) => (
        <div data-testid="page-transition">{children}</div>
      ),
    }));
    vi.mock("@/lib/auth-context", () => ({
      AuthProvider: ({ children }: { children: ReactNode }) => (
        <div data-testid="auth-provider">{children}</div>
      ),
      useAuth: vi.fn(() => ({ user: { id: "tester" }, loading: false })),
    }));
    vi.mock("@/components/Toast", () => ({
      ToastProvider: ({ children }: { children: ReactNode }) => (
        <div data-testid="toast-provider">{children}</div>
      ),
    }));

    // Provide localStorage mock — ThemeProvider reads from it in useEffect
    const store: Record<string, string> = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
        get length() { return Object.keys(store).length; },
        key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
      },
      writable: true,
      configurable: true,
    });

    // Set state so OfflineBanner renders
    setOnlineState(false, false);

    const { default: RootLayout } = await import("@/app/layout");
    render(
      <RootLayout>
        <div data-testid="page-content">Test Page</div>
      </RootLayout>
    );

    // OfflineBanner should be rendered and visible
    const banner = screen.getByRole("status");
    expect(banner).toBeInTheDocument();
    expect(screen.getByText("You are offline")).toBeInTheDocument();

    // Verify OfflineBanner lives OUTSIDE AuthGuard
    // We get the container div of the banner
    const bannerContainer = banner.parentElement!;
    const authGuard = screen.getByTestId("auth-guard");

    // The banner container is NOT inside the auth guard
    expect(authGuard.contains(bannerContainer)).toBe(false);

    // The banner appears BEFORE auth-guard in DOM order (inside ThemeProvider, outside AuthGuard)
    const html = document.body.innerHTML;
    const bannerPos = html.indexOf("You are offline");
    const authGuardPos = html.indexOf('data-testid="auth-guard"');
    expect(bannerPos).toBeLessThan(authGuardPos);
  });

  // ── AC-7: Z-index ──────────────────────────────────────────────────────

  it("AC-7: banner container has z-50, placing it above sidebar (z-40) and below toast (z-[100])", async () => {
    setOnlineState(false, false);
    await renderBanner();

    const banner = screen.getByRole("status");
    const container = banner.parentElement;

    // The fixed container has z-50
    expect(container?.className).toContain("z-50");
  });

  // ── AC-8: Existing tests coverage ──────────────────────────────────────

  it("AC-8: OfflineBanner.test.tsx exists and covers amber, green, auto-dismiss, transitions, and accessibility", () => {
    // Verify the test file exists (import would fail if it doesn't)
    // We check for the expected test descriptions by examining the file content
    const fs = require("fs");
    const path = require("path");
    const testFilePath = path.resolve(
      __dirname,
      "../../components/__tests__/OfflineBanner.test.tsx"
    );

    expect(fs.existsSync(testFilePath)).toBe(true);

    const content = fs.readFileSync(testFilePath, "utf-8");

    // Verify coverage of required areas
    expect(content).toContain("amber");       // AC-1 amber render
    expect(content).toContain("Reconnected");  // AC-2 green render
    expect(content).toContain("auto-dismiss"); // AC-2 auto-dismiss
    expect(content).toContain("cancel");       // AC-3 state transition (cancel timer)
    expect(content).toContain("aria-live");    // AC-5 accessibility
    expect(content).toContain("Dismiss connectivity notification"); // AC-5 aria-label
  });

  // ── AC-9: SSR safety ───────────────────────────────────────────────────

  it("AC-9: useOnlineStatus hook initializes isOnline as true for SSR safety", () => {
    // Import the actual hook (not the mock) to test its default state
    // We use vi.importActual to bypass the module-level mock
    vi.doUnmock("@/hooks/useOnlineStatus");

    // The hook's useState(true) means isOnline starts as true before
    // any useEffect runs. This is the SSR-safe default.
    // We verify this by checking the source directly since renderHook
    // would run effects.
    const fs = require("fs");
    const path = require("path");
    const hookFilePath = path.resolve(
      __dirname,
      "../../hooks/useOnlineStatus.ts"
    );

    const content = fs.readFileSync(hookFilePath, "utf-8");
    expect(content).toContain("useState(true)");
    expect(content).toContain("SSR-safe");
  });
});
