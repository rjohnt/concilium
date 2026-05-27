import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  DashboardSkeleton,
  DetailSkeleton,
  PromptSessionSkeleton,
  SkeletonCard,
  SkeletonText,
  SkeletonAvatar,
} from "../Skeleton";

describe("SkeletonText", () => {
  it("renders without crashing", () => {
    const { container } = render(<SkeletonText />);
    expect(container).toBeInTheDocument();
  });

  it("has aria-hidden=\"true\"", () => {
    const { container } = render(<SkeletonText />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("renders the default number of lines (3)", () => {
    const { container } = render(<SkeletonText />);
    const lines = container.querySelectorAll(".animate-pulse");
    expect(lines).toHaveLength(3);
  });

  it("renders custom number of lines", () => {
    const { container } = render(<SkeletonText lines={5} />);
    const lines = container.querySelectorAll(".animate-pulse");
    expect(lines).toHaveLength(5);
  });

  it("accepts custom widths", () => {
    const { container } = render(
      <SkeletonText lines={2} widths={["w-1/2", "w-3/4"]} />
    );
    const lines = container.querySelectorAll(".animate-pulse");
    expect(lines[0]).toHaveClass("w-1/2");
    expect(lines[1]).toHaveClass("w-3/4");
  });
});

describe("SkeletonAvatar", () => {
  it("renders without crashing", () => {
    const { container } = render(<SkeletonAvatar />);
    expect(container).toBeInTheDocument();
  });

  it("has aria-hidden=\"true\"", () => {
    const { container } = render(<SkeletonAvatar />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("applies default medium size class", () => {
    const { container } = render(<SkeletonAvatar />);
    expect(container.firstChild).toHaveClass("w-8", "h-8");
  });

  it("applies small size class", () => {
    const { container } = render(<SkeletonAvatar size="sm" />);
    expect(container.firstChild).toHaveClass("w-6", "h-6");
  });

  it("applies large size class", () => {
    const { container } = render(<SkeletonAvatar size="lg" />);
    expect(container.firstChild).toHaveClass("w-10", "h-10");
  });
});

describe("SkeletonCard", () => {
  it("renders without crashing", () => {
    const { container } = render(<SkeletonCard />);
    expect(container).toBeInTheDocument();
  });

  it("has aria-hidden=\"true\"", () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("renders CopyButton skeleton placeholder at top-right", () => {
    const { container } = render(<SkeletonCard />);
    const copyArea = container.querySelector(".absolute.top-3.right-3");
    expect(copyArea).toBeInTheDocument();
    expect(copyArea).toHaveClass("animate-pulse");
  });
});

describe("DashboardSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container).toBeInTheDocument();
  });

  it("has aria-hidden=\"true\"", () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("renders responsive grid classes for stats row", () => {
    const { container } = render(<DashboardSkeleton />);
    const statsGrid = container.querySelector(".grid.grid-cols-1.sm\\:grid-cols-3");
    expect(statsGrid).toBeInTheDocument();
  });

  it("renders correct number of skeleton cards by default", () => {
    // DashboardSkeleton renders count=4 SkeletonCards by default
    const { container } = render(<DashboardSkeleton />);
    // Each SkeletonCard has the "card" class on its root + 3 stat cards
    const cards = container.querySelectorAll(".card");
    // 3 stat cards + 4 ticket skeleton cards = 7
    expect(cards).toHaveLength(7);
  });
});

describe("DetailSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<DetailSkeleton />);
    expect(container).toBeInTheDocument();
  });

  it("has aria-hidden=\"true\"", () => {
    const { container } = render(<DetailSkeleton />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("PromptSessionSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<PromptSessionSkeleton />);
    expect(container).toBeInTheDocument();
  });

  it("has aria-hidden=\"true\"", () => {
    const { container } = render(<PromptSessionSkeleton />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});
