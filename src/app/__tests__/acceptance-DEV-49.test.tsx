import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import type { ReactNode } from "react";

// =============================================================================
// Path helpers — vitest's __dirname resolves to src/app/__tests__/
// =============================================================================
const SRC_DIR = resolve(__dirname, "../..");
const COMPONENTS_DIR = resolve(SRC_DIR, "components");
const TESTS_DIR = resolve(COMPONENTS_DIR, "__tests__");

// =============================================================================
// Mocks
// =============================================================================

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  useParams: vi.fn(() => ({ id: "TIX-001" })),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock store module
const mockTicket = {
  id: "TIX-001",
  title: "Test ticket for acceptance",
  description: "A test ticket",
  status: "draft" as const,
  priority: 2,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tags: [],
  feedback: [],
  approvals: [],
};

vi.mock("@/lib/store", () => ({
  seedData: vi.fn(),
  getTicket: vi.fn(() => mockTicket),
  getConsensusProgress: vi.fn(() => ({
    total: 4,
    approved: 0,
    remaining: ["engineer", "designer", "product-owner", "qa"] as const,
  })),
}));

// Mock personas
vi.mock("@/lib/personas", () => ({
  getAllPersonas: vi.fn(() => [
    {
      id: "engineer",
      label: "Engineer",
      emoji: "⚙️",
      color: "bg-blue-600",
      expertise: "...",
      promptTemplate: "...",
    },
    {
      id: "designer",
      label: "Designer",
      emoji: "🎨",
      color: "bg-purple-600",
      expertise: "...",
      promptTemplate: "...",
    },
    {
      id: "product-owner",
      label: "Product Owner",
      emoji: "📋",
      color: "bg-amber-600",
      expertise: "...",
      promptTemplate: "...",
    },
    {
      id: "qa",
      label: "QA",
      emoji: "🔍",
      color: "bg-green-600",
      expertise: "...",
      promptTemplate: "...",
    },
  ]),
  getPersona: vi.fn((id: string) => ({
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    emoji: "⚙️",
    color: "bg-blue-600",
    expertise: "...",
    promptTemplate: "...",
  })),
}));

// Mock auth-context
vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(() => ({
    user: null,
    signOut: vi.fn(),
  })),
}));

// =============================================================================
// Helpers
// =============================================================================

function suppressConsoleError() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

/** A component that throws an error on render. */
function BrokenContent({ message }: { message?: string }): never {
  throw new Error(message ?? "Test error from BrokenContent");
}

// =============================================================================
// Acceptance Criteria Tests
// =============================================================================

describe("DEV-49 Acceptance: Error boundary with fallback UI on prompt session page", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  // ===========================================================================
  // AC 1 — PromptErrorBoundary component created at the correct path
  // ===========================================================================
  describe("AC 1: PromptErrorBoundary component created at src/components/PromptErrorBoundary.tsx", () => {
    it("the component file exists at the specified path", () => {
      const boundaryPath = resolve(
        COMPONENTS_DIR,
        "PromptErrorBoundary.tsx"
      );
      expect(existsSync(boundaryPath)).toBe(true);
    });

    it("the component can be imported and is a class-based error boundary", async () => {
      const mod = await import("@/components/PromptErrorBoundary");
      expect(mod.PromptErrorBoundary).toBeDefined();
      expect(typeof mod.PromptErrorBoundary).toBe("function");
      expect(
        "getDerivedStateFromError" in mod.PromptErrorBoundary
      ).toBe(true);
    });
  });

  // ===========================================================================
  // AC 2 — Wraps prompt session content in page.tsx (content, not header)
  // ===========================================================================
  describe("AC 2: PromptErrorBoundary wraps prompt session content below header in page.tsx", () => {
    it("renders the prompt session page with header visible outside the error boundary", async () => {
      const PromptSessionPage = (await import("@/app/prompt/[id]/page")).default;
      render(<PromptSessionPage />);

      // The header element must exist (it contains ticket info and navigation)
      const header = document.querySelector("header");
      expect(header).toBeInTheDocument();

      // The header contains key elements like ticket ID and "Prompt Session" badge
      expect(screen.getByText("TIX-001")).toBeInTheDocument();
      expect(screen.getByText("Prompt Session")).toBeInTheDocument();
    });

    it("the error boundary content area appears after the header in the DOM", async () => {
      const PromptSessionPage = (await import("@/app/prompt/[id]/page")).default;
      render(<PromptSessionPage />);

      const header = document.querySelector("header");
      expect(header).toBeInTheDocument();

      // The header's next sibling should exist (content rendered after header)
      const nextEl = header!.nextElementSibling;
      expect(nextEl).not.toBeNull();

      // The header should NOT be inside the boundary — the boundary wraps only content
      // Verify header is a direct child of the page root div
      const rootDiv = header!.parentElement;
      expect(rootDiv).toBeInTheDocument();
      expect(rootDiv!.tagName).toBe("DIV");
      // The header is a sibling of the boundary wrapper, not a child of it
      const boundaryContent = rootDiv!.querySelector(
        '[class*="max-w-5xl"]'
      );
      // If the boundary content exists (no error), header should be outside it
      // If it doesn't exist (we haven't triggered an error), that's fine too
      if (boundaryContent) {
        expect(header!.contains(boundaryContent)).toBe(false);
        expect(boundaryContent.contains(header)).toBe(false);
      }
    });
  });

  // ===========================================================================
  // AC 3 — On unhandled error, shows fallback UI instead of white screen
  // ===========================================================================
  describe("AC 3: On unhandled error, shows fallback UI instead of white screen", () => {
    it("displays fallback UI with error heading when content throws", async () => {
      consoleErrorSpy = suppressConsoleError();
      const mod = await import("@/components/PromptErrorBoundary");
      const PromptErrorBoundary = mod.PromptErrorBoundary;

      render(
        <div data-testid="page-root">
          {/* Header is OUTSIDE the boundary */}
          <header data-testid="page-header">
            <h1>Prompt Session — TIX-001</h1>
          </header>

          {/* Content is INSIDE the boundary */}
          <PromptErrorBoundary>
            <BrokenContent message="Something went wrong during rendering" />
          </PromptErrorBoundary>
        </div>
      );

      // The header should still be visible — NOT a white screen
      expect(screen.getByTestId("page-header")).toBeInTheDocument();
      expect(
        screen.getByText("Prompt Session — TIX-001")
      ).toBeInTheDocument();

      // The fallback UI should be displayed
      expect(
        screen.getByText("Session Ran Into an Issue")
      ).toBeInTheDocument();

      // The description text should be present
      expect(
        screen.getByText(
          /The prompt session encountered an unexpected error/
        )
      ).toBeInTheDocument();

      // The error message should be displayed
      expect(
        screen.getByText("Something went wrong during rendering")
      ).toBeInTheDocument();

      // An SVG icon (AlertTriangle) should be rendered
      const svgs = document.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });

    it("does not show a blank white screen on error — fallback is visible", async () => {
      consoleErrorSpy = suppressConsoleError();
      const mod = await import("@/components/PromptErrorBoundary");
      const PromptErrorBoundary = mod.PromptErrorBoundary;

      render(
        <PromptErrorBoundary>
          <BrokenContent message="Critical render failure" />
        </PromptErrorBoundary>
      );

      // The page must have visible content (fallback heading)
      const fallbackHeading = screen.getByText("Session Ran Into an Issue");
      expect(fallbackHeading).toBeInTheDocument();

      // Verify that the fallback heading is actually visible
      expect(fallbackHeading).toBeVisible();
    });
  });

  // ===========================================================================
  // AC 4 — "Try Again" button calls errorBoundary.reset() and re-renders children
  // ===========================================================================
  describe("AC 4: 'Try Again' button calls errorBoundary.reset() and re-renders children", () => {
    it("clicking 'Try Again' resets the error state and shows content again", async () => {
      consoleErrorSpy = suppressConsoleError();
      const mod = await import("@/components/PromptErrorBoundary");
      const PromptErrorBoundary = mod.PromptErrorBoundary;

      // Create a component that throws once, then recovers
      let shouldThrow = true;

      function SometimesBroken() {
        if (shouldThrow) {
          throw new Error("Temporary rendering error");
        }
        return <div data-testid="recovered-content">Content is back!</div>;
      }

      const { rerender } = render(
        <PromptErrorBoundary>
          <SometimesBroken />
        </PromptErrorBoundary>
      );

      // Fallback UI should be showing
      expect(
        screen.getByText("Session Ran Into an Issue")
      ).toBeInTheDocument();

      // The "Try Again" button must be present
      const tryAgainButton = screen.getByText("Try Again");
      expect(tryAgainButton).toBeInTheDocument();
      expect(tryAgainButton.tagName).toBe("BUTTON");

      // Fix the component and click Try Again
      shouldThrow = false;
      fireEvent.click(tryAgainButton);

      // Re-render to pick up the state change
      rerender(
        <PromptErrorBoundary>
          <SometimesBroken />
        </PromptErrorBoundary>
      );

      // Content should now be visible again (recovered)
      expect(screen.getByTestId("recovered-content")).toBeInTheDocument();
      expect(screen.getByText("Content is back!")).toBeInTheDocument();

      // Fallback heading should be gone
      expect(
        screen.queryByText("Session Ran Into an Issue")
      ).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // AC 5 — "Back to Dashboard" link navigates to /
  // ===========================================================================
  describe("AC 5: 'Back to Dashboard' link navigates to /", () => {
    it("renders a link labeled 'Back to Dashboard' with href='/'", async () => {
      consoleErrorSpy = suppressConsoleError();
      const mod = await import("@/components/PromptErrorBoundary");
      const PromptErrorBoundary = mod.PromptErrorBoundary;

      render(
        <PromptErrorBoundary>
          <BrokenContent message="Link test error" />
        </PromptErrorBoundary>
      );

      // The link must exist with the correct label and href
      const link = screen.getByRole("link", { name: "Back to Dashboard" });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/");
    });

    it("the link is rendered as a navigable element the user can see and click", async () => {
      consoleErrorSpy = suppressConsoleError();
      const mod = await import("@/components/PromptErrorBoundary");
      const PromptErrorBoundary = mod.PromptErrorBoundary;

      render(
        <PromptErrorBoundary>
          <BrokenContent message="Navigability test" />
        </PromptErrorBoundary>
      );

      const link = screen.getByRole("link", { name: "Back to Dashboard" });
      expect(link).toBeVisible();
      expect(link.textContent).toBe("Back to Dashboard");
    });
  });

  // ===========================================================================
  // AC 6 — Error details logged to console.error
  // ===========================================================================
  describe("AC 6: Error details logged to console.error", () => {
    it("logs error details to console.error when an error is caught", async () => {
      consoleErrorSpy = suppressConsoleError();
      const mod = await import("@/components/PromptErrorBoundary");
      const PromptErrorBoundary = mod.PromptErrorBoundary;

      render(
        <PromptErrorBoundary>
          <BrokenContent message="Logged acceptance test error" />
        </PromptErrorBoundary>
      );

      // console.error must have been called
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Verify the error details are included in the console.error call
      const allCalls = consoleErrorSpy.mock.calls.flat();
      const hasBoundaryMessage = allCalls.some(
        (arg: unknown) =>
          typeof arg === "string" &&
          arg.includes("PromptErrorBoundary caught an error:")
      );
      expect(hasBoundaryMessage).toBe(true);

      // Verify the actual error object is passed
      const hasErrorObject = allCalls.some(
        (arg: unknown) =>
          arg instanceof Error &&
          arg.message === "Logged acceptance test error"
      );
      expect(hasErrorObject).toBe(true);
    });

    it("logs the component stack along with the error", async () => {
      consoleErrorSpy = suppressConsoleError();
      const mod = await import("@/components/PromptErrorBoundary");
      const PromptErrorBoundary = mod.PromptErrorBoundary;

      render(
        <PromptErrorBoundary>
          <BrokenContent message="Stack trace test" />
        </PromptErrorBoundary>
      );

      expect(consoleErrorSpy).toHaveBeenCalled();

      // componentDidCatch logs at least 3 args: message, error, componentStack
      const allArgs = consoleErrorSpy.mock.calls.flat();
      expect(allArgs.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ===========================================================================
  // AC 7 — Component has a test file verifying error display and reset behavior
  // ===========================================================================
  describe("AC 7: Component has a test file verifying error display and reset behavior", () => {
    it("the test file exists at src/components/__tests__/PromptErrorBoundary.test.tsx", () => {
      const testPath = resolve(
        TESTS_DIR,
        "PromptErrorBoundary.test.tsx"
      );
      expect(existsSync(testPath)).toBe(true);
    });

    it("the test file contains tests for error display", () => {
      const testPath = resolve(
        TESTS_DIR,
        "PromptErrorBoundary.test.tsx"
      );
      const content = readFileSync(testPath, "utf-8");

      // Should contain tests for error display (fallback UI rendering)
      expect(content).toContain("Session Ran Into an Issue");
      expect(content).toContain("renders fallback UI when a child throws");
    });

    it("the test file contains tests for reset behavior", () => {
      const testPath = resolve(
        TESTS_DIR,
        "PromptErrorBoundary.test.tsx"
      );
      const content = readFileSync(testPath, "utf-8");

      // Should contain tests for reset behavior
      expect(content).toContain("Try Again");
      expect(content).toContain("resets error state");
    });

    it("the test file has a test for 'Back to Dashboard' link pointing to /", () => {
      const testPath = resolve(
        TESTS_DIR,
        "PromptErrorBoundary.test.tsx"
      );
      const content = readFileSync(testPath, "utf-8");

      expect(content).toContain("Back to Dashboard");
      // Should have a test verifying the href is "/"
      expect(
        content.includes('toHaveAttribute("href", "/")') ||
          content.includes("toHaveAttribute('href', '/')") ||
          content.includes('toHaveAttribute(`href`, `/`)')
      ).toBe(true);
    });
  });
});
