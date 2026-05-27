import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
