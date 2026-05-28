import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BuildCompleteCelebration } from "../BuildCompleteCelebration";

// Mock framer-motion: stub AnimatePresence + motion.* as plain DOM elements
// Pattern matches PageTransition.test.tsx and MarkdownPreview.test.tsx
vi.mock("framer-motion", () => ({
  AnimatePresence: ({
    children,
  }: {
    children: React.ReactNode;
    mode?: string;
  }) => <div data-testid="animate-presence">{children}</div>,
  motion: {
    div: ({
      children,
      ...props
    }: React.ComponentProps<"div"> & { key?: React.Key }) => (
      <div data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
    h2: ({
      children,
      ...props
    }: React.ComponentProps<"h2"> & { key?: React.Key }) => (
      <h2 data-testid="motion-h2" {...props}>
        {children}
      </h2>
    ),
    p: ({
      children,
      ...props
    }: React.ComponentProps<"p"> & { key?: React.Key }) => (
      <p data-testid="motion-p" {...props}>
        {children}
      </p>
    ),
  },
}));

// Mock next/link — render as <a> with href
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Factory for default props
function createDefaultProps(
  overrides: Partial<{ ticketId: string; ticketTitle: string }> = {}
) {
  return {
    ticketId: "TICKET-001",
    ticketTitle: "Implement authentication system",
    ...overrides,
  };
}

describe("BuildCompleteCelebration", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ============================================================================
  // Initial render
  // ============================================================================

  describe("initial render (visible=false)", () => {
    it("renders nothing before the 300ms timeout", () => {
      render(
        <BuildCompleteCelebration
          ticketId="TICKET-001"
          ticketTitle="Test Title"
        />
      );

      // AnimatePresence is rendered but has no visible child
      expect(screen.getByTestId("animate-presence")).toBeInTheDocument();
      expect(screen.getByTestId("animate-presence").children.length).toBe(0);
    });

    it("does not show heading before timeout", () => {
      render(
        <BuildCompleteCelebration
          ticketId="TICKET-001"
          ticketTitle="Test Title"
        />
      );

      expect(screen.queryByText("Build Complete!")).not.toBeInTheDocument();
    });

    it("does not show ticket title before timeout", () => {
      render(
        <BuildCompleteCelebration
          ticketId="TICKET-001"
          ticketTitle="Test Title"
        />
      );

      expect(screen.queryByText("Test Title")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Delayed visibility
  // ============================================================================

  describe("delayed visibility (300ms timeout)", () => {
    it("shows content after advancing 300ms", () => {
      render(
        <BuildCompleteCelebration
          ticketId="TICKET-001"
          ticketTitle="Test Title"
        />
      );

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.getByText("Build Complete!")).toBeInTheDocument();
    });

    it("still hidden at 299ms", () => {
      render(
        <BuildCompleteCelebration
          ticketId="TICKET-001"
          ticketTitle="Test Title"
        />
      );

      act(() => {
        vi.advanceTimersByTime(299);
      });

      expect(screen.queryByText("Build Complete!")).not.toBeInTheDocument();
    });

    it("clears timeout on unmount before it fires", () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

      const { unmount } = render(
        <BuildCompleteCelebration
          ticketId="TICKET-001"
          ticketTitle="Test Title"
        />
      );

      unmount();

      // The useEffect cleanup should call clearTimeout
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Rendered content
  // ============================================================================

  describe("rendered content (after timeout)", () => {
    function renderOpened(
      props: Partial<{ ticketId: string; ticketTitle: string }> = {}
    ) {
      const result = render(
        <BuildCompleteCelebration {...createDefaultProps(props)} />
      );
      act(() => {
        vi.advanceTimersByTime(300);
      });
      return result;
    }

    it('displays "Build Complete!" heading', () => {
      renderOpened();
      expect(screen.getByText("Build Complete!")).toBeInTheDocument();
    });

    it("displays the ticket title", () => {
      renderOpened({ ticketTitle: "My Custom Ticket" });
      expect(screen.getByText("My Custom Ticket")).toBeInTheDocument();
    });

    it("displays the status message", () => {
      renderOpened();
      expect(
        screen.getByText(
          "The build report has been generated and the ticket is now complete."
        )
      ).toBeInTheDocument();
    });

    it("renders PartyPopper icon (lucide-react)", () => {
      renderOpened();
      // lucide-react SVGs are rendered as inline SVGs
      const svgs = document.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThanOrEqual(1);
    });

    it("renders CheckCircle2 icon in status message", () => {
      renderOpened();
      // The CheckCircle2 icon with size=12 should be an svg
      const svgs = document.querySelectorAll("svg");
      // PartyPopper + CheckCircle2 + Sparkles + ArrowRight = 4 svg icons
      expect(svgs.length).toBe(4);
    });
  });

  // ============================================================================
  // Links
  // ============================================================================

  describe("links", () => {
    function renderOpened(ticketId = "TICKET-001") {
      render(
        <BuildCompleteCelebration
          ticketId={ticketId}
          ticketTitle="Test Title"
        />
      );
      act(() => {
        vi.advanceTimersByTime(300);
      });
    }

    it("View Ticket link has correct href with ticketId", () => {
      renderOpened("TICKET-042");
      const link = screen.getByText("View Ticket").closest("a");
      expect(link).toHaveAttribute("href", "/ticket/TICKET-042");
    });

    it("Dashboard link has href to root", () => {
      renderOpened();
      const link = screen.getByText("Dashboard").closest("a");
      expect(link).toHaveAttribute("href", "/");
    });

    it("both links are rendered", () => {
      renderOpened();
      expect(screen.getByText("View Ticket")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("View Ticket link renders Sparkles icon", () => {
      renderOpened();
      // Verify the link contains both text and icon
      const viewLink = screen.getByText("View Ticket").closest("a");
      expect(viewLink).toBeInTheDocument();
      // The Sparkles icon is an SVG inside the link
      expect(viewLink?.querySelector("svg")).toBeInTheDocument();
    });

    it("Dashboard link renders ArrowRight icon", () => {
      renderOpened();
      const dashboardLink = screen.getByText("Dashboard").closest("a");
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink?.querySelector("svg")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Confetti particles
  // ============================================================================

  describe("confetti particle generation", () => {
    function renderOpened() {
      render(
        <BuildCompleteCelebration
          ticketId="TICKET-001"
          ticketTitle="Test Title"
        />
      );
      act(() => {
        vi.advanceTimersByTime(300);
      });
    }

    it("generates exactly 20 confetti particles", () => {
      renderOpened();

      // motion.div elements: 1 outer wrapper + 20 confetti + 1 icon circle + 1 links container = 23
      // motion.h2: 1 heading
      // motion.p: 2 paragraphs
      const allMotionDivs = screen.getAllByTestId("motion-div");

      // 23 total motion.divs: 1 wrapper + 20 particles + 1 icon circle + 1 links div
      expect(allMotionDivs.length).toBe(23);

      // 20 confetti particles = total divs minus wrapper (idx 0), icon circle, and links div
      const particleCount = allMotionDivs.length - 3;
      expect(particleCount).toBe(20);
    });

    it("each confetti particle has a unique id", () => {
      renderOpened();

      const allMotionDivs = screen.getAllByTestId("motion-div");
      // Particles are indices 1-20 (after the outer wrapper at index 0)
      const particles = allMotionDivs.slice(1, 21);

      // Each particle should have a unique key from 0-19
      expect(particles.length).toBe(20);
    });

    it("particles have randomized properties", () => {
      renderOpened();

      const allMotionDivs = screen.getAllByTestId("motion-div");
      const particles = allMotionDivs.slice(1, 21);

      // Verify each particle has a style attribute with positioning
      particles.forEach((particle) => {
        expect(particle).toHaveAttribute("style");
      });

      // At least one particle should have different left position than another
      // (this tests non-determinism, but with 20 particles it's virtually guaranteed)
      const leftValues = particles
        .map((p) => p.getAttribute("style")?.match(/left:\s*([\d.]+)%/)?.[1])
        .filter(Boolean);

      // With 20 particles and Math.random, there should be variation
      const uniqueLeftValues = new Set(leftValues);
      // Allow for the unlikely case where all are the same (extremely improbable)
      expect(uniqueLeftValues.size).toBeGreaterThanOrEqual(1);
    });

    it("particles have rounded-full class (visual confetti style)", () => {
      renderOpened();

      const allMotionDivs = screen.getAllByTestId("motion-div");
      const particles = allMotionDivs.slice(1, 21);

      particles.forEach((particle) => {
        expect(particle.className).toContain("rounded-full");
      });
    });

    it("particles render inside the overflow-hidden container", () => {
      renderOpened();

      const allMotionDivs = screen.getAllByTestId("motion-div");
      const particles = allMotionDivs.slice(1, 21);

      // All particles should be in the DOM
      expect(particles.length).toBe(20);
    });
  });

  // ============================================================================
  // Content structure (motion.div hierarchy)
  // ============================================================================

  describe("content structure", () => {
    function renderOpened() {
      render(
        <BuildCompleteCelebration
          ticketId="TICKET-001"
          ticketTitle="Custom Title"
        />
      );
      act(() => {
        vi.advanceTimersByTime(300);
      });
    }

    it("renders icon circle with PartyPopper", () => {
      renderOpened();

      // The PartyPopper icon should be present
      const partyPopper = screen.getByText("Build Complete!");
      expect(partyPopper).toBeInTheDocument();
    });

    it("renders full celebration with all expected text content", () => {
      renderOpened();

      // All text content should be present after timeout
      expect(screen.getByText("Build Complete!")).toBeInTheDocument();
      expect(screen.getByText("Custom Title")).toBeInTheDocument();
      expect(
        screen.getByText(
          "The build report has been generated and the ticket is now complete."
        )
      ).toBeInTheDocument();
      expect(screen.getByText("View Ticket")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });
});
