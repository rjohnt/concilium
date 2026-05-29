import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SharePage from "../page";

// Mock fetchShareData
const mockFetchShareData = vi.fn();
vi.mock("@/lib/share-store", () => ({
  fetchShareData: (...args: unknown[]) => mockFetchShareData(...args),
}));

// Mock useParams
const mockUseParams = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => "/share/test-id"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

const mockShareData = {
  shareId: "test-id",
  vehicle: {
    make: "Porsche",
    model: "911 Carrera",
    year: 1987,
    vin: "WP0AB0910HS122001",
    trim: "Coupe",
    exteriorColor: "Guards Red",
    interiorColor: "Black Leather",
    mileage: 68000,
    price: 89500,
  },
  timeline: [
    {
      id: "evt-1",
      date: "2023-06-15T00:00:00.000Z",
      title: "Oil Change",
      description: "Regular oil change.",
      category: "service" as const,
      photos: [],
    },
    {
      id: "evt-2",
      date: "2024-01-10T00:00:00.000Z",
      title: "Engine Rebuild",
      description: "Complete engine rebuild.",
      category: "service" as const,
      photos: [
        {
          id: "photo-1",
          url: "https://example.com/photo1.jpg",
          caption: "Engine bay",
          takenAt: "2024-01-10T00:00:00.000Z",
        },
      ],
    },
  ],
  sellerNotes: "Great car.",
  createdAt: "2025-01-15T10:30:00.000Z",
};

describe("SharePage", () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ id: "test-id" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows skeleton while loading", () => {
    // fetchShareData never resolves (or resolves async after render)
    mockFetchShareData.mockReturnValue(undefined);
    render(<SharePage />);
    // The skeleton should have aria-hidden
    const hidden = document.querySelector('[aria-hidden="true"]');
    expect(hidden).toBeInTheDocument();
  });

  it("renders vehicle hero when data loads", async () => {
    mockFetchShareData.mockReturnValue(mockShareData);
    render(<SharePage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /1987 Porsche 911 Carrera/ })
      ).toBeInTheDocument();
    });
  });

  it("renders ShareTimeline with events", async () => {
    mockFetchShareData.mockReturnValue(mockShareData);
    render(<SharePage />);

    await waitFor(() => {
      expect(screen.getByText("Oil Change")).toBeInTheDocument();
      expect(screen.getByText("Engine Rebuild")).toBeInTheDocument();
    });
  });

  it("renders ShareLinkBar", async () => {
    mockFetchShareData.mockReturnValue(mockShareData);
    render(<SharePage />);

    await waitFor(() => {
      expect(
        screen.getByText("Scan to view on mobile")
      ).toBeInTheDocument();
    });
  });

  it("shows EmptyState for invalid share ID", async () => {
    mockUseParams.mockReturnValue({ id: "not-a-uuid" });
    mockFetchShareData.mockReturnValue(null);
    render(<SharePage />);

    await waitFor(() => {
      expect(screen.getByText("Share Not Found")).toBeInTheDocument();
    });
  });

  it("shows EmptyState when fetchShareData returns null", async () => {
    mockUseParams.mockReturnValue({ id: "12345678-1234-4234-8234-123456789abc" });
    mockFetchShareData.mockReturnValue(null);
    render(<SharePage />);

    await waitFor(() => {
      expect(screen.getByText("Share Not Found")).toBeInTheDocument();
    });
  });

  it("opens PhotoLightbox when photo thumbnail is clicked", async () => {
    mockFetchShareData.mockReturnValue(mockShareData);
    const { container } = render(<SharePage />);

    await waitFor(() => {
      expect(screen.getByText("Engine Rebuild")).toBeInTheDocument();
    });

    // Click the photo thumbnail button
    const photoBtn = screen.getByRole("button", { name: "Engine bay" });
    photoBtn.click();

    // Lightbox should appear
    await waitFor(() => {
      expect(screen.getByLabelText("Close lightbox")).toBeInTheDocument();
    });
  });
});
