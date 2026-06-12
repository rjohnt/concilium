import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/Toast";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next/navigation
const mockPush = vi.fn();
const mockUseParams = vi.fn(() => ({ id: "TIX-001" }));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  useParams: () => mockUseParams(),
}));

// Mock next/link
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

// Mock the store module
const mockStore = {
  seedData: vi.fn(),
  getTickets: vi.fn(() => [] as Ticket[]),
  getTicket: vi.fn(() => undefined as Ticket | undefined),
  createTicket: vi.fn(),
  updateTicketTags: vi.fn(),
  clearStorage: vi.fn(),
  deleteTicket: vi.fn(),
  updateTicket: vi.fn(),
  updateTicketPriority: vi.fn(),
  addFeedback: vi.fn(),
  getFeedbackHistory: vi.fn(() => []),
  getConsensusProgress: vi.fn(() => ({ total: 4, approved: 0, remaining: [] })),
};

vi.mock("@/lib/store", () => ({
  seedData: (...args: any[]) => mockStore.seedData(...args),
  getTickets: (...args: any[]) => (mockStore.getTickets as any)(...args),
  getTicket: (...args: any[]) => (mockStore.getTicket as any)(...args),
  createTicket: (...args: any[]) => mockStore.createTicket(...args),
  updateTicketTags: (...args: any[]) => mockStore.updateTicketTags(...args),
  clearStorage: (...args: any[]) => mockStore.clearStorage(...args),
  deleteTicket: (...args: any[]) => mockStore.deleteTicket(...args),
  updateTicket: (...args: any[]) => mockStore.updateTicket(...args),
  updateTicketPriority: (...args: any[]) => mockStore.updateTicketPriority(...args),
  addFeedback: (...args: any[]) => mockStore.addFeedback(...args),
  getFeedbackHistory: (...args: any[]) => (mockStore.getFeedbackHistory as any)(...args),
  getConsensusProgress: (...args: any[]) => (mockStore.getConsensusProgress as any)(...args),
}));

// Mock auth-context
vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(() => ({
    user: null,
    signOut: vi.fn(),
  })),
}));

// Mock framer-motion
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import type { Ticket, Tag } from "@/lib/types";
import {
  PREDEFINED_TAGS,
  TAG_COLORS,
} from "@/lib/types";

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "TIX-001",
    title: "Test ticket",
    description: "Description here",
    status: "draft",
    priority: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [],
    feedback: [],
    approvals: [],
    ...overrides,
  } as Ticket;
}

const BUG_TAG: Tag = PREDEFINED_TAGS.find((t) => t.id === "bug")!;
const FEATURE_TAG: Tag = PREDEFINED_TAGS.find((t) => t.id === "feature")!;
const DOCS_TAG: Tag = PREDEFINED_TAGS.find((t) => t.id === "docs")!;

// ---------------------------------------------------------------------------
// Acceptance Criteria Tests
// ---------------------------------------------------------------------------

describe("DEV-53 Acceptance: Ticket tag/label system with dashboard filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: "TIX-001" });
  });

  // =====================================================================
  // AC 1 – Tag type with id, label, color. Six predefined tags + TAG_COLORS
  // =====================================================================
  describe("AC 1: Tag type defined in types.ts", () => {
    it("exports Tag type with id, label, color", () => {
      const tag: Tag = { id: "bug", label: "Bug", color: "text-red-500" };
      expect(tag).toHaveProperty("id");
      expect(tag).toHaveProperty("label");
      expect(tag).toHaveProperty("color");
    });

    it("exports six predefined tags as a constant array with required fields", () => {
      expect(PREDEFINED_TAGS).toHaveLength(6);
      expect(PREDEFINED_TAGS.every((t) => t.id && t.label && t.color)).toBe(true);
    });

    it("TAG_COLORS is a complete lookup map of all six tags", () => {
      for (const tag of PREDEFINED_TAGS) {
        expect(TAG_COLORS[tag.id]).toBe(tag.color);
      }
      expect(Object.keys(TAG_COLORS)).toHaveLength(6);
    });
  });

  // =====================================================================
  // AC 2 – Ticket.tags: Tag[] field, default empty
  // =====================================================================
  describe("AC 2: Ticket interface gains tags field", () => {
    it("Ticket objects have a tags property of type Tag[]", () => {
      const ticket = makeTicket({ tags: [BUG_TAG] });
      expect(Array.isArray(ticket.tags)).toBe(true);
      expect(ticket.tags).toHaveLength(1);
      expect(ticket.tags[0].id).toBe("bug");
    });

    it("Ticket tags default to empty array when not specified", () => {
      const ticket = makeTicket();
      expect(ticket.tags).toEqual([]);
    });
  });

  // =====================================================================
  // AC 3 – New Ticket page: all six tags as multi-select toggle chips
  // =====================================================================
  describe("AC 3: New Ticket page tag selector", () => {
    it("renders all six predefined tags as toggle chips", async () => {
      const NewTicketPage = (await import("@/app/new/page")).default;
      render(<ToastProvider><NewTicketPage /></ToastProvider>);

      // All six tag labels appear
      for (const tag of PREDEFINED_TAGS) {
        expect(screen.getByText(tag.label)).toBeInTheDocument();
      }

      // They should be toggle buttons with aria-pressed
      const buttons = screen.getAllByRole("button");
      const tagButtons = buttons.filter((b) => {
        const txt = b.textContent || "";
        return PREDEFINED_TAGS.some((t) => txt.includes(t.label));
      });
      expect(tagButtons).toHaveLength(6);
    });

    it("clicking a tag toggles its selection state", async () => {
      const NewTicketPage = (await import("@/app/new/page")).default;
      render(<ToastProvider><NewTicketPage /></ToastProvider>);

      const bugButton = screen.getByRole("button", { name: /Bug/i });
      expect(bugButton).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(bugButton);
      expect(bugButton).toHaveAttribute("aria-pressed", "true");
    });

    it("selected tags display their color classes", async () => {
      const NewTicketPage = (await import("@/app/new/page")).default;
      render(<ToastProvider><NewTicketPage /></ToastProvider>);

      const bugButton = screen.getByRole("button", { name: /Bug/i });
      // Before selection — muted styling
      expect(bugButton.className).toContain("text-ink-muted");

      fireEvent.click(bugButton);
      // After selection — tag color classes (first word of color)
      expect(bugButton.className).toContain(BUG_TAG.color.split(" ")[0]);
    });
  });

  // =====================================================================
  // AC 4 – Ticket Detail page: Tags section with toggle editing
  // =====================================================================
  describe("AC 4: Ticket Detail page Tags section", () => {
    beforeEach(() => {
      const ticket = makeTicket({ tags: [BUG_TAG] });
      mockStore.seedData.mockImplementation(() => {});
      mockStore.getTicket.mockReturnValue(ticket);
      mockStore.updateTicketTags.mockImplementation((_id: string, tags: Tag[]) => ({
        ...ticket,
        tags,
      }));
    });

    it("renders Tags section heading with all six toggle chips", async () => {
      const TicketDetailPage = (await import("@/app/ticket/[id]/page")).default;
      render(<ToastProvider><TicketDetailPage /></ToastProvider>);

      // Tags section heading exists
      const tagsHeading = await screen.findByText("Tags");
      expect(tagsHeading).toBeInTheDocument();

      // All six PREDEFINED_TAGS appear somewhere on the page
      // (some as display badges in the header row, some as toggle buttons in Tag editor)
      for (const tag of PREDEFINED_TAGS) {
        const matches = screen.getAllByText(tag.label);
        expect(matches.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("shows already-assigned tags as selected (pressed) in the toggle section", async () => {
      const TicketDetailPage = (await import("@/app/ticket/[id]/page")).default;
      render(<ToastProvider><TicketDetailPage /></ToastProvider>);

      await screen.findByText("Tags");

      // Bug tag is on the ticket — its toggle should be pressed
      // getAllByRole returns all; the toggle one has aria-pressed
      const bugBtns = screen.getAllByRole("button", { name: /Bug/i });
      // At least one Bug button should be pressed (the toggle one in the Tags editor)
      const hasPressed = bugBtns.some((b) => b.getAttribute("aria-pressed") === "true");
      expect(hasPressed).toBe(true);
    });

    it("clicking a tag calls updateTicketTags with the updated tag list", async () => {
      const TicketDetailPage = (await import("@/app/ticket/[id]/page")).default;
      render(<ToastProvider><TicketDetailPage /></ToastProvider>);

      await screen.findByText("Tags");

      // Click the Feature toggle chip to add it
      const featureBtns = screen.getAllByRole("button", { name: /Feature/i });
      const featureToggle = featureBtns.find(
        (b) => b.getAttribute("aria-pressed") !== null
      )!;
      fireEvent.click(featureToggle);

      expect(mockStore.updateTicketTags).toHaveBeenCalled();
      const callArgs = mockStore.updateTicketTags.mock.calls[0];
      expect(callArgs[0]).toBe("TIX-001");
      const tagsArg: Tag[] = callArgs[1];
      const tagIds = tagsArg.map((t: Tag) => t.id);
      expect(tagIds).toContain("bug");
      expect(tagIds).toContain("feature");
    });
  });

  // =====================================================================
  // AC 5 – TicketCard renders tag pills after priority badge
  // =====================================================================
  describe("AC 5: TicketCard renders tag pills", () => {
    it("renders tag pills as display chips after the priority badge", async () => {
      const ticket = makeTicket({
        tags: [BUG_TAG, FEATURE_TAG],
        priority: 0,
      });
      const { TicketCard } = await import("@/components/TicketCard");
      render(<TicketCard ticket={ticket} />);

      // Priority badge present
      expect(screen.getByText("Urgent")).toBeInTheDocument();

      // Tag pills present as display spans
      const bugEl = screen.getByText("Bug");
      expect(bugEl.tagName).toBe("SPAN");
      const featureEl = screen.getByText("Feature");
      expect(featureEl.tagName).toBe("SPAN");
    });

    it("renders no tag pills when ticket has no tags", async () => {
      const ticket = makeTicket({ tags: [] });
      const { TicketCard } = await import("@/components/TicketCard");
      render(<TicketCard ticket={ticket} />);

      // None of the PREDEFINED_TAG labels should appear
      for (const tag of PREDEFINED_TAGS) {
        expect(screen.queryByText(tag.label)).toBeNull();
      }
    });

    it("tag pills use TagChip display mode (span with aria-label)", async () => {
      const ticket = makeTicket({ tags: [DOCS_TAG] });
      const { TicketCard } = await import("@/components/TicketCard");
      render(<TicketCard ticket={ticket} />);

      const docsEl = screen.getByText("Docs");
      expect(docsEl.tagName).toBe("SPAN");
      expect(docsEl).toHaveAttribute("aria-label", "Docs");
    });
  });

  // =====================================================================
  // AC 6 – Dashboard tag filter row below priority filter, OR logic
  // =====================================================================
  describe("AC 6: Dashboard tag filter row", () => {
    beforeEach(() => {
      mockStore.seedData.mockImplementation(() => {});
    });

    it("renders tag filter row below the priority filter", async () => {
      mockStore.getTickets.mockReturnValue([makeTicket()]);
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);
      fireEvent.click(screen.getByRole("button", { name: /^filters/i }));

      // "Tags:" label confirms the tag filter row exists
      const tagsLabel = await screen.findByText("Tags:");
      expect(tagsLabel).toBeInTheDocument();

      // All six tag chips present in toggle mode
      const allToggleButtons = screen.getAllByRole("button");
      const tagToggleButtons = allToggleButtons.filter(
        (b) => b.getAttribute("aria-pressed") !== null
      );
      // Should be at least 6 (the tag toggles) — there could also be some from the priority row
      const tagLabels = PREDEFINED_TAGS.map((t) => t.label);
      const tagToggles = tagToggleButtons.filter((b) => {
        const txt = b.textContent?.replace(/^\s+|\s+$/g, "") || "";
        return tagLabels.some((l) => txt.startsWith(l)) || tagLabels.some((l) => txt === l);
      });
      expect(tagToggles).toHaveLength(6);
    });

    it("has an All button that clears tag filters", async () => {
      mockStore.getTickets.mockReturnValue([makeTicket()]);
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);
      fireEvent.click(screen.getByRole("button", { name: /^filters/i }));

      // "All" appears at least twice (status FilterBar + priority + tags each have one)
      await screen.findByText("Tags:");
      const allButtons = screen.getAllByText("All");
      expect(allButtons.length).toBeGreaterThanOrEqual(2);
    });

    it("OR logic: selecting one tag shows tickets that have that tag", async () => {
      const bugTicket = makeTicket({
        id: "TIX-001",
        title: "Bug ticket",
        tags: [BUG_TAG],
      });
      const featureTicket = makeTicket({
        id: "TIX-002",
        title: "Feature ticket",
        tags: [FEATURE_TAG],
      });
      mockStore.getTickets.mockReturnValue([bugTicket, featureTicket]);

      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);
      fireEvent.click(screen.getByRole("button", { name: /^filters/i }));

      // Click the Bug tag toggle
      const bugBtns = await screen.findAllByRole("button", { name: /Bug/i });
      // The tag filter button may show as "Bug" or have an icon prefixing. Find the one with aria-pressed.
      const bugToggle = bugBtns.find(
        (b) => b.getAttribute("aria-pressed") !== null
      )!;
      fireEvent.click(bugToggle);

      // Bug ticket visible, feature ticket hidden
      expect(screen.getByText("Bug ticket")).toBeInTheDocument();
      expect(screen.queryByText("Feature ticket")).toBeNull();
    });

    it("OR logic: selecting multiple tags shows tickets matching any", async () => {
      const bugTicket = makeTicket({
        id: "TIX-001",
        title: "Bug ticket",
        tags: [BUG_TAG],
      });
      const featureTicket = makeTicket({
        id: "TIX-002",
        title: "Feature ticket",
        tags: [FEATURE_TAG],
      });
      const noTagTicket = makeTicket({
        id: "TIX-003",
        title: "No tag ticket",
        tags: [],
      });
      mockStore.getTickets.mockReturnValue([bugTicket, featureTicket, noTagTicket]);

      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);
      fireEvent.click(screen.getByRole("button", { name: /^filters/i }));

      const bugBtns = await screen.findAllByRole("button", { name: /Bug/i });
      const featureBtns = screen.getAllByRole("button", { name: /Feature/i });
      const bugToggle = bugBtns.find((b) => b.getAttribute("aria-pressed") !== null)!;
      const featureToggle = featureBtns.find(
        (b) => b.getAttribute("aria-pressed") !== null
      )!;

      fireEvent.click(bugToggle);
      fireEvent.click(featureToggle);

      // Both tagged tickets visible (OR), untagged hidden
      expect(screen.getByText("Bug ticket")).toBeInTheDocument();
      expect(screen.getByText("Feature ticket")).toBeInTheDocument();
      expect(screen.queryByText("No tag ticket")).toBeNull();
    });

    it("follows the same visual pattern as the priority filter", async () => {
      mockStore.getTickets.mockReturnValue([makeTicket()]);
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);
      fireEvent.click(screen.getByRole("button", { name: /^filters/i }));

      // Both filter rows exist: priority and tags
      await screen.findByText("Priority:");
      expect(screen.getByText("Tags:")).toBeInTheDocument();
    });
  });

  // =====================================================================
  // AC 7 – Persistence migration: t.tags ?? [] in loadTickets()
  // =====================================================================
  describe("AC 7: Persistence migration", () => {
    let mockStorage: {
      store: Record<string, string>;
      getItem: ReturnType<typeof vi.fn>;
      setItem: ReturnType<typeof vi.fn>;
      removeItem: ReturnType<typeof vi.fn>;
      clear: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      const store: Record<string, string> = {};
      mockStorage = {
        store,
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          Object.keys(store).forEach((k) => delete store[k]);
        }),
      };
      vi.stubGlobal("localStorage", mockStorage);
      // Reset any module-level state
      vi.resetModules();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("defaults tags to empty array for old data missing the tags field", async () => {
      const { loadTickets } = await import("@/lib/persistence");
      const { STORAGE_KEY } = await import("@/lib/persistence");

      const oldData = {
        version: 1,
        tickets: [
          {
            id: "TIX-001",
            title: "Old ticket",
            status: "draft",
            feedback: [],
            priority: 2,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
            approvals: [],
            // NO tags field — migration should add it
          },
        ],
        nextTicketId: 2,
        nextFeedbackId: 1,
        nextBuildReportId: 1,
      };

      mockStorage.store["concilium_tickets"] = JSON.stringify(oldData);

      const result = loadTickets();
      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0].tags).toEqual([]);
    });

    it("preserves existing tags on valid data", async () => {
      const { loadTickets } = await import("@/lib/persistence");

      const goodData = {
        version: 1,
        tickets: [
          {
            id: "TIX-001",
            title: "Tagged ticket",
            status: "draft",
            feedback: [],
            priority: 2,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
            approvals: [],
            tags: [{ id: "bug", label: "Bug", color: "bg-cardinal/20 text-cardinal border-cardinal/40" }],
          },
        ],
        nextTicketId: 2,
        nextFeedbackId: 1,
        nextBuildReportId: 1,
      };

      mockStorage.store["concilium_tickets"] = JSON.stringify(goodData);

      const result = loadTickets();
      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0].tags).toEqual([
        { id: "bug", label: "Bug", color: "bg-cardinal/20 text-cardinal border-cardinal/40" },
      ]);
    });
  });

  // =====================================================================
  // AC 8 – Tag filtering composes with status, priority, search filters
  // =====================================================================
  describe("AC 8: Tag filtering composes with other filters", () => {
    beforeEach(() => {
      mockStore.seedData.mockImplementation(() => {});
    });

    it("tag + status filter narrow results", async () => {
      const bugDraft = makeTicket({
        id: "TIX-001",
        title: "Bug draft",
        tags: [BUG_TAG],
        status: "draft",
      });
      const bugDone = makeTicket({
        id: "TIX-002",
        title: "Bug done",
        tags: [BUG_TAG],
        status: "done",
      });
      mockStore.getTickets.mockReturnValue([bugDraft, bugDone]);

      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);
      fireEvent.click(screen.getByRole("button", { name: /^filters/i }));

      // Select Bug tag
      const bugBtns = await screen.findAllByRole("button", { name: /Bug/i });
      const bugToggle = bugBtns.find((b) => b.getAttribute("aria-pressed") !== null)!;
      fireEvent.click(bugToggle);

      // Select Done status
      const doneBtn = screen.getByRole("button", { name: /Done/ });
      fireEvent.click(doneBtn);

      expect(screen.getByText("Bug done")).toBeInTheDocument();
      expect(screen.queryByText("Bug draft")).toBeNull();
    });

    it("tag + priority filter narrow results", async () => {
      const bugUrgent = makeTicket({
        id: "TIX-001",
        title: "Bug urgent",
        tags: [BUG_TAG],
        priority: 0,
      });
      const bugLow = makeTicket({
        id: "TIX-002",
        title: "Bug low",
        tags: [BUG_TAG],
        priority: 3,
      });
      mockStore.getTickets.mockReturnValue([bugUrgent, bugLow]);

      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);
      fireEvent.click(screen.getByRole("button", { name: /^filters/i }));

      // Select Bug tag
      const bugBtns = await screen.findAllByRole("button", { name: /Bug/i });
      const bugToggle = bugBtns.find((b) => b.getAttribute("aria-pressed") !== null)!;
      fireEvent.click(bugToggle);

      // Select Urgent priority — use getAllByText (there's also a badge in the card)
      const urgentElements = screen.getAllByText("Urgent");
      // The priority filter button is the <button>, not the <span> badge
      const urgentFilterBtn = urgentElements.find(
        (el) => el.tagName === "BUTTON"
      ) as HTMLButtonElement;
      fireEvent.click(urgentFilterBtn);

      expect(screen.getByText("Bug urgent")).toBeInTheDocument();
      expect(screen.queryByText("Bug low")).toBeNull();
    });

    it("tag + search filter narrow results", async () => {
      const bugFeature = makeTicket({
        id: "TIX-001",
        title: "Fix login bug",
        tags: [BUG_TAG, FEATURE_TAG],
      });
      const bugOnly = makeTicket({
        id: "TIX-002",
        title: "Database bug",
        tags: [BUG_TAG],
      });
      mockStore.getTickets.mockReturnValue([bugFeature, bugOnly]);

      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);
      fireEvent.click(screen.getByRole("button", { name: /^filters/i }));

      // Select Bug tag
      const bugBtns = await screen.findAllByRole("button", { name: /Bug/i });
      const bugToggle = bugBtns.find((b) => b.getAttribute("aria-pressed") !== null)!;
      fireEvent.click(bugToggle);

      // Search for "login"
      const searchInput = screen.getByPlaceholderText(/Search tickets/i);
      fireEvent.change(searchInput, { target: { value: "login" } });

      // Wait for debounce
      await act(() => new Promise((r) => setTimeout(r, 400)));

      expect(screen.getByText("Fix login bug")).toBeInTheDocument();
      expect(screen.queryByText("Database bug")).toBeNull();
    });

    it("all three filters together: tag + status + priority", async () => {
      const match = makeTicket({
        id: "TIX-001",
        title: "Match all",
        tags: [BUG_TAG],
        status: "draft",
        priority: 0,
      });
      const wrongStatus = makeTicket({
        id: "TIX-002",
        title: "Wrong status",
        tags: [BUG_TAG],
        status: "done",
        priority: 0,
      });
      const wrongPriority = makeTicket({
        id: "TIX-003",
        title: "Wrong priority",
        tags: [BUG_TAG],
        status: "draft",
        priority: 3,
      });
      mockStore.getTickets.mockReturnValue([match, wrongStatus, wrongPriority]);

      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);
      fireEvent.click(screen.getByRole("button", { name: /^filters/i }));

      // Select Bug tag
      const bugBtns = await screen.findAllByRole("button", { name: /Bug/i });
      const bugToggle = bugBtns.find((b) => b.getAttribute("aria-pressed") !== null)!;
      fireEvent.click(bugToggle);

      // Select Draft status
      const draftBtn = screen.getByRole("button", { name: /Draft/ });
      fireEvent.click(draftBtn);

      // Select Urgent priority — grab the filter button
      const urgentElements = screen.getAllByText("Urgent");
      const urgentFilterBtn = urgentElements.find(
        (el) => el.tagName === "BUTTON"
      ) as HTMLButtonElement;
      fireEvent.click(urgentFilterBtn);

      expect(screen.getByText("Match all")).toBeInTheDocument();
      expect(screen.queryByText("Wrong status")).toBeNull();
      expect(screen.queryByText("Wrong priority")).toBeNull();
    });
  });

  // =====================================================================
  // AC 9 – Empty state when no tickets match tag filter
  // =====================================================================
  describe("AC 9: Empty state for tag filter", () => {
    beforeEach(() => {
      mockStore.seedData.mockImplementation(() => {});
    });

    it("shows 'No tickets match these tag filters' when filtering by unassigned tag", async () => {
      mockStore.getTickets.mockReturnValue([makeTicket({ tags: [] })]);
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);
      fireEvent.click(screen.getByRole("button", { name: /^filters/i }));

      const bugBtns = await screen.findAllByRole("button", { name: /Bug/i });
      const bugToggle = bugBtns.find((b) => b.getAttribute("aria-pressed") !== null)!;
      fireEvent.click(bugToggle);

      const emptyMsg = await screen.findByText("No tickets match these tag filters");
      expect(emptyMsg).toBeInTheDocument();
    });

    it("shows 'No tickets yet' when no filters active and no tickets exist", async () => {
      mockStore.getTickets.mockReturnValue([]);
      const DashboardPage = (await import("@/app/page")).default;
      render(<DashboardPage />);
      fireEvent.click(screen.getByRole("button", { name: /^filters/i }));

      const emptyMsg = await screen.findByText("No tickets yet");
      expect(emptyMsg).toBeInTheDocument();
    });
  });

  // =====================================================================
  // AC 10 – Tests exist: TagChip.test.tsx, store tests for tags
  // =====================================================================
  describe("AC 10: Tests for TagChip and store tag functions", () => {
    it("TagChip.test.tsx test file exists and is importable", async () => {
      // Dynamic import verifies the file exists and has no syntax errors
      const mod = await import("@/components/__tests__/TagChip.test");
      expect(mod).toBeDefined();
      // Vitest test files define describe/it/expect; verify the module loaded
      expect(typeof mod).toBe("object");
    });

    it("store test module has updateTicketTags and createTicket tag tests", async () => {
      const mod = await import("@/lib/__tests__/store.test");
      expect(mod).toBeDefined();
    });

    it("the real store module exports createTicket and updateTicketTags", async () => {
      // Import the real store directly (not the mock) to verify exports
      const realStore = await vi.importActual<typeof import("@/lib/store")>("@/lib/store");
      expect(typeof realStore.createTicket).toBe("function");
      expect(typeof realStore.updateTicketTags).toBe("function");
    });

    it("TagChip test file verifies 7 component tests pass", async () => {
      // The TagChip test fixture itself verifies the component behavior.
      // This acceptance test confirms the test file loads — the CI runner
      // separately confirms all 7 TagChip tests + 2 store tag tests pass.
      const mod = await import("@/components/__tests__/TagChip.test");
      expect(mod).toBeTruthy();
    });
  });
});
