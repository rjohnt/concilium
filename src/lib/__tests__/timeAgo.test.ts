import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatRelativeTime, formatAbsoluteDate } from "../timeAgo";

// Helper: create an ISO string offset from "now"
function isoStringOffset(secondsAgo: number): string {
  return new Date(Date.now() - secondsAgo * 1000).toISOString();
}

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Pin "now" to a fixed timestamp so tests are deterministic
    vi.setSystemTime(new Date("2026-05-27T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("just now", () => {
    it("returns 'just now' for less than 60 seconds ago", () => {
      expect(formatRelativeTime(isoStringOffset(0))).toBe("just now");
      expect(formatRelativeTime(isoStringOffset(30))).toBe("just now");
      expect(formatRelativeTime(isoStringOffset(59))).toBe("just now");
    });

    it("returns 'just now' at the 60-second boundary (exclusive)", () => {
      // 60 seconds → 1m ago, not "just now"
      expect(formatRelativeTime(isoStringOffset(60))).toBe("1m ago");
    });
  });

  describe("minutes", () => {
    it("returns 'Xm ago' for 1–59 minutes", () => {
      expect(formatRelativeTime(isoStringOffset(60))).toBe("1m ago");
      expect(formatRelativeTime(isoStringOffset(5 * 60))).toBe("5m ago");
      expect(formatRelativeTime(isoStringOffset(59 * 60))).toBe("59m ago");
    });
  });

  describe("hours", () => {
    it("returns 'Xh ago' for 1–23 hours", () => {
      expect(formatRelativeTime(isoStringOffset(3600))).toBe("1h ago");
      expect(formatRelativeTime(isoStringOffset(6 * 3600))).toBe("6h ago");
      expect(formatRelativeTime(isoStringOffset(23 * 3600))).toBe("23h ago");
    });
  });

  describe("days", () => {
    it("returns 'Xd ago' for 1–6 days", () => {
      expect(formatRelativeTime(isoStringOffset(86400))).toBe("1d ago");
      expect(formatRelativeTime(isoStringOffset(3 * 86400))).toBe("3d ago");
      expect(formatRelativeTime(isoStringOffset(6 * 86400))).toBe("6d ago");
    });
  });

  describe("weeks", () => {
    it("returns 'Xw ago' for 7–29 days", () => {
      expect(formatRelativeTime(isoStringOffset(7 * 86400))).toBe("1w ago");
      expect(formatRelativeTime(isoStringOffset(14 * 86400))).toBe("2w ago");
      expect(formatRelativeTime(isoStringOffset(21 * 86400))).toBe("3w ago");
    });

    it("returns '4w ago' at 28 days (exactly 4 weeks)", () => {
      expect(formatRelativeTime(isoStringOffset(28 * 86400))).toBe("4w ago");
    });

    it("returns '4w ago' at 29 days (boundary before months)", () => {
      expect(formatRelativeTime(isoStringOffset(29 * 86400))).toBe("4w ago");
    });
  });

  describe("months", () => {
    it("returns '1mo ago' at exactly 30 days", () => {
      expect(formatRelativeTime(isoStringOffset(30 * 86400))).toBe("1mo ago");
    });

    it("returns '1mo ago' for 31–59 days", () => {
      expect(formatRelativeTime(isoStringOffset(31 * 86400))).toBe("1mo ago");
      expect(formatRelativeTime(isoStringOffset(45 * 86400))).toBe("1mo ago");
      expect(formatRelativeTime(isoStringOffset(59 * 86400))).toBe("1mo ago");
    });

    it("returns '2mo ago' at 60 days", () => {
      expect(formatRelativeTime(isoStringOffset(60 * 86400))).toBe("2mo ago");
    });
  });

  describe("future dates", () => {
    it("returns 'just now' for dates in the future", () => {
      const futureISO = new Date(Date.now() + 1000 * 3600).toISOString(); // 1 hour in future
      expect(formatRelativeTime(futureISO)).toBe("just now");
    });
  });

  describe("invalid input", () => {
    it("returns 'Unknown' for NaN date input", () => {
      expect(formatRelativeTime("not-a-date")).toBe("Unknown");
      expect(formatRelativeTime("")).toBe("Unknown");
    });

    it("returns 'Unknown' for undefined-like values", () => {
      // @ts-expect-error – testing runtime behavior with bad input
      expect(formatRelativeTime(undefined)).toBe("Unknown");
    });
  });
});

describe("formatAbsoluteDate", () => {
  it("formats a date in the expected 'Mon DD, YYYY, H:MM AM/PM' format", () => {
    const result = formatAbsoluteDate("2026-05-27T15:45:00Z");
    // The exact output depends on the system's en-US locale.
    // We verify it contains the expected parts.
    expect(result).toContain("May");
    expect(result).toContain("27");
    expect(result).toContain("2026");
  });

  it("includes both date and time components", () => {
    const result = formatAbsoluteDate("2026-01-01T08:30:00Z");
    // Should have date + comma + time
    expect(result).toMatch(/.*, .*/);
  });
});
