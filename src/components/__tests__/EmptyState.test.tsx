import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "../EmptyState";
import { FileText, AlertCircle } from "lucide-react";

describe("EmptyState", () => {
  // --- Basic rendering ---

  it("renders title and description", () => {
    render(
      <EmptyState
        icon={FileText}
        title="Nothing here"
        description="No items found."
      />
    );

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("No items found.")).toBeInTheDocument();
  });

  it("renders the icon", () => {
    const { container } = render(
      <EmptyState
        icon={AlertCircle}
        title="Error"
        description="Something went wrong."
      />
    );

    // The icon should be rendered as an SVG
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  // --- Action link ---

  it("renders a CTA link when action is provided", () => {
    render(
      <EmptyState
        icon={FileText}
        title="Empty"
        description="No data."
        action={{ label: "Create Item", href: "/new" }}
      />
    );

    const link = screen.getByRole("link", { name: "Create Item" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/new");
  });

  it("does not render a link when action is not provided", () => {
    render(
      <EmptyState
        icon={FileText}
        title="Empty"
        description="No data."
      />
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // --- Children ---

  it("renders children below the description and action", () => {
    render(
      <EmptyState
        icon={FileText}
        title="Empty"
        description="No data."
        action={{ label: "Go", href: "/go" }}
      >
        <button>Custom Button</button>
      </EmptyState>
    );

    expect(screen.getByText("Custom Button")).toBeInTheDocument();
    // action link should still be present
    expect(screen.getByRole("link", { name: "Go" })).toBeInTheDocument();
  });

  it("renders children without action", () => {
    render(
      <EmptyState
        icon={FileText}
        title="Empty"
        description="No data."
      >
        <span>Extra content</span>
      </EmptyState>
    );

    expect(screen.getByText("Extra content")).toBeInTheDocument();
  });

  // --- ClassName ---

  it("applies custom className", () => {
    const { container } = render(
      <EmptyState
        icon={FileText}
        title="Test"
        description="Desc"
        className="my-custom-class"
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("my-custom-class");
    expect(card.className).toContain("card");
  });

  // --- Accessibility ---

  it("marks icon as aria-hidden", () => {
    const { container } = render(
      <EmptyState
        icon={FileText}
        title="Test"
        description="Desc"
      />
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  // --- btn-primary class on action link ---

  it("renders action link with btn-primary class", () => {
    render(
      <EmptyState
        icon={FileText}
        title="Test"
        description="Desc"
        action={{ label: "Go", href: "/test" }}
      />
    );

    const link = screen.getByRole("link", { name: "Go" });
    expect(link.className).toContain("btn-primary");
  });

  // --- custom iconSize ---

  it("applies custom iconSize", () => {
    const customSize = 64;
    const { container } = render(
      <EmptyState
        icon={FileText}
        title="Test"
        description="Desc"
        iconSize={customSize}
      />
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", String(customSize));
    expect(svg).toHaveAttribute("height", String(customSize));
  });

  // --- action.onClick renders as button ---

  it("renders button when action has onClick without href", () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        icon={FileText}
        title="Click Test"
        description="Testing onClick"
        action={{ label: "Click Me", href: "", onClick: handleClick }}
      />
    );

    const button = screen.getByRole("button", { name: "Click Me" });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("btn-primary");

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // --- EmptyState with empty description strings ---

  it("renders with empty description string", () => {
    render(
      <EmptyState
        icon={FileText}
        title="Only Title"
        description=""
      />
    );

    expect(screen.getByText("Only Title")).toBeInTheDocument();
    // description should still render an empty paragraph without error
    const heading = screen.getByText("Only Title");
    const paragraph = heading.nextElementSibling;
    expect(paragraph).toBeInTheDocument();
  });
});
