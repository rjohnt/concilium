import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ConsensusProgress } from "../ConsensusProgress";
import type { PersonaId } from "@/lib/types";

describe("ConsensusProgress", () => {
  const ticketId = "TIX-001";

  // === AC 1: Renders all 4 persona status items ===

  it("renders all 4 persona status items (engineer, designer, product-owner, QA)", () => {
    render(<ConsensusProgress ticketId={ticketId} approvals={[]} />);

    // All four persona labels should appear in the Persona Status grid
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.getByText("Designer")).toBeInTheDocument();
    expect(screen.getByText("Product Owner")).toBeInTheDocument();
    expect(screen.getByText("QA")).toBeInTheDocument();
  });

  // === AC 2: Displays correct approved/total count ===

  it("displays correct approved/total count (e.g. '2/4 approved')", () => {
    const approvals: PersonaId[] = ["engineer", "designer"];
    const { container } = render(
      <ConsensusProgress ticketId={ticketId} approvals={approvals} />
    );

    // Text is split across nested spans — use container textContent with
    // a flexible regex that accepts any whitespace around the slash.
    expect(container.textContent).toMatch(/2\s*\/\s*4\s+approved/);
  });

  it("displays '0/4 approved' with no approvals", () => {
    const { container } = render(
      <ConsensusProgress ticketId={ticketId} approvals={[]} />
    );

    expect(container.textContent).toMatch(/0\s*\/\s*4\s+approved/);
  });

  it("displays '4/4 approved' with all approvals", () => {
    const approvals: PersonaId[] = [
      "engineer",
      "designer",
      "product-owner",
      "qa",
    ];
    const { container } = render(
      <ConsensusProgress ticketId={ticketId} approvals={approvals} />
    );

    expect(container.textContent).toMatch(/4\s*\/\s*4\s+approved/);
  });

  // === AC 3: Consensus Reached celebration overlay ===

  it("shows 'Consensus Reached!' celebration overlay when approvals >= 75% (3 of 4)", () => {
    const approvals: PersonaId[] = ["engineer", "designer", "product-owner"];
    render(<ConsensusProgress ticketId={ticketId} approvals={approvals} />);

    expect(screen.getByText("Consensus Reached!")).toBeInTheDocument();
  });

  it("shows celebration overlay at 100% (all 4 approved)", () => {
    const approvals: PersonaId[] = [
      "engineer",
      "designer",
      "product-owner",
      "qa",
    ];
    render(<ConsensusProgress ticketId={ticketId} approvals={approvals} />);

    expect(screen.getByText("Consensus Reached!")).toBeInTheDocument();
  });

  it("does NOT show celebration overlay when approvals < 75%", () => {
    const approvals: PersonaId[] = ["engineer", "designer"]; // 50%
    render(<ConsensusProgress ticketId={ticketId} approvals={approvals} />);

    expect(screen.queryByText("Consensus Reached!")).not.toBeInTheDocument();
  });

  // === AC 4: 'Waiting for:' callout ===

  it("shows 'Waiting for:' callout with remaining persona names when not all approved", () => {
    const approvals: PersonaId[] = ["engineer", "designer"];
    render(<ConsensusProgress ticketId={ticketId} approvals={approvals} />);

    const waitingText = screen.getByText(/Waiting for:/);
    expect(waitingText).toBeInTheDocument();
    expect(waitingText.textContent).toContain("Product Owner");
    expect(waitingText.textContent).toContain("QA");
  });

  it("does NOT show 'Waiting for:' callout when all personas approved", () => {
    const approvals: PersonaId[] = [
      "engineer",
      "designer",
      "product-owner",
      "qa",
    ];
    render(<ConsensusProgress ticketId={ticketId} approvals={approvals} />);

    expect(screen.queryByText(/Waiting for:/)).not.toBeInTheDocument();
  });

  // === AC 5: Approved personas show CheckCircle, pending show Clock ===

  it("approved personas show CheckCircle icon, pending show Clock icon", () => {
    const approvals: PersonaId[] = ["engineer", "qa"]; // 2 approved, 2 pending
    const { container } = render(
      <ConsensusProgress ticketId={ticketId} approvals={approvals} />
    );

    // Use lucide icon class names for precise matching.
    // CheckCircle renders as lucide-circle-check-big.
    // Clock icons in the persona grid have text-ink-muted (the waiting-for
    // Clock does not, so we combine both selectors for specificity).
    const checkCircles = container.querySelectorAll(
      ".lucide-circle-check-big"
    );
    const clocks = container.querySelectorAll(
      ".lucide-clock.text-ink-muted"
    );

    expect(checkCircles.length).toBe(2); // engineer + qa approved
    expect(clocks.length).toBe(2); // designer + product-owner pending
  });

  it("all personas show CheckCircle when all approved", () => {
    const approvals: PersonaId[] = [
      "engineer",
      "designer",
      "product-owner",
      "qa",
    ];
    const { container } = render(
      <ConsensusProgress ticketId={ticketId} approvals={approvals} />
    );

    // All 4 approved → 4 CheckCircle icons, no pending Clock icons
    const checkCircles = container.querySelectorAll(
      ".lucide-circle-check-big"
    );
    const clocks = container.querySelectorAll(
      ".lucide-clock.text-ink-muted"
    );

    expect(checkCircles.length).toBe(4);
    expect(clocks.length).toBe(0);
  });

  it("all personas show Clock when none approved", () => {
    const { container } = render(
      <ConsensusProgress ticketId={ticketId} approvals={[]} />
    );

    // All 4 pending → 4 Clock icons with text-ink-muted
    const checkCircles = container.querySelectorAll(
      ".lucide-circle-check-big"
    );
    const clocks = container.querySelectorAll(
      ".lucide-clock.text-ink-muted"
    );

    expect(checkCircles.length).toBe(0);
    expect(clocks.length).toBe(4);
  });

  // === AC 6: Progress bar width reflects correct percentage ===

  it("progress bar width reflects correct percentage after animation", async () => {
    const approvals: PersonaId[] = ["engineer", "designer"]; // 50%
    const { container } = render(
      <ConsensusProgress ticketId={ticketId} approvals={approvals} />
    );

    // The animated progress bar has a 200ms delay. Wait for it to settle.
    // The inner progress div is the only element with the ease-out class.
    await waitFor(
      () => {
        const progressBar = container.querySelector(
          ".ease-out"
        ) as HTMLElement;
        expect(progressBar).not.toBeNull();
        expect(progressBar.style.width).toBe("50%");
      },
      { timeout: 1000 }
    );
  });

  it("progress bar shows 0% with no approvals", async () => {
    const { container } = render(
      <ConsensusProgress ticketId={ticketId} approvals={[]} />
    );

    await waitFor(
      () => {
        const progressBar = container.querySelector(
          ".ease-out"
        ) as HTMLElement;
        expect(progressBar).not.toBeNull();
        expect(progressBar.style.width).toBe("0%");
      },
      { timeout: 1000 }
    );
  });

  it("progress bar shows 100% with all approvals", async () => {
    const approvals: PersonaId[] = [
      "engineer",
      "designer",
      "product-owner",
      "qa",
    ];
    const { container } = render(
      <ConsensusProgress ticketId={ticketId} approvals={approvals} />
    );

    await waitFor(
      () => {
        const progressBar = container.querySelector(
          ".ease-out"
        ) as HTMLElement;
        expect(progressBar).not.toBeNull();
        expect(progressBar.style.width).toBe("100%");
      },
      { timeout: 1000 }
    );
  });

  // === AC 7: onConsensusReached callback ===

  it("onConsensusReached callback fires when threshold first reached, not on re-renders", () => {
    const onConsensusReached = vi.fn();
    const approvalsBelow: PersonaId[] = ["engineer", "designer"]; // 50%
    const approvalsAt: PersonaId[] = [
      "engineer",
      "designer",
      "product-owner",
    ]; // 75%

    const { rerender } = render(
      <ConsensusProgress
        ticketId={ticketId}
        approvals={approvalsBelow}
        onConsensusReached={onConsensusReached}
      />
    );

    // Below threshold → callback not called
    expect(onConsensusReached).not.toHaveBeenCalled();

    // Rerender with 3 approvals (threshold reached)
    rerender(
      <ConsensusProgress
        ticketId={ticketId}
        approvals={approvalsAt}
        onConsensusReached={onConsensusReached}
      />
    );

    // Callback should fire exactly once
    expect(onConsensusReached).toHaveBeenCalledTimes(1);

    // Rerender again with the same 3 approvals
    rerender(
      <ConsensusProgress
        ticketId={ticketId}
        approvals={approvalsAt}
        onConsensusReached={onConsensusReached}
      />
    );

    // Callback should still only have been called once
    expect(onConsensusReached).toHaveBeenCalledTimes(1);
  });

  it("onConsensusReached is not called when threshold is never reached", () => {
    const onConsensusReached = vi.fn();
    const approvals: PersonaId[] = ["engineer", "designer"]; // 50%

    render(
      <ConsensusProgress
        ticketId={ticketId}
        approvals={approvals}
        onConsensusReached={onConsensusReached}
      />
    );

    expect(onConsensusReached).not.toHaveBeenCalled();
  });

  it("onConsensusReached not required (optional prop, no crash)", () => {
    const approvals: PersonaId[] = [
      "engineer",
      "designer",
      "product-owner",
    ]; // 75%

    // Should render without error even without onConsensusReached
    expect(() => {
      render(
        <ConsensusProgress ticketId={ticketId} approvals={approvals} />
      );
    }).not.toThrow();
  });

  // === AC 8: Edge case — 0 approvals (all pending) ===

  it("handles edge case: 0 approvals (all pending)", () => {
    const { container } = render(
      <ConsensusProgress ticketId={ticketId} approvals={[]} />
    );

    // Correct count (text split across nested spans — use container textContent)
    expect(container.textContent).toMatch(/0\s*\/\s*4\s+approved/);

    // No celebration
    expect(screen.queryByText("Consensus Reached!")).not.toBeInTheDocument();

    // Waiting for all 4 personas
    const waitingText = screen.getByText(/Waiting for:/);
    expect(waitingText).toBeInTheDocument();
    expect(waitingText.textContent).toContain("Engineer");
    expect(waitingText.textContent).toContain("Designer");
    expect(waitingText.textContent).toContain("Product Owner");
    expect(waitingText.textContent).toContain("QA");

    // All personas rendered
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.getByText("Designer")).toBeInTheDocument();
    expect(screen.getByText("Product Owner")).toBeInTheDocument();
    expect(screen.getByText("QA")).toBeInTheDocument();
  });

  // === AC 9: Edge case — all 4 approved (100%) ===

  it("handles edge case: all 4 approved (100%)", () => {
    const approvals: PersonaId[] = [
      "engineer",
      "designer",
      "product-owner",
      "qa",
    ];
    const { container } = render(
      <ConsensusProgress ticketId={ticketId} approvals={approvals} />
    );

    // Correct count (text split across nested spans — use container textContent)
    expect(container.textContent).toMatch(/4\s*\/\s*4\s+approved/);

    // Celebration shown
    expect(screen.getByText("Consensus Reached!")).toBeInTheDocument();

    // No waiting callout
    expect(screen.queryByText(/Waiting for:/)).not.toBeInTheDocument();

    // All personas rendered
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.getByText("Designer")).toBeInTheDocument();
    expect(screen.getByText("Product Owner")).toBeInTheDocument();
    expect(screen.getByText("QA")).toBeInTheDocument();
  });

  // === Additional: Renders consensus progress section header ===

  it("renders the 'Consensus Progress' section heading", () => {
    render(<ConsensusProgress ticketId={ticketId} approvals={[]} />);

    expect(screen.getByText("Consensus Progress")).toBeInTheDocument();
  });

  // === Additional: Renders percentage badge ===

  it("renders percentage badge with rounded value", () => {
    // 1 of 4 = 25%
    const approvals: PersonaId[] = ["engineer"];
    render(<ConsensusProgress ticketId={ticketId} approvals={approvals} />);

    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("renders percentage badge at 75%", () => {
    const approvals: PersonaId[] = ["engineer", "designer", "product-owner"];
    render(<ConsensusProgress ticketId={ticketId} approvals={approvals} />);

    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  // === Additional: Approved personas appear first in the grid ===

  it("lists approved personas before pending ones in the grid", () => {
    // Only engineer approved; designer, product-owner, qa pending
    const approvals: PersonaId[] = ["engineer"];
    const { container } = render(
      <ConsensusProgress ticketId={ticketId} approvals={approvals} />
    );

    // Get all persona status items (direct children of the grid div)
    const personaStatusHeading = screen.getByText("Persona Status");
    const grid = personaStatusHeading.nextElementSibling!;
    const items = Array.from(grid.children);

    // First item should be the approved one (engineer)
    expect(items[0].textContent).toContain("Engineer");

    // The approved item should have the approved styling
    expect(items[0].className).toContain("bg-elevated/40");

    // Pending items should have different styling
    const pendingItem = items[1]; // First pending
    expect(pendingItem.className).toContain("bg-elevated/20");
    expect(pendingItem.className).toContain("opacity-70");
  });
});
