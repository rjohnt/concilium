import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterBar } from "../FilterBar";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "in-review", label: "In Review" },
  { key: "consensus", label: "Consensus" },
  { key: "building", label: "Building" },
  { key: "done", label: "Done" },
] as const;

describe("FilterBar", () => {
  const defaultCounts: Record<string, number> = {
    draft: 3,
    "in-review": 2,
    consensus: 0,
    building: 1,
    done: 4,
  };

  // --- Renders all tabs ---

  it("renders all 6 tabs", () => {
    render(
      <FilterBar
        activeFilter="all"
        onFilterChange={vi.fn()}
        counts={defaultCounts}
      />
    );

    for (const tab of STATUS_TABS) {
      expect(screen.getByText(tab.label)).toBeInTheDocument();
    }
  });

  it("renders exactly 6 buttons", () => {
    render(
      <FilterBar
        activeFilter="all"
        onFilterChange={vi.fn()}
        counts={defaultCounts}
      />
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(6);
  });

  // --- Highlights active tab ---

  it("highlights active tab with page aria-current", () => {
    render(
      <FilterBar
        activeFilter="draft"
        onFilterChange={vi.fn()}
        counts={defaultCounts}
      />
    );

    const draftButton = screen.getByRole("button", { name: /Draft/ });
    expect(draftButton).toHaveAttribute("aria-current", "page");

    // Other tabs should not have aria-current
    const allButton = screen.getByRole("button", { name: /All/ });
    expect(allButton).not.toHaveAttribute("aria-current");
  });

  // --- Calls onFilterChange on click ---

  it("calls onFilterChange with tab key when clicking a tab", () => {
    const onFilterChange = vi.fn();

    render(
      <FilterBar
        activeFilter="all"
        onFilterChange={onFilterChange}
        counts={defaultCounts}
      />
    );

    fireEvent.click(screen.getByText("Done"));
    expect(onFilterChange).toHaveBeenCalledWith("done");

    fireEvent.click(screen.getByText("Consensus"));
    expect(onFilterChange).toHaveBeenCalledWith("consensus");
  });

  // --- Shows correct counts ---

  it("shows correct count for each tab", () => {
    render(
      <FilterBar
        activeFilter="all"
        onFilterChange={vi.fn()}
        counts={defaultCounts}
      />
    );

    // Check individual counts are displayed
    expect(screen.getByLabelText("Draft (3 tickets)")).toBeInTheDocument();
    expect(screen.getByLabelText("In Review (2 tickets)")).toBeInTheDocument();
    expect(screen.getByLabelText("Consensus (0 tickets)")).toBeInTheDocument();
    expect(screen.getByLabelText("Building (1 tickets)")).toBeInTheDocument();
    expect(screen.getByLabelText("Done (4 tickets)")).toBeInTheDocument();
  });

  it("shows zero count for tabs with no tickets", () => {
    render(
      <FilterBar
        activeFilter="all"
        onFilterChange={vi.fn()}
        counts={defaultCounts}
      />
    );

    // Consensus has 0 tickets
    const consensusLabel = screen.getByLabelText("Consensus (0 tickets)");
    expect(consensusLabel).toBeInTheDocument();
    // The count badge should show "0"
    expect(consensusLabel.textContent).toContain("0");
  });

  it('"All" tab shows sum of all counts', () => {
    render(
      <FilterBar
        activeFilter="all"
        onFilterChange={vi.fn()}
        counts={{ draft: 3, "in-review": 2, consensus: 0, building: 1, done: 4 }}
      />
    );

    // Sum = 3 + 2 + 0 + 1 + 4 = 10
    const allLabel = screen.getByLabelText("All (10 tickets)");
    expect(allLabel).toBeInTheDocument();
  });

  it("uses aria-labels with count and tickets text", () => {
    render(
      <FilterBar
        activeFilter="all"
        onFilterChange={vi.fn()}
        counts={{ done: 5 }}
      />
    );

    // Every button should have an aria-label ending with "tickets)"
    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      expect(button).toHaveAttribute("aria-label");
      expect(button.getAttribute("aria-label")).toMatch(/\(\d+ tickets\)$/);
    }
  });
});
