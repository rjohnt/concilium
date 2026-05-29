import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShareTimeline } from "../ShareTimeline";
import type { TimelineCategory, TimelinePhoto } from "@/lib/share-types";

// Use the extended event type from the component
interface TestEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  category: TimelineCategory;
  photos: TimelinePhoto[];
  mileage?: number;
  provider?: string;
}

const mockPhotos: TimelinePhoto[] = [
  {
    id: "photo-1",
    url: "https://example.com/photo1.jpg",
    caption: "Engine bay",
    takenAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "photo-2",
    url: "https://example.com/photo2.jpg",
    caption: "Interior",
    takenAt: "2024-01-02T00:00:00.000Z",
  },
];

const mockEvents: TestEvent[] = [
  {
    id: "evt-1",
    date: "2023-06-15T00:00:00.000Z",
    title: "Oil Change",
    description: "Regular oil change with synthetic oil.",
    category: "service",
    photos: [],
    mileage: 67000,
    provider: "Rennsport Autohaus",
  },
  {
    id: "evt-2",
    date: "2024-01-10T00:00:00.000Z",
    title: "Engine Rebuild",
    description: "Complete engine rebuild. New pistons, cylinders, and timing chains.",
    category: "service",
    photos: [mockPhotos[0]],
    mileage: 68000,
  },
  {
    id: "evt-3",
    date: "2024-05-20T00:00:00.000Z",
    title: "Car Show Display",
    description: "Displayed at a collector car event.",
    category: "event",
    photos: [mockPhotos[0], mockPhotos[1]],
    provider: "Pebble Beach Concours",
  },
];

const mockCategories: TimelineCategory[] = ["service", "event", "purchase"];

describe("ShareTimeline", () => {
  it("renders section heading with event count", () => {
    render(
      <ShareTimeline events={mockEvents} categories={mockCategories} />
    );
    expect(screen.getByText("Service History")).toBeInTheDocument();
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  it("renders 'All' chip and one chip per category", () => {
    render(
      <ShareTimeline events={mockEvents} categories={mockCategories} />
    );
    expect(screen.getByText("All")).toBeInTheDocument();
    // Use getAllByText since category labels also appear on event card badges
    expect(screen.getAllByText("Service").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Event").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Purchase").length).toBeGreaterThanOrEqual(1);
  });

  it("filters events by category when a chip is clicked", () => {
    render(
      <ShareTimeline events={mockEvents} categories={mockCategories} />
    );

    // All 3 events visible initially
    expect(screen.getByText("Oil Change")).toBeInTheDocument();
    expect(screen.getByText("Engine Rebuild")).toBeInTheDocument();
    expect(screen.getByText("Car Show Display")).toBeInTheDocument();

    // Click "Event" chip (use getAllByText since "Event" also appears on card badges)
    const eventChips = screen.getAllByText("Event");
    fireEvent.click(eventChips[0]);

    // Only the event category event should be visible
    expect(screen.queryByText("Oil Change")).not.toBeInTheDocument();
    expect(screen.queryByText("Engine Rebuild")).not.toBeInTheDocument();
    expect(screen.getByText("Car Show Display")).toBeInTheDocument();

    // Count should update
    expect(screen.getByText("(1)")).toBeInTheDocument();
  });

  it("shows empty state when no events match filter", () => {
    render(
      <ShareTimeline events={mockEvents} categories={mockCategories} />
    );

    // Filter by purchase (no events in mock data)
    fireEvent.click(screen.getByText("Purchase"));

    expect(
      screen.getByText(/"purchase" events found/)
    ).toBeInTheDocument();
  });

  it("shows empty state when no events at all", () => {
    render(
      <ShareTimeline events={[]} categories={mockCategories} />
    );
    expect(
      screen.getByText("No events recorded yet.")
    ).toBeInTheDocument();
  });

  it("renders event titles and descriptions", () => {
    render(
      <ShareTimeline events={mockEvents} categories={mockCategories} />
    );
    expect(screen.getByText("Oil Change")).toBeInTheDocument();
    expect(
      screen.getByText(/Regular oil change with synthetic oil/)
    ).toBeInTheDocument();
  });

  it("renders mileage badge when present", () => {
    render(
      <ShareTimeline events={mockEvents} categories={mockCategories} />
    );
    expect(screen.getByText("67,000 mi")).toBeInTheDocument();
  });

  it("renders provider name when present", () => {
    render(
      <ShareTimeline events={mockEvents} categories={mockCategories} />
    );
    expect(screen.getByText("Rennsport Autohaus")).toBeInTheDocument();
  });

  it("renders photo thumbnails for events with photos", () => {
    render(
      <ShareTimeline events={mockEvents} categories={mockCategories} />
    );

    // Photo thumbnails: evt-2 has 1 (Engine bay), evt-3 has 2 (Engine bay + Interior)
    const photos = screen.getAllByRole("img");
    // Filter out lucide SVG icons (they also use role="img" for QR codes, but here only photos)
    const photoImgs = photos.filter(
      (el) => el.getAttribute("src")?.startsWith("https://")
    );
    // evt-2 has 1 photo, evt-3 has 2 photos = 3 total
    expect(photoImgs.length).toBe(3);
  });

  it("calls onPhotoClick when photo thumbnail is clicked", () => {
    const onPhotoClick = vi.fn();
    render(
      <ShareTimeline
        events={mockEvents}
        categories={mockCategories}
        onPhotoClick={onPhotoClick}
      />
    );

    const photoButtons = screen.getAllByRole("button", { name: /Engine bay|Interior/ });
    fireEvent.click(photoButtons[0]);

    expect(onPhotoClick).toHaveBeenCalledTimes(1);
    // First arg should be the photos array, second should be the index
    expect(onPhotoClick.mock.calls[0][1]).toBe(0);
  });
});
