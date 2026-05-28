import { describe, it, expect } from "vitest";
import {
  PRIORITY_COLORS,
  PREDEFINED_TAGS,
  TAG_COLORS,
  PRIORITY_LABELS,
  type PriorityLevel,
} from "../types";

describe("PRIORITY_COLORS", () => {
  it("covers all 5 priority levels (0-4)", () => {
    for (let i = 0; i <= 4; i++) {
      expect(PRIORITY_COLORS[i as PriorityLevel]).toBeDefined();
    }
  });

  it("uses light-themed background/text/border classes", () => {
    // Urgent (0): red
    expect(PRIORITY_COLORS[0]).toContain("bg-red-100");
    expect(PRIORITY_COLORS[0]).toContain("text-red-700");
    expect(PRIORITY_COLORS[0]).toContain("border-red-200");

    // High (1): orange
    expect(PRIORITY_COLORS[1]).toContain("bg-orange-100");
    expect(PRIORITY_COLORS[1]).toContain("text-orange-700");
    expect(PRIORITY_COLORS[1]).toContain("border-orange-200");

    // Medium (2): yellow
    expect(PRIORITY_COLORS[2]).toContain("bg-yellow-100");
    expect(PRIORITY_COLORS[2]).toContain("text-yellow-700");
    expect(PRIORITY_COLORS[2]).toContain("border-yellow-200");

    // Low (3): gray
    expect(PRIORITY_COLORS[3]).toContain("bg-gray-100");
    expect(PRIORITY_COLORS[3]).toContain("text-gray-600");
    expect(PRIORITY_COLORS[3]).toContain("border-gray-200");

    // None (4): subtle gray
    expect(PRIORITY_COLORS[4]).toContain("bg-gray-50");
    expect(PRIORITY_COLORS[4]).toContain("text-gray-400");
    expect(PRIORITY_COLORS[4]).toContain("border-gray-100");
  });

  it("no priority color uses dark-themed bg-*-900 or text-*-400 patterns", () => {
    for (let i = 0; i <= 4; i++) {
      const color = PRIORITY_COLORS[i as PriorityLevel];
      // These dark-theme patterns should not appear
      expect(color).not.toMatch(/bg-\w+-9\d\d/);
      // Old dark theme used text-*-400 (e.g. text-red-400, text-orange-400)
      // Light theme 400-level text is only for the subtle None priority (text-gray-400)
      expect(color).not.toMatch(/\btext-(red|orange|yellow|purple|emerald|amber)-400\b/);
    }
  });

  it("PRIORITY_LABELS matches PriorityLevel keys", () => {
    expect(PRIORITY_LABELS[0]).toBe("Urgent");
    expect(PRIORITY_LABELS[1]).toBe("High");
    expect(PRIORITY_LABELS[2]).toBe("Medium");
    expect(PRIORITY_LABELS[3]).toBe("Low");
    expect(PRIORITY_LABELS[4]).toBe("None");
  });
});

describe("PREDEFINED_TAGS", () => {
  it("has all 6 predefined tags", () => {
    const ids = PREDEFINED_TAGS.map((t) => t.id);
    expect(ids).toContain("bug");
    expect(ids).toContain("feature");
    expect(ids).toContain("docs");
    expect(ids).toContain("design");
    expect(ids).toContain("performance");
    expect(ids).toContain("security");
    expect(ids.length).toBe(6);
  });

  it("uses light-themed color classes (no dark variants)", () => {
    for (const tag of PREDEFINED_TAGS) {
      // Should not have dark theme patterns like bg-*-900/50 or text-*-400
      expect(tag.color).not.toMatch(/bg-\w+-900/);
      expect(tag.color).not.toMatch(/bg-\w+-950/);
      expect(tag.color).not.toMatch(/bg-\w+\/20/);
      expect(tag.color).not.toMatch(/text-\w+-400\b/);
      expect(tag.color).not.toMatch(/border-\w+-800/);
      expect(tag.color).not.toMatch(/border-\w+-900/);

      // Should have bg-, text-, border- classes
      expect(tag.color).toMatch(/\bbg-\w+/);
      expect(tag.color).toMatch(/\btext-\w+/);
      expect(tag.color).toMatch(/\bborder-\w+/);
    }
  });

  it("specific tag values match light theme spec", () => {
    const bug = PREDEFINED_TAGS.find((t) => t.id === "bug")!;
    expect(bug.color).toBe("bg-red-100 text-red-700 border-red-200");

    const feature = PREDEFINED_TAGS.find((t) => t.id === "feature")!;
    expect(feature.color).toBe("bg-amber-50 text-amber-700 border-amber-200");

    const docs = PREDEFINED_TAGS.find((t) => t.id === "docs")!;
    expect(docs.color).toBe("bg-blue-50 text-blue-700 border-blue-200");

    const design = PREDEFINED_TAGS.find((t) => t.id === "design")!;
    expect(design.color).toBe("bg-purple-100 text-purple-700 border-purple-200");

    const perf = PREDEFINED_TAGS.find((t) => t.id === "performance")!;
    expect(perf.color).toBe("bg-orange-100 text-orange-700 border-orange-200");

    const sec = PREDEFINED_TAGS.find((t) => t.id === "security")!;
    expect(sec.color).toBe("bg-red-50 text-red-600 border-red-200");
  });

  it("TAG_COLORS maps each tag id to its color string", () => {
    for (const tag of PREDEFINED_TAGS) {
      expect(TAG_COLORS[tag.id]).toBe(tag.color);
    }
  });
});
