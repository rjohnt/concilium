/**
 * Acceptance Tests — DEV-93: Consensus Progress Indicator on TicketCard
 *
 * Tests are written from the user's perspective: a Concilium user viewing the
 * dashboard should see consensus dots that show which personas have approved
 * a ticket, without opening the ticket detail view.
 *
 * Rule: NEVER modify backend or frontend code. If a test fails, report it.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketCard } from "@/components/TicketCard";
import type { Ticket } from "@/lib/types";

// ── Mocks ──────────────────────────────────────────────────────────────

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

vi.mock("@/lib/store", () => ({
  updateTicket: vi.fn(),
  getTickets: vi.fn(() => []),
  seedData: vi.fn(),
}));

// ── Factory ────────────────────────────────────────────────────────────

function createTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "TIX-001",
    title: "Test Ticket Title",
    description: "This is a test ticket description.",
    status: "draft",
    priority: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    tags: [],
    feedback: [],
    approvals: [],
    ...overrides,
  };
}

// All 4 persona IDs (from real getAllPersonas)
const ALL_PERSONAS = ["engineer", "designer", "product-owner", "qa"] as const;

// ── Tests ──────────────────────────────────────────────────────────────

describe("DEV-93: Consensus Progress Indicator on TicketCard (acceptance)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── AC-1: Consensus dots row rendered for in-review tickets ──────────

  it("AC-1: renders consensus dots row for in-review tickets", () => {
    render(
      <TicketCard
        ticket={createTicket({ status: "in-review", approvals: [] })}
      />,
    );
    expect(screen.getByTestId("consensus-dots")).toBeInTheDocument();
  });

  // ── AC-2: Consensus dots row rendered for consensus tickets ──────────

  it("AC-2: renders consensus dots row for consensus tickets", () => {
    render(
      <TicketCard
        ticket={createTicket({ status: "consensus", approvals: [] })}
      />,
    );
    expect(screen.getByTestId("consensus-dots")).toBeInTheDocument();
  });

  // ── AC-3: NOT rendered for draft/building/done ──────────────────────

  it("AC-3: does NOT render consensus dots for draft tickets", () => {
    render(
      <TicketCard
        ticket={createTicket({ status: "draft", approvals: [] })}
      />,
    );
    expect(screen.queryByTestId("consensus-dots")).not.toBeInTheDocument();
  });

  it("AC-3: does NOT render consensus dots for building tickets", () => {
    render(
      <TicketCard
        ticket={createTicket({ status: "building", approvals: [] })}
      />,
    );
    expect(screen.queryByTestId("consensus-dots")).not.toBeInTheDocument();
  });

  it("AC-3: does NOT render consensus dots for done tickets", () => {
    render(
      <TicketCard
        ticket={createTicket({ status: "done", approvals: [] })}
      />,
    );
    expect(screen.queryByTestId("consensus-dots")).not.toBeInTheDocument();
  });

  // ── AC-4: Existing progress bar hidden for in-review/consensus ──────

  it("AC-4: hides progress bar for in-review tickets", () => {
    render(
      <TicketCard
        ticket={createTicket({ status: "in-review", approvals: [] })}
      />,
    );
    // Consensus section shows "X/Y" text in progress bar;
    // absence of that text inside a progress bar confirms it's hidden
    const card = document.querySelector("[data-ticket-card]");
    const progressBars = card?.querySelectorAll(
      "div.bg-gray-800.rounded-full",
    );
    expect(progressBars?.length).toBe(0);
  });

  it("AC-4: hides progress bar for consensus tickets", () => {
    render(
      <TicketCard
        ticket={createTicket({ status: "consensus", approvals: [] })}
      />,
    );
    const card = document.querySelector("[data-ticket-card]");
    const progressBars = card?.querySelectorAll(
      "div.bg-gray-800.rounded-full",
    );
    expect(progressBars?.length).toBe(0);
  });

  // ── AC-5: Existing progress bar visible for draft/building/done ─────

  it("AC-5: shows progress bar for draft tickets", () => {
    render(
      <TicketCard
        ticket={createTicket({ status: "draft", approvals: [] })}
      />,
    );
    const card = document.querySelector("[data-ticket-card]");
    const progressBars = card?.querySelectorAll(
      "div.bg-gray-800.rounded-full",
    );
    expect(progressBars?.length).toBe(1);
  });

  it("AC-5: shows progress bar for building tickets", () => {
    render(
      <TicketCard
        ticket={createTicket({ status: "building", approvals: [] })}
      />,
    );
    const card = document.querySelector("[data-ticket-card]");
    const progressBars = card?.querySelectorAll(
      "div.bg-gray-800.rounded-full",
    );
    expect(progressBars?.length).toBe(1);
  });

  it("AC-5: shows progress bar for done tickets", () => {
    render(
      <TicketCard
        ticket={createTicket({ status: "done", approvals: [] })}
      />,
    );
    const card = document.querySelector("[data-ticket-card]");
    const progressBars = card?.querySelectorAll(
      "div.bg-gray-800.rounded-full",
    );
    expect(progressBars?.length).toBe(1);
  });

  // ── AC-6: Exactly 4 persona dots ────────────────────────────────────

  it("AC-6: renders exactly 4 persona dot icons", () => {
    render(
      <TicketCard
        ticket={createTicket({ status: "in-review", approvals: [] })}
      />,
    );
    const dotsRow = screen.getByTestId("consensus-dots");
    const svgs = dotsRow.querySelectorAll("svg");
    expect(svgs).toHaveLength(4);
  });

  // ── AC-7: Uses existing PersonaIcon component ───────────────────────

  it("AC-7: consensus dots are rendered via PersonaIcon (lucide icons)", () => {
    render(
      <TicketCard
        ticket={createTicket({ status: "in-review", approvals: [] })}
      />,
    );
    const dotsRow = screen.getByTestId("consensus-dots");
    const svgs = dotsRow.querySelectorAll("svg");
    // PersonaIcon renders lucide-react icons: Wrench, Palette, NotebookText, FlaskConical
    // Each should be an SVG element within the dots row
    expect(svgs.length).toBe(4);
    // Verify each has a class attribute (PersonaIcon applies className)
    svgs.forEach((svg) => {
      expect(svg.getAttribute("class")).toBeTruthy();
    });
  });

  // ── AC-8: Dots inline horizontal row ────────────────────────────────

  it("AC-8: dots are laid out in an inline horizontal row", () => {
    render(
      <TicketCard
        ticket={createTicket({ status: "in-review", approvals: [] })}
      />,
    );
    const dotsRow = screen.getByTestId("consensus-dots");
    // The dots row uses flex with items-center and gap
    expect(dotsRow.className).toContain("flex");
    expect(dotsRow.className).toContain("items-center");
  });

  // ── AC-9: ~14px size ────────────────────────────────────────────────

  it("AC-9: persona icons are rendered at approximately 14px size", () => {
    render(
      <TicketCard
        ticket={createTicket({ status: "in-review", approvals: [] })}
      />,
    );
    const dotsRow = screen.getByTestId("consensus-dots");
    const svgs = dotsRow.querySelectorAll("svg");
    // PersonaIcon passes size=14 to lucide icons, which sets width/height
    svgs.forEach((svg) => {
      // lucide-react sets width and height attributes from the size prop
      const width = svg.getAttribute("width");
      const height = svg.getAttribute("height");
      // Either explicit width/height or viewBox-derived; should be ~14
      if (width) expect(Number(width)).toBe(14);
      if (height) expect(Number(height)).toBe(14);
    });
  });

  // ── AC-10: Approved dots use text-olive ─────────────────────────────

  it("AC-10: approved persona dots have text-olive class", () => {
    render(
      <TicketCard
        ticket={createTicket({
          status: "in-review",
          approvals: ["engineer"],
        })}
      />,
    );
    const dotsRow = screen.getByTestId("consensus-dots");
    const svgs = dotsRow.querySelectorAll("svg");
    // First SVG is engineer (approved), should have text-olive
    const firstSvg = svgs[0];
    expect(firstSvg.className.baseVal).toContain("text-olive");
  });

  // ── AC-11: Pending dots use text-ink-muted ──────────────────────────

  it("AC-11: non-approved persona dots have text-ink-muted class", () => {
    render(
      <TicketCard
        ticket={createTicket({
          status: "in-review",
          approvals: ["engineer"],
        })}
      />,
    );
    const dotsRow = screen.getByTestId("consensus-dots");
    const svgs = dotsRow.querySelectorAll("svg");
    // Second SVG is designer (not approved), should have text-ink-muted
    const secondSvg = svgs[1];
    expect(secondSvg.className.baseVal).toContain("text-ink-muted");
  });

  // ── AC-12: 0 approvals = all muted ──────────────────────────────────

  it("AC-12: when 0 personas have approved, all dots are muted", () => {
    render(
      <TicketCard
        ticket={createTicket({ status: "in-review", approvals: [] })}
      />,
    );
    const dotsRow = screen.getByTestId("consensus-dots");
    const svgs = dotsRow.querySelectorAll("svg");
    svgs.forEach((svg) => {
      expect(svg.className.baseVal).toContain("text-ink-muted");
      expect(svg.className.baseVal).not.toContain("text-olive");
    });
  });

  // ── AC-13: 4 approvals = all olive ──────────────────────────────────

  it("AC-13: when all 4 personas have approved, all dots are olive", () => {
    render(
      <TicketCard
        ticket={createTicket({
          status: "in-review",
          approvals: [...ALL_PERSONAS],
        })}
      />,
    );
    const dotsRow = screen.getByTestId("consensus-dots");
    const svgs = dotsRow.querySelectorAll("svg");
    svgs.forEach((svg) => {
      expect(svg.className.baseVal).toContain("text-olive");
      expect(svg.className.baseVal).not.toContain("text-ink-muted");
    });
  });

  // ── AC-14: Partial approvals = correct mix ─────────────────────────

  it("AC-14: partial approvals show a correct mix of olive and muted dots", () => {
    render(
      <TicketCard
        ticket={createTicket({
          status: "in-review",
          approvals: ["engineer", "designer"],
        })}
      />,
    );
    const dotsRow = screen.getByTestId("consensus-dots");
    const svgs = dotsRow.querySelectorAll("svg");
    const oliveCount = Array.from(svgs).filter((svg) =>
      svg.className.baseVal.includes("text-olive"),
    ).length;
    const mutedCount = Array.from(svgs).filter((svg) =>
      svg.className.baseVal.includes("text-ink-muted"),
    ).length;
    expect(oliveCount).toBe(2);
    expect(mutedCount).toBe(2);
  });

  // ── AC-15: title="X of 4 approved" ──────────────────────────────────

  it('AC-15: dots row has title="X of 4 approved" tooltip', () => {
    render(
      <TicketCard
        ticket={createTicket({
          status: "in-review",
          approvals: ["engineer", "designer"],
        })}
      />,
    );
    expect(screen.getByTestId("consensus-dots")).toHaveAttribute(
      "title",
      "2 of 4 approved",
    );
  });

  // ── AC-16: Tooltip updates with count ───────────────────────────────

  it("AC-16: tooltip title updates to reflect the current approval count", () => {
    // 0 approvals
    const { rerender } = render(
      <TicketCard
        ticket={createTicket({ status: "in-review", approvals: [] })}
      />,
    );
    expect(screen.getByTestId("consensus-dots")).toHaveAttribute(
      "title",
      "0 of 4 approved",
    );

    // Re-render with 3 approvals → tooltip updates
    rerender(
      <TicketCard
        ticket={createTicket({
          status: "in-review",
          approvals: ["engineer", "designer", "product-owner"],
        })}
      />,
    );
    expect(screen.getByTestId("consensus-dots")).toHaveAttribute(
      "title",
      "3 of 4 approved",
    );

    // Re-render with all 4 → tooltip updates
    rerender(
      <TicketCard
        ticket={createTicket({
          status: "in-review",
          approvals: [...ALL_PERSONAS],
        })}
      />,
    );
    expect(screen.getByTestId("consensus-dots")).toHaveAttribute(
      "title",
      "4 of 4 approved",
    );
  });

  // ── AC-17: aria-label="Consensus: X of 4 approved" ─────────────────

  it('AC-17: dots row has aria-label="Consensus: X of 4 approved"', () => {
    render(
      <TicketCard
        ticket={createTicket({
          status: "consensus",
          approvals: ["engineer", "qa"],
        })}
      />,
    );
    expect(screen.getByTestId("consensus-dots")).toHaveAttribute(
      "aria-label",
      "Consensus: 2 of 4 approved",
    );
  });

  // ── AC-18: "Consensus" label before dots ────────────────────────────

  it('AC-18: "Consensus" text label appears before the dot icons', () => {
    render(
      <TicketCard
        ticket={createTicket({ status: "in-review", approvals: [] })}
      />,
    );
    const dotsRow = screen.getByTestId("consensus-dots");
    // The first child text node should be "Consensus"
    expect(dotsRow).toHaveTextContent("Consensus");
    // Verify it's the first text content (label comes before the dot icons)
    const textContent = dotsRow.textContent || "";
    expect(textContent.startsWith("Consensus")).toBe(true);
  });
});
