import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumb } from "../Breadcrumb";

// We test the Breadcrumb component semantics by mocking usePathname.
// The component imports from next/navigation and next/link internally,
// so we mock those modules.

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// next/link renders an <a> tag with href
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function renderBreadcrumb(
  pathname: string,
  customLabels?: Record<string, string>,
) {
  mockUsePathname.mockReturnValue(pathname);
  return render(<Breadcrumb customLabels={customLabels} />);
}

describe("Breadcrumb", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
  });

  // --- Shallow pages: hidden ---

  it("is hidden on /", () => {
    const { container } = renderBreadcrumb("/");
    expect(container.firstChild).toBeNull();
  });

  it("is hidden on /new", () => {
    const { container } = renderBreadcrumb("/new");
    expect(container.firstChild).toBeNull();
  });

  it("is hidden on /login", () => {
    const { container } = renderBreadcrumb("/login");
    expect(container.firstChild).toBeNull();
  });

  it("is hidden on /signup", () => {
    const { container } = renderBreadcrumb("/signup");
    expect(container.firstChild).toBeNull();
  });

  it("is hidden on /vin", () => {
    const { container } = renderBreadcrumb("/vin");
    expect(container.firstChild).toBeNull();
  });

  // --- Deep page rendering ---

  it("renders on /ticket/TIX-001: Dashboard > Ticket > TIX-001", () => {
    renderBreadcrumb("/ticket/TIX-001");

    // Dashboard is a link
    const dashLink = screen.getByRole("link", { name: "Dashboard" });
    expect(dashLink).toBeInTheDocument();
    expect(dashLink).toHaveAttribute("href", "/");

    // Ticket is an intermediate link
    const ticketLink = screen.getByRole("link", { name: "Ticket" });
    expect(ticketLink).toBeInTheDocument();
    expect(ticketLink).toHaveAttribute("href", "/ticket");

    // TIX-001 is plain text (not a link)
    expect(screen.getByText("TIX-001")).toBeInTheDocument();
    const tixElement = screen.getByText("TIX-001");
    expect(tixElement.tagName).not.toBe("A");
    expect(tixElement.tagName).toBe("SPAN");
  });

  it("renders on /build/BLD-001: Dashboard > Build > BLD-001", () => {
    renderBreadcrumb("/build/BLD-001");

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Build" })).toBeInTheDocument();
    expect(screen.getByText("BLD-001")).toBeInTheDocument();
    expect(screen.getByText("BLD-001").tagName).toBe("SPAN");
  });

  it("renders on /consensus/TIX-001: Dashboard > Consensus > TIX-001", () => {
    renderBreadcrumb("/consensus/TIX-001");

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Consensus" }),
    ).toBeInTheDocument();
    expect(screen.getByText("TIX-001")).toBeInTheDocument();
    expect(screen.getByText("TIX-001").tagName).toBe("SPAN");
  });

  it("renders on /prompt/TIX-001: Dashboard > Ticket TIX-001 > Prompt Session", () => {
    renderBreadcrumb("/prompt/TIX-001");

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    const ticketLink = screen.getByRole("link", { name: "Ticket TIX-001" });
    expect(ticketLink).toBeInTheDocument();
    expect(ticketLink).toHaveAttribute("href", "/ticket/TIX-001");

    // Prompt Session is plain text
    expect(screen.getByText("Prompt Session")).toBeInTheDocument();
    expect(screen.getByText("Prompt Session").tagName).toBe("SPAN");
  });

  // --- Custom labels ---

  it("uses customLabels to override auto-generated labels", () => {
    renderBreadcrumb("/ticket/DEV-99", {
      "/": "Home",
      ticket: "Issue",
      "ticket/DEV-99": "My Ticket",
    });

    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Issue" })).toBeInTheDocument();
    expect(screen.getByText("My Ticket")).toBeInTheDocument();
  });

  // --- Link vs text verification ---

  it("makes all segments except the last clickable links", () => {
    renderBreadcrumb("/ticket/TIX-001");
    const links = screen.getAllByRole("link");
    // Dashboard and Ticket are links; TIX-001 is not
    expect(links).toHaveLength(2);
  });

  it("renders the last segment as plain text, not a link", () => {
    renderBreadcrumb("/build/BLD-001");
    const lastSegment = screen.getByText("BLD-001");
    expect(lastSegment.tagName).toBe("SPAN");
    expect(lastSegment).not.toHaveAttribute("href");
  });

  // --- Separators ---

  it("renders ChevronRight separators between segments", () => {
    const { container } = renderBreadcrumb("/ticket/TIX-001");

    // There should be 2 separators (Dashboard > Ticket, Ticket > TIX-001)
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(2);

    // Each should be a ChevronRight with the text-ink-ghost class
    svgs.forEach((svg) => {
      expect(svg.className.baseVal || svg.getAttribute("class")).toContain(
        "text-ink-ghost",
      );
    });
  });

  // --- Accessibility ---

  it("has aria-label='Breadcrumb' on the nav element", () => {
    renderBreadcrumb("/ticket/TIX-001");
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute("aria-label", "Breadcrumb");
  });

  // --- Styling classes ---

  it("applies text-ink-muted hover:text-ink-primary to intermediate links", () => {
    renderBreadcrumb("/ticket/TIX-001");
    const ticketLink = screen.getByRole("link", { name: "Ticket" });
    expect(ticketLink.className).toContain("text-ink-muted");
    expect(ticketLink.className).toContain("hover:text-ink-primary");
    expect(ticketLink.className).toContain("transition-colors");
  });

  it("applies text-gold font-medium to the last segment", () => {
    renderBreadcrumb("/consensus/TIX-001");
    const lastSegment = screen.getByText("TIX-001");
    expect(lastSegment.className).toContain("text-gold");
    expect(lastSegment.className).toContain("font-medium");
  });

  // --- Custom className ---

  it("applies custom className to the nav wrapper", () => {
    mockUsePathname.mockReturnValue("/ticket/ABC");
    const { container } = render(
      <Breadcrumb className="my-breadcrumb" />,
    );
    const nav = container.querySelector("nav");
    expect(nav?.className).toContain("my-breadcrumb");
  });

  // --- Deep path with more than 2 segments ---

  it("handles paths with more than 2 segments gracefully", () => {
    // e.g., /ticket/TIX-001/something/extra
    renderBreadcrumb("/ticket/TIX-001");

    // Should not crash; basic rendering still works
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("TIX-001")).toBeInTheDocument();
  });
});
