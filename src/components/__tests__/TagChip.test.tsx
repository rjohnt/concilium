import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TagChip } from "../TagChip";
import type { Tag } from "@/lib/types";

const mockTag: Tag = {
  id: "bug",
  label: "Bug",
  color: "bg-cardinal/20 text-cardinal border-cardinal/40",
};

describe("TagChip", () => {
  // --- display mode ---

  it("renders display-only span with label and color classes", () => {
    render(<TagChip tag={mockTag} mode="display" />);

    const el = screen.getByText("Bug");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("badge", "border");
    // Should include color classes from the tag
    expect(el.className).toContain("bg-cardinal/20");
    expect(el).toHaveAttribute("aria-label", "Bug");
  });

  it("display mode is not interactive (no onClick)", () => {
    render(<TagChip tag={mockTag} mode="display" />);
    const el = screen.getByText("Bug");
    // The span shouldn't have an onClick handler (no role=button)
    expect(el).not.toHaveAttribute("role", "button");
  });

  // --- toggle mode ---

  it("renders toggle button with aria-pressed", () => {
    const onToggle = vi.fn();
    render(
      <TagChip tag={mockTag} mode="toggle" selected={false} onToggle={onToggle} />
    );

    const btn = screen.getByRole("button", { pressed: false });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent("Bug");
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("toggle button shows pressed state when selected", () => {
    const onToggle = vi.fn();
    render(
      <TagChip tag={mockTag} mode="toggle" selected={true} onToggle={onToggle} />
    );

    const btn = screen.getByRole("button", { pressed: true });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    // Should have the tag color classes when selected
    expect(btn.className).toContain("bg-cardinal/20");
  });

  it("toggle button shows muted border classes when not selected", () => {
    const onToggle = vi.fn();
    render(
      <TagChip tag={mockTag} mode="toggle" selected={false} onToggle={onToggle} />
    );

    const btn = screen.getByRole("button", { pressed: false });
    expect(btn.className).toContain("border-border-subtle");
    expect(btn.className).toContain("text-ink-muted");
  });

  it("calls onToggle with tag id when clicked", () => {
    const onToggle = vi.fn();
    render(
      <TagChip tag={mockTag} mode="toggle" selected={false} onToggle={onToggle} />
    );

    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("bug");
  });

  it("toggle button shows tag icon when selected", () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <TagChip tag={mockTag} mode="toggle" selected={false} onToggle={onToggle} />
    );
    // Not selected — no icon
    expect(screen.queryByRole("button")?.querySelector("svg")).toBeNull();

    rerender(
      <TagChip tag={mockTag} mode="toggle" selected={true} onToggle={onToggle} />
    );
    // Selected — should render a small TagIcon (lucide)
    const btn = screen.getByRole("button");
    expect(btn.querySelector("svg")).toBeTruthy();
  });
});
