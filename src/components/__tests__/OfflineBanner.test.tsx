import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { OfflineBanner } from "../OfflineBanner";

// ── Mock the useOnlineStatus hook ──────────────────────────────────────────

const mockResetWasOffline = vi.fn();

let mockIsOnline = true;
let mockWasOffline = false;

vi.mock("@/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => ({
    isOnline: mockIsOnline,
    wasOffline: mockWasOffline,
    resetWasOffline: mockResetWasOffline,
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function setOnlineState(isOnline: boolean, wasOffline: boolean) {
  mockIsOnline = isOnline;
  mockWasOffline = wasOffline;
}

beforeEach(() => {
  vi.useRealTimers();
  mockIsOnline = true;
  mockWasOffline = false;
  mockResetWasOffline.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("OfflineBanner", () => {
  // ── Hidden state ─────────────────────────────────────────────────────

  it("does not render when online with no wasOffline", () => {
    setOnlineState(true, false);
    render(<OfflineBanner />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  // ── Offline state ────────────────────────────────────────────────────

  it('renders amber "You are offline" banner when isOnline=false', () => {
    setOnlineState(false, false);
    render(<OfflineBanner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("You are offline")).toBeInTheDocument();
  });

  it("offline banner uses gold color classes and WifiOff icon", () => {
    setOnlineState(false, false);
    render(<OfflineBanner />);
    const banner = screen.getByRole("status");
    // Check for gold classes on banner
    expect(banner.className).toContain("bg-gold/10");
    expect(banner.className).toContain("border-gold/40");
    // Text color is on child span, not the outer div
    const textSpan = banner.querySelector("span");
    expect(textSpan?.className).toContain("text-gold");
    // Two svg icons: WifiOff + X dismiss
    const icons = banner.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThanOrEqual(2);
  });

  it("offline banner has bg-base background class", () => {
    setOnlineState(false, false);
    render(<OfflineBanner />);
    const banner = screen.getByRole("status");
    expect(banner.classList.contains("bg-base")).toBe(true);
  });

  // ── Reconnected state ────────────────────────────────────────────────

  it('renders green "Reconnected" banner on reconnect (wasOffline=true)', () => {
    setOnlineState(true, true);
    render(<OfflineBanner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Reconnected")).toBeInTheDocument();
  });

  it("reconnected banner uses olive color classes and CheckCircle2 icon", () => {
    setOnlineState(true, true);
    render(<OfflineBanner />);
    const banner = screen.getByRole("status");
    expect(banner.className).toContain("bg-olive/10");
    expect(banner.className).toContain("border-olive/40");
    // Text color is on child span, not the outer div
    const textSpan = banner.querySelector("span");
    expect(textSpan?.className).toContain("text-olive");
  });

  it("reconnected banner auto-dismisses after 3 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["setTimeout", "clearTimeout"] });
    setOnlineState(true, true);
    render(<OfflineBanner />);

    expect(screen.getByText("Reconnected")).toBeInTheDocument();

    // Advance just under 3s — should still be visible
    act(() => vi.advanceTimersByTime(2999));
    expect(screen.getByText("Reconnected")).toBeInTheDocument();

    // Advance past 3s
    act(() => vi.advanceTimersByTime(1));
    await waitFor(() => {
      expect(mockResetWasOffline).toHaveBeenCalledTimes(1);
    });
    vi.useRealTimers();
  });

  it("cancels auto-dismiss timer on manual dismiss", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["setTimeout", "clearTimeout"] });
    setOnlineState(true, true);
    render(<OfflineBanner />);

    const dismissButton = screen.getByLabelText("Dismiss connectivity notification");
    fireEvent.click(dismissButton);

    expect(mockResetWasOffline).toHaveBeenCalledTimes(1);

    // Advance time — resetWasOffline should NOT be called again from timer
    act(() => vi.advanceTimersByTime(5000));
    expect(mockResetWasOffline).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("cancel auto-dismiss timer on transition back to offline", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["setTimeout", "clearTimeout"] });
    // Start in reconnected state
    setOnlineState(true, true);
    const { rerender } = render(<OfflineBanner />);

    expect(screen.getByText("Reconnected")).toBeInTheDocument();

    // Advance 1s, then go offline
    act(() => vi.advanceTimersByTime(1000));

    // Simulate going offline while banner was showing reconnected
    setOnlineState(false, false);
    rerender(<OfflineBanner />);

    expect(screen.getByText("You are offline")).toBeInTheDocument();

    // Advance past original 3s window
    act(() => vi.advanceTimersByTime(5000));
    // resetWasOffline should NOT have been called by the (now-cancelled) timer
    // It hasn't been called because the timer was cleared when isOnline became false
    expect(mockResetWasOffline).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  // ── Accessibility ─────────────────────────────────────────────────────

  it('has role="status" and aria-live="polite" on the banner', () => {
    setOnlineState(false, false);
    render(<OfflineBanner />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveAttribute("aria-live", "polite");
  });

  it('dismiss button has aria-label "Dismiss connectivity notification"', () => {
    setOnlineState(false, false);
    render(<OfflineBanner />);
    expect(
      screen.getByLabelText("Dismiss connectivity notification")
    ).toBeInTheDocument();
  });
});
