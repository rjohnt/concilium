import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TicketCard } from "../TicketCard";
import type { Ticket } from "@/lib/types";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: React.MouseEventHandler;
    [key: string]: unknown;
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

// Mock updateTicket from store
const mockUpdateTicket = vi.fn();
vi.mock("@/lib/store", () => ({
  updateTicket: (...args: unknown[]) => mockUpdateTicket(...args),
  getTickets: vi.fn(() => []),
  seedData: vi.fn(),
}));

function createTestTicket(overrides: Partial<Ticket> = {}): Ticket {
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

describe("TicketCard", () => {
  beforeEach(() => {
    mockUpdateTicket.mockReset();
  });

  // === Display mode ===

  it("renders ticket title as an h3 in display mode", () => {
    render(<TicketCard ticket={createTestTicket()} />);
    const heading = screen.getByRole("heading", { name: "Test Ticket Title" });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe("H3");
  });

  it("renders h3 with cursor-text class for editing affordance", () => {
    render(<TicketCard ticket={createTestTicket()} />);
    const heading = screen.getByRole("heading", { name: "Test Ticket Title" });
    expect(heading.className).toContain("cursor-text");
  });

  it("renders ticket ID and status badge", () => {
    render(<TicketCard ticket={createTestTicket()} />);
    expect(screen.getByText("TIX-001")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  // === Click to edit ===

  it("clicking the h3 enters edit mode and shows an input", () => {
    render(<TicketCard ticket={createTestTicket()} />);
    const heading = screen.getByRole("heading", { name: "Test Ticket Title" });

    fireEvent.click(heading);

    // h3 should no longer be in the document
    expect(
      screen.queryByRole("heading", { name: "Test Ticket Title" }),
    ).not.toBeInTheDocument();

    // Input should be visible and pre-filled with title
    const input = screen.getByRole("textbox", { name: "Edit ticket title" });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("Test Ticket Title");
  });

  it("clicking h3 does not trigger Link navigation (stopPropagation + preventDefault)", () => {
    // Render with a spy on the Link's click
    const ticket = createTestTicket();
    render(<TicketCard ticket={ticket} />);

    // The outer <a> is the mocked Link — clicking h3 should enter edit mode,
    // not follow the link. We verify by checking edit mode is entered.
    const heading = screen.getByRole("heading", { name: "Test Ticket Title" });
    fireEvent.click(heading);

    // Edit mode should be active (input visible), proving navigation was suppressed
    expect(
      screen.getByRole("textbox", { name: "Edit ticket title" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Test Ticket Title" }),
    ).not.toBeInTheDocument();
  });

  // === Enter save ===

  it("pressing Enter saves the title and exits edit mode", () => {
    render(<TicketCard ticket={createTestTicket()} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole("heading", { name: "Test Ticket Title" }));

    const input = screen.getByRole("textbox", { name: "Edit ticket title" });
    fireEvent.change(input, { target: { value: "New Title" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // Should call updateTicket with the new title
    expect(mockUpdateTicket).toHaveBeenCalledWith("TIX-001", {
      title: "New Title",
    });

    // Should exit edit mode — h3 reappears (with original title from props;
    // the tickets-changed event on the parent page handles re-fetching)
    expect(
      screen.getByRole("heading", { name: "Test Ticket Title" }),
    ).toBeInTheDocument();
  });

  // === Escape cancel ===

  it("pressing Escape reverts to original title without saving", () => {
    render(<TicketCard ticket={createTestTicket()} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole("heading", { name: "Test Ticket Title" }));

    const input = screen.getByRole("textbox", { name: "Edit ticket title" });
    fireEvent.change(input, { target: { value: "Changed Title" } });
    fireEvent.keyDown(input, { key: "Escape" });

    // Should NOT call updateTicket
    expect(mockUpdateTicket).not.toHaveBeenCalled();

    // Should revert to original title
    expect(
      screen.getByRole("heading", { name: "Test Ticket Title" }),
    ).toBeInTheDocument();
  });

  // === Blur save ===

  it("blurring the input saves the title", () => {
    render(<TicketCard ticket={createTestTicket()} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole("heading", { name: "Test Ticket Title" }));

    const input = screen.getByRole("textbox", { name: "Edit ticket title" });
    fireEvent.change(input, { target: { value: "Blur Saved" } });
    fireEvent.blur(input);

    expect(mockUpdateTicket).toHaveBeenCalledWith("TIX-001", {
      title: "Blur Saved",
    });

    // Should exit edit mode
    expect(
      screen.getByRole("heading", { name: "Test Ticket Title" }),
    ).toBeInTheDocument();
  });

  // === Empty rejection ===

  it("rejects empty title and reverts to original", () => {
    render(<TicketCard ticket={createTestTicket()} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole("heading", { name: "Test Ticket Title" }));

    const input = screen.getByRole("textbox", { name: "Edit ticket title" });
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    // Should NOT call updateTicket
    expect(mockUpdateTicket).not.toHaveBeenCalled();

    // Should revert to original title
    expect(
      screen.getByRole("heading", { name: "Test Ticket Title" }),
    ).toBeInTheDocument();
  });

  // === Whitespace-only rejection ===

  it("rejects whitespace-only title and reverts to original", () => {
    render(<TicketCard ticket={createTestTicket()} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole("heading", { name: "Test Ticket Title" }));

    const input = screen.getByRole("textbox", { name: "Edit ticket title" });
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);

    // Should NOT call updateTicket
    expect(mockUpdateTicket).not.toHaveBeenCalled();

    // Should revert to original title
    expect(
      screen.getByRole("heading", { name: "Test Ticket Title" }),
    ).toBeInTheDocument();
  });

  // === Same-value skip ===

  it("skips update when trimmed value equals current title", () => {
    render(<TicketCard ticket={createTestTicket()} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole("heading", { name: "Test Ticket Title" }));

    const input = screen.getByRole("textbox", { name: "Edit ticket title" });
    // Type the same value (with leading/trailing spaces that get trimmed)
    fireEvent.change(input, { target: { value: "  Test Ticket Title  " } });
    fireEvent.blur(input);

    // Should NOT call updateTicket (trimmed value equals original)
    expect(mockUpdateTicket).not.toHaveBeenCalled();
  });

  // === Input styling ===

  it("input has the specified design classes", () => {
    render(<TicketCard ticket={createTestTicket()} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole("heading", { name: "Test Ticket Title" }));

    const input = screen.getByRole("textbox", { name: "Edit ticket title" });
    expect(input.className).toContain("bg-deep");
    expect(input.className).toContain("border-gold/40");
    expect(input.className).toContain("rounded");
    expect(input.className).toContain("text-ink-primary");
    expect(input.className).toContain("focus:border-gold");
  });

  // === CopyButton isolation ===

  it("CopyButton renders outside the Link and is not affected by title editing", () => {
    render(<TicketCard ticket={createTestTicket()} />);
    // Find CopyButton by its aria-label
    const copyButton = screen.getByRole("button", { name: /Copy TIX-001/ });
    expect(copyButton).toBeInTheDocument();

    // Click CopyButton — should not trigger edit mode
    fireEvent.click(copyButton);

    // Title should still be displayed as h3 (not in edit mode)
    expect(
      screen.getByRole("heading", { name: "Test Ticket Title" }),
    ).toBeInTheDocument();
  });

  // === Auto-focus ===

  it("auto-focuses the input when edit mode is entered", () => {
    render(<TicketCard ticket={createTestTicket()} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole("heading", { name: "Test Ticket Title" }));

    const input = screen.getByRole("textbox", { name: "Edit ticket title" });
    expect(input).toHaveFocus();
  });

  // === Long titles ===

  it("handles long titles in display mode with truncation", () => {
    const longTitle =
      "This is an extremely long ticket title that should be truncated when displayed in the card component to prevent layout overflow";
    render(<TicketCard ticket={createTestTicket({ title: longTitle })} />);

    const heading = screen.getByRole("heading", { name: longTitle });
    expect(heading).toBeInTheDocument();
    expect(heading.className).toContain("truncate");
  });

  it("allows editing long titles with full text in input", () => {
    const longTitle =
      "This is an extremely long ticket title that should be fully editable in the input field";
    render(<TicketCard ticket={createTestTicket({ title: longTitle })} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole("heading", { name: longTitle }));

    const input = screen.getByRole("textbox", { name: "Edit ticket title" });
    expect(input).toHaveValue(longTitle);

    // Edit to an even longer title
    const longerTitle = longTitle + " with additional content appended";
    fireEvent.change(input, { target: { value: longerTitle } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockUpdateTicket).toHaveBeenCalledWith("TIX-001", {
      title: longerTitle,
    });
  });

  // === selected prop (DEV-78 keyboard shortcuts) ===

  it("[AC7] adds gold ring styling when selected is true", () => {
    render(<TicketCard ticket={createTestTicket()} selected={true} />);
    // The card Link element should have ring-2 and ring-gold/70 classes
    const link = screen.getByRole("link");
    expect(link.className).toContain("ring-2");
    expect(link.className).toContain("ring-gold/70");
  });

  it("does not have gold ring when selected is false or omitted", () => {
    render(<TicketCard ticket={createTestTicket()} />);
    const link = screen.getByRole("link");
    expect(link.className).not.toContain("ring-gold/70");
  });

  it("wraps persona badges instead of overlapping them", () => {
    render(<TicketCard ticket={createTestTicket()} />);
    const badgesRow = screen.getByTestId("ticket-persona-badges");
    expect(badgesRow.className).toContain("flex-wrap");
    expect(badgesRow.className).not.toContain("-space-x-1");
  });

  // === DEV-93: Consensus dots row ===

  describe("Consensus dots row", () => {
    // ---- Visibility tests ----

    it("shows consensus dots when status is in-review", () => {
      render(
        <TicketCard
          ticket={createTestTicket({ status: "in-review", approvals: [] })}
        />,
      );
      expect(screen.getByTestId("consensus-dots")).toBeInTheDocument();
    });

    it("shows consensus dots when status is consensus", () => {
      render(
        <TicketCard
          ticket={createTestTicket({ status: "consensus", approvals: [] })}
        />,
      );
      expect(screen.getByTestId("consensus-dots")).toBeInTheDocument();
    });

    it("does NOT show consensus dots when status is draft", () => {
      render(
        <TicketCard
          ticket={createTestTicket({ status: "draft", approvals: [] })}
        />,
      );
      expect(
        screen.queryByTestId("consensus-dots"),
      ).not.toBeInTheDocument();
    });

    it("does NOT show consensus dots when status is building", () => {
      render(
        <TicketCard
          ticket={createTestTicket({ status: "building", approvals: [] })}
        />,
      );
      expect(
        screen.queryByTestId("consensus-dots"),
      ).not.toBeInTheDocument();
    });

    it("does NOT show consensus dots when status is done", () => {
      render(
        <TicketCard
          ticket={createTestTicket({ status: "done", approvals: [] })}
        />,
      );
      expect(
        screen.queryByTestId("consensus-dots"),
      ).not.toBeInTheDocument();
    });

    // ---- Progress bar visibility ----

    it("hides the progress bar for in-review status", () => {
      render(
        <TicketCard
          ticket={createTestTicket({ status: "in-review", approvals: [] })}
        />,
      );
      // The progress bar track carries data-testid="consensus-progress".
      const progressBars = screen.queryAllByTestId("consensus-progress");
      expect(progressBars?.length).toBe(0);
    });

    it("shows the progress bar for draft status", () => {
      render(
        <TicketCard
          ticket={createTestTicket({ status: "draft", approvals: [] })}
        />,
      );
      const progressBars = screen.queryAllByTestId("consensus-progress");
      expect(progressBars?.length).toBe(1);
    });

    // ---- Dot count ----

    it("renders exactly 4 PersonaIcon SVGs in the dots row", () => {
      render(
        <TicketCard
          ticket={createTestTicket({ status: "in-review", approvals: [] })}
        />,
      );
      const dotsRow = screen.getByTestId("consensus-dots");
      const svgs = dotsRow.querySelectorAll("svg");
      expect(svgs).toHaveLength(4);
    });

    // ---- Color states ----

    it("all icons are muted when no personas have approved", () => {
      render(
        <TicketCard
          ticket={createTestTicket({ status: "in-review", approvals: [] })}
        />,
      );
      const dotsRow = screen.getByTestId("consensus-dots");
      const svgs = dotsRow.querySelectorAll("svg");
      svgs.forEach((svg) => {
        expect(svg.className.baseVal).toContain("text-ink-muted");
        expect(svg.className.baseVal).not.toContain("text-olive");
      });
    });

    it("all icons are olive when all personas have approved", () => {
      render(
        <TicketCard
          ticket={createTestTicket({
            status: "in-review",
            approvals: ["engineer", "designer", "product-owner", "qa"],
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

    it("shows a mix of olive and muted icons for partial approvals", () => {
      render(
        <TicketCard
          ticket={createTestTicket({
            status: "in-review",
            approvals: ["engineer", "designer"],
          })}
        />,
      );
      const dotsRow = screen.getByTestId("consensus-dots");
      const svgs = dotsRow.querySelectorAll("svg");
      const olive = Array.from(svgs).filter((svg) =>
        svg.className.baseVal.includes("text-olive"),
      );
      const muted = Array.from(svgs).filter((svg) =>
        svg.className.baseVal.includes("text-ink-muted"),
      );
      expect(olive).toHaveLength(2);
      expect(muted).toHaveLength(2);
    });

    // ---- Tooltip (title attribute) ----

    it("has tooltip showing 0 of 4 approved", () => {
      render(
        <TicketCard
          ticket={createTestTicket({ status: "in-review", approvals: [] })}
        />,
      );
      expect(screen.getByTestId("consensus-dots")).toHaveAttribute(
        "title",
        "0 of 4 approved",
      );
    });

    it("has tooltip showing 2 of 4 approved", () => {
      render(
        <TicketCard
          ticket={createTestTicket({
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

    it("has tooltip showing 4 of 4 approved", () => {
      render(
        <TicketCard
          ticket={createTestTicket({
            status: "in-review",
            approvals: ["engineer", "designer", "product-owner", "qa"],
          })}
        />,
      );
      expect(screen.getByTestId("consensus-dots")).toHaveAttribute(
        "title",
        "4 of 4 approved",
      );
    });

    // ---- ARIA label ----

    it("has correct aria-label with approval count", () => {
      render(
        <TicketCard
          ticket={createTestTicket({
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

    // ---- Label text ----

    it('renders the "Consensus" label text', () => {
      render(
        <TicketCard
          ticket={createTestTicket({ status: "in-review", approvals: [] })}
        />,
      );
      const dotsRow = screen.getByTestId("consensus-dots");
      expect(dotsRow).toHaveTextContent("Consensus");
    });

    // ---- Edge case ----

    it("handles empty approvals array with in-review status gracefully", () => {
      render(
        <TicketCard
          ticket={createTestTicket({
            status: "in-review",
            approvals: [],
          })}
        />,
      );
      const dotsRow = screen.getByTestId("consensus-dots");
      expect(dotsRow).toBeInTheDocument();
      // All icons should be muted
      const svgs = dotsRow.querySelectorAll("svg");
      svgs.forEach((svg) => {
        expect(svg.className.baseVal).toContain("text-ink-muted");
      });
      expect(dotsRow).toHaveAttribute("title", "0 of 4 approved");
    });
  });
});
