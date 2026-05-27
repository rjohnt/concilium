import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import PageTransition from "../PageTransition";

// jsdom doesn't ship matchMedia — stub it
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Mock framer-motion to simplify testing — render children plainly
vi.mock("framer-motion", () => ({
  AnimatePresence: ({
    children,
    mode,
  }: {
    children: React.ReactNode;
    mode?: string;
  }) => (
    <div data-testid="animate-presence" data-mode={mode}>
      {children}
    </div>
  ),
  motion: {
    div: ({
      children,
      ...props
    }: React.ComponentProps<"div"> & { key?: React.Key }) => (
      <div data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock next/navigation to control pathname
const mockUsePathname = vi.fn(() => "/test-path");
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("PageTransition", () => {
  it("renders children", () => {
    render(
      <PageTransition>
        <p>Hello World</p>
      </PageTransition>
    );
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("uses usePathname (validating key comes from pathname)", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(
      <PageTransition>
        <span>Content</span>
      </PageTransition>
    );
    // The component calls usePathname to derive its key
    expect(mockUsePathname).toHaveBeenCalled();
  });

  it("AnimatePresence mode is 'wait'", () => {
    render(
      <PageTransition>
        <span>Content</span>
      </PageTransition>
    );
    const ap = screen.getByTestId("animate-presence");
    expect(ap.getAttribute("data-mode")).toBe("wait");
  });

  it("reacts to pathname changes (key-driven re-render)", () => {
    mockUsePathname.mockReturnValue("/first");
    const { rerender } = render(
      <PageTransition>
        <span>First</span>
      </PageTransition>
    );
    expect(screen.getByText("First")).toBeInTheDocument();

    mockUsePathname.mockReturnValue("/second");
    rerender(
      <PageTransition>
        <span>Second</span>
      </PageTransition>
    );
    expect(screen.getByText("Second")).toBeInTheDocument();
  });
});
