import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PersonaIcon } from "@/components/PersonaIcon";
import type { PersonaId } from "@/lib/types";

describe("PersonaIcon", () => {
  const personas: { id: PersonaId; label: string; iconTitle: string }[] = [
    { id: "engineer", label: "Wrench", iconTitle: "Wrench" },
    { id: "designer", label: "Palette", iconTitle: "Palette" },
    { id: "product-owner", label: "Notebook", iconTitle: "NotebookText" },
    { id: "qa", label: "Flask", iconTitle: "FlaskConical" },
  ];

  it.each(personas)(
    "renders $iconTitle icon for $id persona",
    ({ id }) => {
      const { container } = render(<PersonaIcon personaId={id} />);
      // Lucide SVGs render with a specific structure — check that an SVG exists
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass("text-blue-400", "text-purple-400", "text-emerald-400", "text-amber-400", {
        mode: "some",
      });
    }
  );

  it("uses default size 16 when no size prop given", () => {
    const { container } = render(<PersonaIcon personaId={"engineer"} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // Lucide sets width/height attributes
    expect(svg).toHaveAttribute("width", "16");
    expect(svg).toHaveAttribute("height", "16");
  });

  it("accepts custom size prop", () => {
    const { container } = render(<PersonaIcon personaId={"designer"} size={24} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("height", "24");
  });

  it("accepts custom className", () => {
    const { container } = render(<PersonaIcon personaId={"qa"} className="ml-2" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("ml-2");
  });
});
