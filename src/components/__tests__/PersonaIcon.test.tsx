import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PersonaIcon } from "@/components/PersonaIcon";
import type { PersonaId } from "@/lib/types";

describe("PersonaIcon", () => {
  const personas: { id: PersonaId; label: string; iconTitle: string }[] = [
    { id: "engineer", label: "Code", iconTitle: "Code" },
    { id: "designer", label: "PenTool", iconTitle: "PenTool" },
    { id: "product-owner", label: "Compass", iconTitle: "Compass" },
    { id: "qa", label: "Microscope", iconTitle: "Microscope" },
  ];

  it.each(personas)(
    "renders $iconTitle icon for $id persona",
    ({ id }) => {
      const { container } = render(<PersonaIcon personaId={id} />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      const colorClasses = [
        "text-[var(--persona-eng-500)]",
        "text-[var(--persona-des-500)]",
        "text-[var(--persona-prod-500)]",
        "text-[var(--persona-res-500)]",
      ];
      const hasColorClass = colorClasses.some((cls) => svg!.classList.contains(cls));
      expect(hasColorClass).toBe(true);
    }
  );

  it("uses default size 16 when no size prop given", () => {
    const { container } = render(<PersonaIcon personaId="engineer" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "16");
    expect(svg).toHaveAttribute("height", "16");
  });

  it("accepts custom size prop", () => {
    const { container } = render(<PersonaIcon personaId="designer" size={24} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("height", "24");
  });

  it("accepts custom className", () => {
    const { container } = render(<PersonaIcon personaId="qa" className="ml-2" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("ml-2");
  });
});
