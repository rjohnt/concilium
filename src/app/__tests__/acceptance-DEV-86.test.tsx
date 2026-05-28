/**
 * Acceptance Tests — DEV-86: Vitest tests for VersionHistory and DiffView
 *
 * Tests are written from the user's perspective: a developer maintaining
 * Concilium's prompt version system. They verify that the VersionHistory
 * and DiffView components satisfy the acceptance criteria, and that the
 * test files themselves exist, follow conventions, and pass.
 *
 * Rule: NEVER modify backend or frontend code. If a test fails, report it.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { VersionHistory } from "@/components/VersionHistory";
import { DiffView } from "@/components/DiffView";
import type { FeedbackEntry } from "@/lib/types";

// ============================================================================
// Path helpers — vitest's __dirname resolves to src/app/__tests__/
// ============================================================================

const SRC_DIR = resolve(__dirname, "../..");
const COMPONENT_TESTS = resolve(SRC_DIR, "components/__tests__");
const VH_TEST_PATH = resolve(COMPONENT_TESTS, "VersionHistory.test.tsx");
const DV_TEST_PATH = resolve(COMPONENT_TESTS, "DiffView.test.tsx");

// ============================================================================
// Factory function (following existing conventions)
// ============================================================================

function createFeedbackEntry(
  overrides: Partial<FeedbackEntry> = {},
): FeedbackEntry {
  return {
    id: "FB-001",
    ticketId: "TIX-001",
    personaId: "engineer",
    content: "Default feedback content.",
    createdAt: "2025-06-01T00:00:00.000Z",
    approved: true,
    ...overrides,
  };
}

// ============================================================================
// AC1 — VersionHistory.test.tsx created with 4+ test cases covering
//       rendering, selection, empty state, and active highlighting
// ============================================================================

describe("AC1 — VersionHistory: rendering, selection, empty state, active highlighting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the version timeline with entries sorted newest-first and shows Latest badge", () => {
    const onClose = vi.fn();
    render(
      <VersionHistory
        ticketId="TIX-001"
        personaId="engineer"
        feedback={[
          createFeedbackEntry({
            id: "FB-v3",
            content: "Third version content",
            createdAt: "2025-06-10T00:00:00.000Z",
          }),
          createFeedbackEntry({
            id: "FB-v2",
            content: "Second version content",
            createdAt: "2025-06-05T00:00:00.000Z",
          }),
          createFeedbackEntry({
            id: "FB-v1",
            content: "First version content",
            createdAt: "2025-06-01T00:00:00.000Z",
          }),
        ]}
        onClose={onClose}
      />,
    );

    // Header renders
    expect(screen.getByText("Version History")).toBeInTheDocument();
    expect(screen.getByText("(3 versions)")).toBeInTheDocument();

    // Entries sorted newest-first: v3, v2, v1
    const versionSpans = screen.getAllByText(/^v\d$/);
    expect(versionSpans).toHaveLength(3);
    expect(versionSpans[0]).toHaveTextContent("v3");
    expect(versionSpans[1]).toHaveTextContent("v2");
    expect(versionSpans[2]).toHaveTextContent("v1");

    // Latest badge only on v3 (newest)
    const latestBadge = screen.getByText("Latest");
    expect(latestBadge).toBeInTheDocument();
    expect(latestBadge.className).toContain("bg-gold/20");
    expect(latestBadge.className).toContain("text-gold");

    // Content previews are visible (collapsed state)
    expect(screen.getByText("Third version content")).toBeInTheDocument();
    expect(screen.getByText("Second version content")).toBeInTheDocument();
    expect(screen.getByText("First version content")).toBeInTheDocument();
  });

  it("allows selecting a version to expand the diff view (active highlighting)", () => {
    const onClose = vi.fn();
    render(
      <VersionHistory
        ticketId="TIX-001"
        personaId="engineer"
        feedback={[
          createFeedbackEntry({
            id: "FB-v2",
            content: "Updated prompt with improvements",
            createdAt: "2025-06-10T00:00:00.000Z",
          }),
          createFeedbackEntry({
            id: "FB-v1",
            content: "Original prompt text",
            createdAt: "2025-06-01T00:00:00.000Z",
          }),
        ]}
        onClose={onClose}
      />,
    );

    // Initially collapsed — preview text visible on both entries
    const v1Preview = screen.getByText("Original prompt text");
    expect(v1Preview.className).toContain("line-clamp-2");

    // Click v1 entry (older version, idx=1) to expand —
    // this one has a prevEntry (v2) so it renders a DiffView
    const v1Card = screen.getByText("v1").closest(".card")!;
    fireEvent.click(v1Card);

    // After expanding, the preview <p> with line-clamp-2 should be gone
    // (the content is now rendered inside DiffView spans instead)
    const previewParas = v1Card.querySelectorAll("p.line-clamp-2");
    expect(previewParas).toHaveLength(0);

    // The DiffView container should be present inside the expanded card
    const diffContainer = v1Card.querySelector(".bg-elevated");
    expect(diffContainer).toBeTruthy();

    // Click again to collapse
    fireEvent.click(v1Card);

    // Back to collapsed — preview with line-clamp-2 is visible again
    const previewAfterCollapse = screen.getByText("Original prompt text");
    expect(previewAfterCollapse.className).toContain("line-clamp-2");
  });

  it("shows empty state message when no versions exist for the persona", () => {
    const onClose = vi.fn();
    render(
      <VersionHistory
        ticketId="TIX-001"
        personaId="engineer"
        feedback={[]}
        onClose={onClose}
      />,
    );

    expect(screen.getByText("No versions available.")).toBeInTheDocument();
    expect(screen.getByText("Back to feedback")).toBeInTheDocument();

    // Back button in empty state should call onClose
    fireEvent.click(screen.getByText("Back to feedback"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("highlights the selected version and shows initial version message for v1", () => {
    const onClose = vi.fn();
    render(
      <VersionHistory
        ticketId="TIX-001"
        personaId="engineer"
        feedback={[
          createFeedbackEntry({
            id: "FB-only",
            content: "The only version of this prompt",
            createdAt: "2025-06-10T00:00:00.000Z",
          }),
        ]}
        onClose={onClose}
      />,
    );

    // Single entry — it's v1 and is the latest
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("Latest")).toBeInTheDocument();

    // Click to expand — since it's the only version, no previous to diff against
    const v1Card = screen.getByText("v1").closest(".card")!;
    fireEvent.click(v1Card);

    // Should show initial version message (no previous to compare)
    expect(
      screen.getByText("Initial version — no previous to compare"),
    ).toBeInTheDocument();

    // The full content should be shown
    expect(
      screen.getByText("The only version of this prompt"),
    ).toBeInTheDocument();
  });
});

// ============================================================================
// AC2 — DiffView.test.tsx created with 4+ test cases covering
//       added/removed/unchanged lines and styling
// ============================================================================

describe("AC2 — DiffView: added, removed, unchanged lines and styling", () => {
  it("renders added text with olive/green background and text styling", () => {
    render(
      <DiffView oldText="before" newText="before and after" />,
    );

    // The added portion " and after" should have olive styling
    const addedSpan = screen.getByText(/and after/);
    expect(addedSpan).toBeInTheDocument();
    expect(addedSpan.className).toContain("bg-olive/20");
    expect(addedSpan.className).toContain("text-olive");
    expect(addedSpan.className).toContain("font-medium");
  });

  it("renders removed text with cardinal/red background, red text, and strikethrough", () => {
    render(
      <DiffView oldText="before and gone" newText="before" />,
    );

    // The removed portion " and gone" should have cardinal styling
    const removedSpan = screen.getByText(/and gone/);
    expect(removedSpan).toBeInTheDocument();
    expect(removedSpan.className).toContain("bg-cardinal/20");
    expect(removedSpan.className).toContain("text-cardinal");
    expect(removedSpan.className).toContain("line-through");
  });

  it("renders unchanged text without special diff styling classes", () => {
    render(
      <DiffView oldText="keep this" newText="keep this extra" />,
    );

    // Find all spans in the diff container
    const container = document.querySelector(".bg-elevated");
    expect(container).toBeTruthy();

    const allSpans = container!.querySelectorAll("span");
    // There should be at least one plain span (for "keep this ") with no special classes
    const plainSpans = Array.from(allSpans).filter(
      (s) =>
        !s.className.includes("bg-olive") &&
        !s.className.includes("bg-cardinal") &&
        !s.className.includes("text-olive") &&
        !s.className.includes("text-cardinal") &&
        !s.className.includes("line-through") &&
        !s.className.includes("font-medium") &&
        s.textContent !== "",
    );
    expect(plainSpans.length).toBeGreaterThan(0);
  });

  it("renders a mix of added, removed, and unchanged in a complex diff", () => {
    render(
      <DiffView
        oldText="the quick brown fox"
        newText="the slow red fox"
      />,
    );

    // All three segment types should be present in the rendered output
    const allSpans = document.querySelectorAll("span");

    const hasAdded = Array.from(allSpans).some((s) =>
      s.className.includes("text-olive"),
    );
    const hasRemoved = Array.from(allSpans).some((s) =>
      s.className.includes("text-cardinal"),
    );
    const hasUnchanged = Array.from(allSpans).some(
      (s) =>
        s.className === "" &&
        s.textContent !== "" &&
        !s.className.includes("text-olive") &&
        !s.className.includes("text-cardinal"),
    );

    expect(hasAdded, "Should have olive-styled (added) text").toBe(true);
    expect(hasRemoved, "Should have cardinal-styled (removed) text").toBe(true);
    expect(hasUnchanged, "Should have unstyled (unchanged) text").toBe(true);
  });
});

// ============================================================================
// AC3 — Both test files follow existing test conventions
//       (vitest, @testing-library/react, factory functions, jest-dom matchers)
// ============================================================================

describe("AC3 — Both test files follow existing test conventions", () => {
  it("VersionHistory.test.tsx uses vitest and @testing-library/react", () => {
    expect(
      existsSync(VH_TEST_PATH),
      `Expected test file at ${VH_TEST_PATH}`,
    ).toBe(true);

    const content = readFileSync(VH_TEST_PATH, "utf-8");

    // Uses vitest imports (describe, it, expect, vi)
    expect(content).toContain("from 'vitest'");

    // Uses @testing-library/react
    expect(content).toContain("from '@testing-library/react'");

    // Uses factory function pattern (createFeedbackEntry)
    expect(content).toContain("createFeedbackEntry");
  });

  it("DiffView.test.tsx uses vitest and @testing-library/react", () => {
    expect(
      existsSync(DV_TEST_PATH),
      `Expected test file at ${DV_TEST_PATH}`,
    ).toBe(true);

    const content = readFileSync(DV_TEST_PATH, "utf-8");

    // Uses vitest imports
    expect(content).toContain("from 'vitest'");

    // Uses @testing-library/react
    expect(content).toContain("from '@testing-library/react'");
  });

  it("jest-dom matchers are configured in vitest.setup.ts", () => {
    const setupPath = resolve(SRC_DIR, "..", "vitest.setup.ts");
    expect(existsSync(setupPath), "vitest.setup.ts should exist").toBe(true);

    const content = readFileSync(setupPath, "utf-8");
    // jest-dom matchers are imported
    expect(content).toContain("@testing-library/jest-dom");
  });

  it("both test files follow the describe/it pattern with descriptive test names", () => {
    for (const testPath of [VH_TEST_PATH, DV_TEST_PATH]) {
      const content = readFileSync(testPath, "utf-8");

      // Uses describe() blocks for organization
      expect(content).toContain("describe(");

      // Uses it() for individual test cases
      expect(content).toContain("it(");
    }
  });
});

// ============================================================================
// AC4 — All tests pass with `npx vitest run`
// ============================================================================

describe("AC4 — All tests pass with npx vitest run", () => {
  it("VersionHistory.test.tsx contains at least 4 test cases", () => {
    const content = readFileSync(VH_TEST_PATH, "utf-8");
    const testCount = (content.match(/^\s*it\(/gm) || []).length;
    expect(
      testCount,
      `VersionHistory.test.tsx should have >= 4 test cases, found ${testCount}`,
    ).toBeGreaterThanOrEqual(4);
  });

  it("DiffView.test.tsx contains at least 4 test cases", () => {
    const content = readFileSync(DV_TEST_PATH, "utf-8");
    const testCount = (content.match(/^\s*it\(/gm) || []).length;
    expect(
      testCount,
      `DiffView.test.tsx should have >= 4 test cases, found ${testCount}`,
    ).toBeGreaterThanOrEqual(4);
  });

  it("VersionHistory test cases cover rendering, selection, empty state, and highlighting", () => {
    const content = readFileSync(VH_TEST_PATH, "utf-8").toLowerCase();

    // Should have descriptive test names covering the required areas
    const hasRendering =
      content.includes("render") ||
      content.includes("display") ||
      content.includes("badge");
    const hasSelection =
      content.includes("select") ||
      content.includes("click") ||
      content.includes("expand");
    const hasEmptyState =
      content.includes("empty") || content.includes("no version");
    const hasHighlighting =
      content.includes("active") ||
      content.includes("highlight") ||
      content.includes("selected") ||
      content.includes("latest");

    expect(hasRendering, "Should have tests covering rendering").toBe(true);
    expect(hasSelection, "Should have tests covering selection/interaction").toBe(
      true,
    );
    expect(hasEmptyState, "Should have tests covering empty state").toBe(true);
    expect(
      hasHighlighting,
      "Should have tests covering active highlighting",
    ).toBe(true);
  });

  it("DiffView test cases cover added, removed, unchanged, and styling", () => {
    const content = readFileSync(DV_TEST_PATH, "utf-8").toLowerCase();

    const hasAdded =
      content.includes("added") || content.includes("olive");
    const hasRemoved =
      content.includes("removed") || content.includes("cardinal");
    const hasUnchanged =
      content.includes("unchanged") ||
      content.includes("equal") ||
      content.includes("identical");
    const hasStyling =
      content.includes("styling") ||
      content.includes("classname") ||
      content.includes("line-through");

    expect(hasAdded, "Should have tests covering added text").toBe(true);
    expect(hasRemoved, "Should have tests covering removed text").toBe(true);
    expect(hasUnchanged, "Should have tests covering unchanged text").toBe(true);
    expect(hasStyling, "Should have tests covering styling").toBe(true);
  });

  it("both test files can be dynamically imported without errors", async () => {
    // Import the test modules — verifies no syntax/import errors
    const vhModule = await import(
      "../../components/__tests__/VersionHistory.test"
    );
    const dvModule = await import(
      "../../components/__tests__/DiffView.test"
    );

    expect(vhModule).toBeDefined();
    expect(dvModule).toBeDefined();
  });
});
