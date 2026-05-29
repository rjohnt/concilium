/**
 * Acceptance Tests — DEV-8: Public Share Page Polish & Buyer Experience
 *
 * Tests are written from the user's perspective: a potential buyer viewing
 * a shared vehicle page. They verify that the SharePage satisfies the
 * acceptance criteria for public access, layout, hero, timeline, filters,
 * share features, error handling, and photo lightbox.
 *
 * Rule: NEVER modify backend or frontend code. If a test fails, report it.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  within,
  act,
} from "@testing-library/react";
import type { ShareData, TimelineCategory } from "@/lib/share-types";

// ── Mock: qrcode.react (avoid SVG rendering issues in jsdom) ──────────
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value, size }: { value: string; size: number }) => (
    <div data-testid="qr-code" data-value={value} data-size={size}>
      QR Code
    </div>
  ),
}));

// ── Mock: @/lib/share-store ────────────────────────────────────────────
const mockFetchShareData = vi.fn<[string], ShareData | null>();
vi.mock("@/lib/share-store", () => ({
  fetchShareData: mockFetchShareData,
}));

// ── Override useParams for each test ───────────────────────────────────
// vitest.setup.ts globally mocks next/navigation with vi.fn() exports,
// so we can use vi.mocked() to reconfigure per-test.
import { useParams } from "next/navigation";

// ── Factory functions ──────────────────────────────────────────────────

function createVehicleSummary(overrides = {}) {
  return {
    make: "Porsche",
    model: "911 Carrera",
    year: 1987,
    vin: "WP0AB0910HS122001",
    trim: "Coupe",
    exteriorColor: "Guards Red",
    interiorColor: "Black Leather",
    mileage: 68000,
    price: 89500,
    ...overrides,
  };
}

function createTimelineEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt-001",
    date: "2024-06-15T00:00:00.000Z",
    title: "Oil Change",
    description: "Regular oil change with synthetic oil.",
    category: "service" as TimelineCategory,
    photos: [],
    mileage: 67000,
    provider: "Rennsport Autohaus",
    ...overrides,
  };
}

function createShareData(overrides: Partial<ShareData> = {}): ShareData {
  return {
    shareId: "a1b2c3d4-e5f6-4000-8000-000000000001",
    vehicle: createVehicleSummary(),
    timeline: [
      createTimelineEvent({
        id: "evt-001",
        date: "2024-06-15T00:00:00.000Z",
        title: "Oil Change",
        description: "Regular oil change with synthetic oil.",
        category: "service",
        photos: [],
        mileage: 67000,
        provider: "Rennsport Autohaus",
      }),
      createTimelineEvent({
        id: "evt-002",
        date: "2024-08-20T00:00:00.000Z",
        title: "Brake Pad Replacement",
        description: "Front and rear brake pads replaced with OEM parts.",
        category: "service",
        photos: [],
        mileage: 67500,
      }),
      createTimelineEvent({
        id: "evt-003",
        date: "2024-10-05T00:00:00.000Z",
        title: "Car Show Display",
        description: "Displayed at local Porsche club event.",
        category: "event",
        photos: [
          {
            id: "photo-001",
            url: "https://example.com/photo1.jpg",
            caption: "At the Porsche show",
            takenAt: "2024-10-05T00:00:00.000Z",
          },
        ],
      }),
    ],
    sellerNotes: "Well-maintained 911 with full service history.",
    createdAt: "2025-01-15T10:30:00.000Z",
    ...overrides,
  };
}

const VALID_SHARE_ID = "a1b2c3d4-e5f6-4000-8000-000000000001";

// ── Helper to render the SharePage ─────────────────────────────────────

async function renderSharePage(shareId: string = VALID_SHARE_ID) {
  // Override useParams to return the specified share ID
  vi.mocked(useParams).mockReturnValue({ id: shareId } as ReturnType<typeof useParams>);

  const SharePage = (await import("@/app/(public)/share/[id]/page")).default;
  return render(<SharePage />);
}

// ========================================================================
// Tests
// ========================================================================

describe("DEV-8: Public Share Page Polish & Buyer Experience (acceptance)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    // Set up clipboard mock
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });

    // Set window.location.origin for share URL construction
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://concilium.example.com",
        href: `https://concilium.example.com/share/${VALID_SHARE_ID}`,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── AC1: Public access ──────────────────────────────────────────────

  it("AC1: /share/[id] route is accessible to unauthenticated users", async () => {
    mockFetchShareData.mockReturnValue(createShareData());

    await renderSharePage();

    // Unauthenticated users see the vehicle hero heading (not a login screen)
    expect(
      screen.getByRole("heading", { name: /1987 Porsche 911 Carrera/ }),
    ).toBeInTheDocument();

    // The page should not render any auth guard or login prompt
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/log in/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/authentication required/i)).not.toBeInTheDocument();

    // Timeline content is visible to unauthenticated users
    expect(screen.getByText("Oil Change")).toBeInTheDocument();
  });

  // ── AC2: Public layout — no sidebar, clean full-width ──────────────

  it("AC2: public layout has no sidebar and uses full-width layout", async () => {
    mockFetchShareData.mockReturnValue(createShareData());

    const { container } = await renderSharePage();

    // The SharePage itself should not render a sidebar component.
    // Check that no sidebar landmark or navigation region exists.
    expect(
      container.querySelector('aside, [role="navigation"]'),
    ).toBeNull();

    // The layout wrapper should use md:-ml-64 to offset for the sidebar
    // that would exist on authenticated pages (indicating public layout).
    const offsetDiv = container.querySelector(".md\\:-ml-64");
    expect(offsetDiv).not.toBeNull();
  });

  // ── AC3: Mobile-optimized responsive design ─────────────────────────

  it("AC3: layout uses responsive design classes for mobile through desktop", async () => {
    mockFetchShareData.mockReturnValue(createShareData());

    const { container } = await renderSharePage();

    // Hero: responsive height classes
    const heroContainer = container.querySelector(".h-64");
    expect(heroContainer).not.toBeNull();
    // The component defines: h-64 md:h-80 lg:h-96 — check for responsive classes
    const heroDiv = container.querySelector(".relative.h-64");
    expect(heroDiv).not.toBeNull();
    expect(heroDiv?.className).toContain("md:h-80");
    expect(heroDiv?.className).toContain("lg:h-96");

    // Heading: responsive text sizes
    const heading = screen.getByRole("heading", { name: /1987 Porsche 911 Carrera/ });
    expect(heading.className).toContain("text-2xl");
    expect(heading.className).toContain("md:text-3xl");
    expect(heading.className).toContain("lg:text-4xl");

    // Content area: responsive padding
    const contentArea = container.querySelector(".max-w-3xl.mx-auto.px-4");
    expect(contentArea).not.toBeNull();
    expect(contentArea?.className).toContain("md:px-0");
  });

  // ── AC4: Hero with vehicle image and stats overlay ─────────────────

  it("AC4: hero displays vehicle image area, year/make/model heading, mileage, and events count", async () => {
    mockFetchShareData.mockReturnValue(createShareData());

    await renderSharePage();

    // Year, make, model in heading
    const heading = screen.getByRole("heading", {
      name: /1987 Porsche 911 Carrera/,
    });
    expect(heading).toBeInTheDocument();

    // Trim is shown
    expect(screen.getByText("Coupe")).toBeInTheDocument();

    // Mileage stat (68,000 mi)
    expect(screen.getByText(/68,000 mi/)).toBeInTheDocument();

    // Events count (3 events from factory data)
    expect(screen.getByText(/3 events/)).toBeInTheDocument();

    // Year stat
    const yearElements = screen.getAllByText("1987");
    expect(yearElements.length).toBeGreaterThanOrEqual(1);

    // Exterior color swatch
    expect(screen.getByText("Guards Red")).toBeInTheDocument();
  });

  // ── AC5: Timeline of vehicle history with events ───────────────────

  it("AC5: timeline displays vehicle history events with titles and descriptions", async () => {
    mockFetchShareData.mockReturnValue(createShareData());

    await renderSharePage();

    // Section heading
    expect(screen.getByText("Service History")).toBeInTheDocument();
    // Event count in heading
    expect(screen.getByText("(3)")).toBeInTheDocument();

    // Event titles
    expect(screen.getByText("Oil Change")).toBeInTheDocument();
    expect(screen.getByText("Brake Pad Replacement")).toBeInTheDocument();
    expect(screen.getByText("Car Show Display")).toBeInTheDocument();

    // Event descriptions
    expect(
      screen.getByText(/Regular oil change with synthetic oil/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Front and rear brake pads replaced/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Displayed at local Porsche club event/),
    ).toBeInTheDocument();

    // Date formatting — dates appear as formatted strings (locale-dependent).
    // Verify dates are rendered by matching partial patterns (allow for timezone shifts).
    const allText = document.body.textContent || "";
    // Jun 14-15, 2024 (UTC midnight June 15 may render as June 14 in some timezones)
    expect(allText).toMatch(/Jun 1[45], 2024|June 1[45], 2024|1[45] Jun 2024/);
    // Aug 19-20, 2024
    expect(allText).toMatch(/Aug (19|20), 2024|August (19|20), 2024|(19|20) Aug 2024/);
    // Oct 4-5, 2024
    expect(allText).toMatch(/Oct [45], 2024|October [45], 2024|[45] Oct 2024/);

    // Mileage on event cards (may appear multiple times)
    expect(screen.getAllByText("67,000 mi").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("67,500 mi")).toBeInTheDocument();
  });

  // ── AC6: Category filter for timeline ──────────────────────────────

  it("AC6: category filter chips filter the timeline when clicked", async () => {
    mockFetchShareData.mockReturnValue(createShareData());

    await renderSharePage();

    // All filter chips are rendered — "All" + each unique category
    expect(screen.getByText("All")).toBeInTheDocument();

    // service and event categories (use getAllByText since labels appear on badges too)
    const serviceChips = screen.getAllByText("Service");
    const eventChips = screen.getAllByText("Event");
    expect(serviceChips.length).toBeGreaterThanOrEqual(1);
    expect(eventChips.length).toBeGreaterThanOrEqual(1);

    // Initially all 3 events visible
    expect(screen.getByText("Oil Change")).toBeInTheDocument();
    expect(screen.getByText("Brake Pad Replacement")).toBeInTheDocument();
    expect(screen.getByText("Car Show Display")).toBeInTheDocument();

    // Click "Event" filter chip (first occurrence is the chip button)
    fireEvent.click(eventChips[0]);

    // Only the event category event should remain visible
    expect(screen.queryByText("Oil Change")).not.toBeInTheDocument();
    expect(screen.queryByText("Brake Pad Replacement")).not.toBeInTheDocument();
    expect(screen.getByText("Car Show Display")).toBeInTheDocument();

    // Count should update to (1)
    expect(screen.getByText("(1)")).toBeInTheDocument();

    // Return to "All"
    fireEvent.click(screen.getByText("All"));

    // All events visible again
    expect(screen.getByText("Oil Change")).toBeInTheDocument();
    expect(screen.getByText("Brake Pad Replacement")).toBeInTheDocument();
    expect(screen.getByText("Car Show Display")).toBeInTheDocument();
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  // ── AC7: Copy-to-clipboard share link ──────────────────────────────

  it("AC7: copy button copies the share link to clipboard", async () => {
    mockFetchShareData.mockReturnValue(createShareData());

    await renderSharePage();

    // Find the Copy share link button
    const copyButton = screen.getByRole("button", { name: "Copy share link" });
    expect(copyButton).toBeInTheDocument();

    // Click the copy button
    await act(async () => {
      fireEvent.click(copyButton);
    });

    // After copy, "Copied!" should appear
    expect(screen.getByText("Copied!")).toBeInTheDocument();

    // navigator.clipboard.writeText should have been called with the share URL
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `https://concilium.example.com/share/${VALID_SHARE_ID}`,
    );
  });

  // ── AC8: QR code for share link ────────────────────────────────────

  it("AC8: QR code is rendered for the share link", async () => {
    mockFetchShareData.mockReturnValue(createShareData());

    await renderSharePage();

    // QR code element (mocked as data-testid="qr-code")
    const qrCode = screen.getByTestId("qr-code");
    expect(qrCode).toBeInTheDocument();
    expect(qrCode).toHaveAttribute(
      "data-value",
      `https://concilium.example.com/share/${VALID_SHARE_ID}`,
    );

    // "Scan to view on mobile" caption
    expect(
      screen.getByText("Scan to view on mobile"),
    ).toBeInTheDocument();
  });

  // ── AC9: Graceful error handling for missing/invalid data ──────────

  it("AC9: shows 'Share Not Found' when share data is null (invalid ID)", async () => {
    // fetchShareData returns null for invalid IDs
    mockFetchShareData.mockReturnValue(null);

    await renderSharePage("invalid-id-not-a-uuid");

    // Error state title
    expect(screen.getByText("Share Not Found")).toBeInTheDocument();

    // Error description
    expect(
      screen.getByText(
        "Share not found or link is invalid.",
      ),
    ).toBeInTheDocument();

    // No vehicle content should be visible
    expect(
      screen.queryByRole("heading", { name: /Porsche/ }),
    ).not.toBeInTheDocument();
  });

  it("AC9: shows fallback error message when data is null without explicit error", async () => {
    // fetchShareData returns null, useParams returns empty id
    mockFetchShareData.mockReturnValue(null);
    vi.mocked(useParams).mockReturnValue({ id: "" } as ReturnType<typeof useParams>);

    const SharePage = (await import("@/app/(public)/share/[id]/page")).default;
    render(<SharePage />);

    // Should show error state — either the default message or "No share ID provided."
    const errorTitle = screen.getByText("Share Not Found");
    expect(errorTitle).toBeInTheDocument();
  });

  // ── AC10: Photo lightbox on click ──────────────────────────────────

  it("AC10: clicking a photo thumbnail opens the photo lightbox", async () => {
    mockFetchShareData.mockReturnValue(createShareData());

    await renderSharePage();

    // Find the photo thumbnail button for the event with photos.
    // The "Car Show Display" event has one photo with caption "At the Porsche show"
    const photoButton = screen.getByRole("button", {
      name: "At the Porsche show",
    });
    expect(photoButton).toBeInTheDocument();

    // Click the photo thumbnail
    fireEvent.click(photoButton);

    // Lightbox should appear with the photo caption
    expect(screen.getByText("At the Porsche show")).toBeInTheDocument();

    // Lightbox close button should be present
    expect(
      screen.getByRole("button", { name: "Close lightbox" }),
    ).toBeInTheDocument();

    // The lightbox image should be rendered (use getAllByRole since both
    // the thumbnail and the lightbox img share the same alt text)
    const lightboxImgs = screen.getAllByRole("img", { name: "At the Porsche show" });
    expect(lightboxImgs.length).toBeGreaterThanOrEqual(2); // thumbnail + lightbox
    // The lightbox image is the larger one (object-contain, not object-cover)
    const lightboxImg = lightboxImgs.find((img) =>
      img.className.includes("object-contain"),
    );
    expect(lightboxImg).toBeTruthy();
    expect(lightboxImg).toHaveAttribute("src", "https://example.com/photo1.jpg");
  });

  it("AC10: clicking the lightbox close button closes the lightbox", async () => {
    mockFetchShareData.mockReturnValue(createShareData());

    await renderSharePage();

    // Open lightbox
    const photoButton = screen.getByRole("button", {
      name: "At the Porsche show",
    });
    fireEvent.click(photoButton);

    // Close lightbox
    const closeButton = screen.getByRole("button", { name: "Close lightbox" });
    fireEvent.click(closeButton);

    // Lightbox should be gone (AnimatePresence mocked to remove children immediately)
    expect(
      screen.queryByRole("button", { name: "Close lightbox" }),
    ).not.toBeInTheDocument();
  });

  // ── Bonus: Share link bar displays the share URL ────────────────────

  it("share link bar displays the truncated share URL", async () => {
    mockFetchShareData.mockReturnValue(createShareData());

    await renderSharePage();

    // The share URL is displayed in the bar (truncated if > 50 chars).
    // The full URL is 77 chars including the UUID, so it will be truncated with "..."
    const truncatedUrl = `https://concilium.example.com/share/${VALID_SHARE_ID}`;
    // Since it's > 50 chars, ShareLinkBar truncates: first 50 chars + "..."
    expect(
      screen.getByText((content) => content.startsWith("https://concilium.example.com/share/a1b2c3d4")),
    ).toBeInTheDocument();
  });
});
