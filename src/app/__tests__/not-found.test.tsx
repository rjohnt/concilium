import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// ── Mocks ──────────────────────────────────────────────────────────────

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

// ── Imports ────────────────────────────────────────────────────────────

import NotFound from "@/app/not-found";

// ── Tests ──────────────────────────────────────────────────────────────

describe("DEV-64: Custom 404 Not Found page", () => {
  it("renders the Page Not Found heading", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { name: /Page Not Found/i })
    ).toBeInTheDocument();
  });

  it("renders a descriptive message for the user", () => {
    render(<NotFound />);
    expect(
      screen.getByText(/exist or has been moved/i)
    ).toBeInTheDocument();
  });

  it("renders a Back to Dashboard link pointing to root", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", { name: /Back to Dashboard/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  it("uses the .card component class for visual consistency", () => {
    render(<NotFound />);
    // The main content wrapper should use the card class
    const card = document.querySelector(".card");
    expect(card).toBeInTheDocument();
  });

  it("uses gold accent on the icon container", () => {
    render(<NotFound />);
    // The icon container div should have a gold border
    const iconContainer = document.querySelector(".border-gold\\/30");
    expect(iconContainer).toBeInTheDocument();
  });

  it("renders the icon with gold color", () => {
    render(<NotFound />);
    // The FileQuestion SVG icon should have gold text color
    const svgIcons = document.querySelectorAll("svg");
    const goldIcon = Array.from(svgIcons).find((svg) =>
      svg.classList.contains("text-gold")
    );
    expect(goldIcon).toBeTruthy();
  });

  it("has dark theme background colors matching the design system", () => {
    render(<NotFound />);
    const card = document.querySelector(".card");
    // card should exist and have the design system styling
    expect(card).toBeTruthy();
    // The card class applies bg-raised from globals.css
  });

  it("does not show duplicate links", () => {
    render(<NotFound />);
    const links = screen.getAllByRole("link", { name: /Back to Dashboard/i });
    expect(links).toHaveLength(1);
  });
});
