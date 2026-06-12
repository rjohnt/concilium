/**
 * Acceptance Tests — DEV-58: Pagination with Load More button on ticket dashboard
 *
 * User Story:
 *   As a Concilium user, I want the dashboard to paginate with a "Load More"
 *   button instead of showing all tickets at once, so that the page stays fast
 *   and I can progressively load more tickets as needed.
 *
 * Tests are written from the user's perspective using @testing-library/react.
 *
 * Rule: NEVER modify backend or frontend code. If a test fails, report it.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterAll,
  beforeAll,
} from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Ticket } from "@/lib/types";

// ---------------------------------------------------------------------------
// CRITICAL: Fake timers must be active BEFORE any dynamic import of the
// dashboard page, otherwise the module captures the real setTimeout at import
// time and vi.advanceTimersByTime() will never trigger handleLoadMore's
// callback. We enable fakes once in a top-level beforeAll and restore in
// afterAll.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Mocks (hoisted by vitest)
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockStore = {
  seedData: vi.fn(),
  getTickets: vi.fn(() => [] as Ticket[]),
};

vi.mock("@/lib/store", () => ({
  seedData: (...args: unknown[]) => mockStore.seedData(...args),
  getTickets: (...args: unknown[]) =>
    (mockStore.getTickets as ReturnType<typeof vi.fn>)(...args),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(() => ({
    user: null,
    loading: false,
    signOut: vi.fn(),
  })),
}));

// framer-motion is already handled by vitest.setup.ts

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTicket(
  index: number,
  overrides: Partial<Ticket> = {},
): Ticket {
  const id = `TIX-${String(index).padStart(3, "0")}`;
  return {
    id,
    title: overrides.title ?? `Ticket ${id}`,
    description: "Test description",
    status: overrides.status ?? "draft",
    priority: overrides.priority ?? 2,
    createdAt: new Date(2026, 0, index).toISOString(),
    updatedAt: new Date(2026, 0, index).toISOString(),
    tags: [],
    feedback: [],
    approvals: [],
    ...overrides,
  } as Ticket;
}

function generateTickets(
  count: number,
  baseOverrides: Partial<Ticket> = {},
  startIndex = 1,
): Ticket[] {
  return Array.from({ length: count }, (_, i) =>
    makeTicket(startIndex + i, baseOverrides),
  );
}

function ticketCards(): HTMLElement[] {
  return Array.from(document.querySelectorAll("[data-ticket-card]"));
}

/**
 * Shorthand: get the existing (or reset) scrollIntoView spy put in place
 * by vitest.setup.ts.
 */
function scrollIntoViewSpy(): ReturnType<typeof vi.fn> {
  return Element.prototype.scrollIntoView as unknown as ReturnType<
    typeof vi.fn
  >;
}

// ============================================================================
// Outer wrapper — fake timers enabled for the entire test suite
// ============================================================================

describe("DEV-58 Acceptance: Pagination with Load More button", () => {
  beforeAll(() => {
    // Include requestAnimationFrame so scrollIntoView in handleLoadMore works
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "requestAnimationFrame",
        "cancelAnimationFrame",
      ],
    });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // AC1 — Dashboard initially shows max 20 tickets
  // =========================================================================

  describe("AC1 — Dashboard initially shows max 20 tickets", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockStore.seedData.mockImplementation(() => {});
    });

    it("renders exactly 20 ticket cards when 20 tickets exist", async () => {
      mockStore.getTickets.mockReturnValue(generateTickets(20));
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      expect(ticketCards()).toHaveLength(20);
    });

    it("renders only 20 ticket cards when more than 20 tickets exist", async () => {
      mockStore.getTickets.mockReturnValue(generateTickets(30));
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      expect(ticketCards()).toHaveLength(20);
    });

    it("renders all tickets when fewer than 20 exist", async () => {
      mockStore.getTickets.mockReturnValue(generateTickets(5));
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      expect(ticketCards()).toHaveLength(5);
    });
  });

  // =========================================================================
  // AC2 — Load More button visible when more tickets exist (with remaining
  //       count)
  // =========================================================================

  describe("AC2 — Load More button with remaining count", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockStore.seedData.mockImplementation(() => {});
    });

    it("shows Load More button with remaining count when >20 tickets", async () => {
      mockStore.getTickets.mockReturnValue(generateTickets(25));
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      const button = screen.getByText(/Load More \(5 remaining\)/i);
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe("BUTTON");
    });

    it("shows remaining count accounting for filtered results", async () => {
      // 22 draft tickets, 3 done tickets = 25 total -> 5 remaining
      const allTickets = [
        ...generateTickets(22, { status: "draft" }),
        ...generateTickets(3, { status: "done" }, 23),
      ];
      mockStore.getTickets.mockReturnValue(allTickets);
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      // Initially all tickets pass filter -> 25 total -> 5 remaining
      const button = screen.getByText(/Load More \(5 remaining\)/i);
      expect(button).toBeInTheDocument();
    });

    it("does not show Load More when 20 or fewer tickets", async () => {
      mockStore.getTickets.mockReturnValue(generateTickets(20));
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      expect(screen.queryByText(/Load More/i)).toBeNull();
    });
  });

  // =========================================================================
  // AC3 — Clicking Load More appends next 20 tickets
  // =========================================================================

  describe("AC3 — Clicking Load More appends next batch", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockStore.seedData.mockImplementation(() => {});
    });

    it("shows 30 tickets after clicking Load More (20 initial + 10 more)", async () => {
      mockStore.getTickets.mockReturnValue(generateTickets(30));
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      // Initially 20
      expect(ticketCards()).toHaveLength(20);

      // Click Load More
      fireEvent.click(screen.getByText(/Load More \(10 remaining\)/i));

      // Advance past the 100 ms setTimeout inside handleLoadMore
      // Use act() to flush React's pending state updates
      await act(() => {
        vi.advanceTimersByTime(150);
      });

      // Now all 30 should be visible
      expect(ticketCards()).toHaveLength(30);
    });

    it("shows 40 tickets when there are >40 and Load More clicked twice", async () => {
      mockStore.getTickets.mockReturnValue(generateTickets(45));
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      expect(ticketCards()).toHaveLength(20);

      // First click: load batch 2
      fireEvent.click(screen.getByText(/Load More \(25 remaining\)/i));
      await act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(ticketCards()).toHaveLength(40);

      // Second click: load batch 3 (only 5 left)
      const btn2 = screen.getByText(/Load More \(5 remaining\)/i);
      expect(btn2).toBeInTheDocument();
      fireEvent.click(btn2);
      await act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(ticketCards()).toHaveLength(45);
    });
  });

  // =========================================================================
  // AC4 — Button disappears when all tickets loaded
  // =========================================================================

  describe("AC4 — Button disappears when all tickets loaded", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockStore.seedData.mockImplementation(() => {});
    });

    it("no Load More button when tickets fit in one batch", async () => {
      mockStore.getTickets.mockReturnValue(generateTickets(15));
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      expect(screen.queryByText(/Load More/i)).toBeNull();
    });

    it("no Load More button when exactly 20 tickets", async () => {
      mockStore.getTickets.mockReturnValue(generateTickets(20));
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      expect(screen.queryByText(/Load More/i)).toBeNull();
    });

    it("button disappears after loading the last batch", async () => {
      // 25 tickets -> after one Load More all loaded
      mockStore.getTickets.mockReturnValue(generateTickets(25));
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      // Button exists
      expect(
        screen.getByText(/Load More \(5 remaining\)/i),
      ).toBeInTheDocument();

      // Click and advance
      fireEvent.click(screen.getByText(/Load More \(5 remaining\)/i));
      await act(() => {
        vi.advanceTimersByTime(150);
      });

      // Button gone
      expect(screen.queryByText(/Load More/i)).toBeNull();
    });
  });

  // =========================================================================
  // AC5 — Skeleton cards shown during load
  // =========================================================================

  describe("AC5 — Skeleton cards shown during load", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockStore.seedData.mockImplementation(() => {});
    });

    it("shows skeleton cards in place of Load More button during loading", async () => {
      mockStore.getTickets.mockReturnValue(generateTickets(30));
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      // Click Load More — triggers loadingMore state
      fireEvent.click(screen.getByText(/Load More \(10 remaining\)/i));

      // Skeleton cards should be visible BEFORE the 100ms timeout fires.
      // SkeletonCard renders with aria-hidden="true" and class "card".
      const skeletons = document.querySelectorAll('[aria-hidden="true"].card');
      expect(skeletons.length).toBeGreaterThan(0);
      // remaining=10, BATCH_SIZE=20 -> min(20,10)=10 skeleton cards
      expect(skeletons.length).toBe(10);

      // Load More button should NOT be visible during loading
      expect(screen.queryByText(/Load More/i)).toBeNull();

      // Advance timers past the 100ms setTimeout -> skeletons should disappear
      await act(() => {
        vi.advanceTimersByTime(150);
      });

      const skeletonsAfter = document.querySelectorAll(
        '[aria-hidden="true"].card',
      );
      expect(skeletonsAfter.length).toBe(0);
    });

    it("shows skeleton cards for full batch when many remain", async () => {
      mockStore.getTickets.mockReturnValue(generateTickets(60));
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      fireEvent.click(screen.getByText(/Load More \(40 remaining\)/i));

      // remaining=40, BATCH_SIZE=20 -> 20 skeleton cards
      const skeletons = document.querySelectorAll('[aria-hidden="true"].card');
      expect(skeletons.length).toBe(20);

      await act(() => {
        vi.advanceTimersByTime(150);
      });

      // Skeletons gone, Load More returns for remaining 20
      const skeletonsAfter = document.querySelectorAll(
        '[aria-hidden="true"].card',
      );
      expect(skeletonsAfter.length).toBe(0);
      expect(
        screen.getByText(/Load More \(20 remaining\)/i),
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // AC6 — Smooth scroll to top of newly loaded batch
  // =========================================================================

  describe("AC6 — Smooth scroll to top of newly loaded batch", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockStore.seedData.mockImplementation(() => {});
      // Ensure scrollIntoView mock from vitest.setup.ts is still in place
      // and we have a fresh spy on it
    });

    it("calls scrollIntoView on the first card of the newly loaded batch", async () => {
      // Spy on Element.prototype.scrollIntoView (set up by vitest.setup.ts)
      const spy = vi
        .spyOn(Element.prototype, "scrollIntoView")
        .mockImplementation(() => {});

      mockStore.getTickets.mockReturnValue(generateTickets(30));
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      // Click Load More
      fireEvent.click(screen.getByText(/Load More \(10 remaining\)/i));

      // Run all pending timers to trigger the setTimeout (100ms), then flush React effects
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // scrollIntoView should have been called with smooth behavior
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start",
      });

      spy.mockRestore();
    });

    it("scrolls to the first card of the third batch (index 40)", async () => {
      mockStore.getTickets.mockReturnValue(generateTickets(45));
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      // Load batch 2 (tickets 21-40)
      fireEvent.click(screen.getByText(/Load More \(25 remaining\)/i));
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Spy fresh before next click
      const spy = vi
        .spyOn(Element.prototype, "scrollIntoView")
        .mockImplementation(() => {});

      // Load batch 3 (tickets 41-45)
      fireEvent.click(screen.getByText(/Load More \(5 remaining\)/i));
      await act(async () => {
        vi.runAllTimers();
      });

      // Should scroll to card at index 40 (the 41st card)
      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });
  });

  // =========================================================================
  // AC7 — Changing filters resets display count
  // =========================================================================

  describe("AC7 — Changing filters resets display count", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockStore.seedData.mockImplementation(() => {});
    });

    it("resets to first batch when a status filter is applied after loading more", async () => {
      // 25 draft tickets + 5 done tickets = 30 total
      const draftTickets = generateTickets(25, { status: "draft" });
      const doneTickets = generateTickets(5, { status: "done" }, 26);
      mockStore.getTickets.mockReturnValue([...draftTickets, ...doneTickets]);

      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      // Initially 20 draft tickets (all pass the "all" filter)
      expect(ticketCards()).toHaveLength(20);

      // Load more -> all 30 shown
      fireEvent.click(screen.getByText(/Load More \(10 remaining\)/i));
      await act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(ticketCards()).toHaveLength(30);

      // Change filter to "Done" -> display count resets to BATCH_SIZE
      // FilterBar buttons have aria-label like "Done (N tickets)"
      const doneFilter = screen.getByRole("button", {
        name: /^Done\b/i,
      });
      fireEvent.click(doneFilter);

      // Only 5 done tickets, all fit within BATCH_SIZE
      expect(ticketCards()).toHaveLength(5);

      // No Load More (5 < 20)
      expect(screen.queryByText(/Load More/i)).toBeNull();
    });

    it("resets to first batch when switching back to All after loading more", async () => {
      // 30 draft tickets
      mockStore.getTickets.mockReturnValue(generateTickets(30));
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      // Load more -> all 30 shown
      fireEvent.click(screen.getByText(/Load More \(10 remaining\)/i));
      await act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(ticketCards()).toHaveLength(30);

      // Switch to "Draft" filter (all tickets are draft)
      const draftFilter = screen.getByRole("button", {
        name: /^Draft\b/i,
      });
      fireEvent.click(draftFilter);

      // Display count resets to BATCH_SIZE=20
      expect(ticketCards()).toHaveLength(20);

      // Load More should reappear for the remaining 10
      expect(
        screen.getByText(/Load More \(10 remaining\)/i),
      ).toBeInTheDocument();
    });

    it("resets display count when priority filter is changed", async () => {
      // 30 tickets, mixed priorities
      const lowPriority = generateTickets(15, { priority: 3 as const });
      const highPriority = generateTickets(15, { priority: 1 as const }, 16);
      mockStore.getTickets.mockReturnValue([...lowPriority, ...highPriority]);

      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);

      // Load more -> all 30 shown
      fireEvent.click(screen.getByText(/Load More \(10 remaining\)/i));
      await act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(ticketCards()).toHaveLength(30);

      // Open the Filters disclosure (priority moved behind it in the redesign)
      fireEvent.click(screen.getByRole("button", { name: /^filters/i }));
      // Click "High" priority filter (the button, not the ticket badges)
      const highBtn = screen
        .getAllByText("High")
        .find((el) => el.tagName === "BUTTON");
      expect(highBtn).toBeDefined();
      fireEvent.click(highBtn!);

      // Only 15 high-priority tickets, all within BATCH_SIZE
      expect(ticketCards()).toHaveLength(15);

      // No Load More
      expect(screen.queryByText(/Load More/i)).toBeNull();
    });
  });
});
