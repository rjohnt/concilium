import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SharePageSkeleton } from "../SharePageSkeleton";

describe("SharePageSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<SharePageSkeleton />);
    expect(container).toBeInTheDocument();
  });

  it("has aria-hidden", () => {
    const { container } = render(<SharePageSkeleton />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("renders animated pulse elements", () => {
    const { container } = render(<SharePageSkeleton />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThan(0);
  });

  it("renders hero skeleton rectangle", () => {
    const { container } = render(<SharePageSkeleton />);
    // Hero area has a bg-[#141210] placeholder div
    const hero = container.querySelector(".bg-\\[\\#141210\\]");
    expect(hero).toBeInTheDocument();
  });

  it("renders category chip skeletons", () => {
    const { container } = render(<SharePageSkeleton />);
    // Skeleton uses rounded-full divs for chips - count those inside the chip row
    const chipSkeletons = container.querySelectorAll(".flex.gap-2.mb-8 .rounded-full");
    expect(chipSkeletons.length).toBe(5);
  });

  it("renders timeline event card skeletons", () => {
    const { container } = render(<SharePageSkeleton />);
    // Each event skeleton has a .card
    const cards = container.querySelectorAll(".card");
    // event cards + share bar skeleton
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });

  it("renders share bar skeleton area", () => {
    const { container } = render(<SharePageSkeleton />);
    // The bottom section has rounded-lg elements
    const rounded = container.querySelectorAll(".rounded-lg");
    expect(rounded.length).toBeGreaterThan(0);
  });
});
