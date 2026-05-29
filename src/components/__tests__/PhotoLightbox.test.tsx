import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PhotoLightbox } from "../PhotoLightbox";
import type { TimelinePhoto } from "@/lib/share-types";

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
  {
    id: "photo-3",
    url: "https://example.com/photo3.jpg",
    caption: undefined,
    takenAt: "2024-01-03T00:00:00.000Z",
  },
];

describe("PhotoLightbox", () => {
  beforeEach(() => {
    // Ensure body overflow is captured
    document.body.style.overflow = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the photo at initialIndex", () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        initialIndex={0}
        onClose={vi.fn()}
      />
    );
    const img = screen.getByRole("img", { name: "Engine bay" });
    expect(img).toHaveAttribute("src", "https://example.com/photo1.jpg");
  });

  it("renders caption when provided", () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        initialIndex={0}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Engine bay")).toBeInTheDocument();
  });

  it("does not render caption for photos without one", () => {
    render(
      <PhotoLightbox
        photos={[mockPhotos[2]]}
        initialIndex={0}
        onClose={vi.fn()}
      />
    );
    const img = screen.getByRole("img", { name: "Photo" });
    expect(img).toBeInTheDocument();
    // No caption paragraph
    expect(screen.queryByText("Engine bay")).not.toBeInTheDocument();
  });

  it("calls onClose when X button is clicked", () => {
    const onClose = vi.fn();
    render(
      <PhotoLightbox
        photos={mockPhotos}
        initialIndex={0}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByLabelText("Close lightbox"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <PhotoLightbox
        photos={mockPhotos}
        initialIndex={0}
        onClose={onClose}
      />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking outside image (overlay)", () => {
    const onClose = vi.fn();
    const { container } = render(
      <PhotoLightbox
        photos={mockPhotos}
        initialIndex={0}
        onClose={onClose}
      />
    );
    // Click the overlay (first child)
    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows left/right arrows when multiple photos", () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        initialIndex={0}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Previous photo")).toBeInTheDocument();
    expect(screen.getByLabelText("Next photo")).toBeInTheDocument();
  });

  it("hides arrows when only one photo", () => {
    render(
      <PhotoLightbox
        photos={[mockPhotos[0]]}
        initialIndex={0}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByLabelText("Previous photo")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Next photo")).not.toBeInTheDocument();
  });

  it("navigates to next photo with right arrow click", () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        initialIndex={0}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText("Next photo"));
    expect(screen.getByRole("img", { name: "Interior" })).toBeInTheDocument();
  });

  it("navigates to previous photo with left arrow click", () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        initialIndex={1}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText("Previous photo"));
    expect(screen.getByRole("img", { name: "Engine bay" })).toBeInTheDocument();
  });

  it("wraps around when navigating past last photo", () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        initialIndex={2}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText("Next photo"));
    expect(screen.getByRole("img", { name: "Engine bay" })).toBeInTheDocument();
  });

  it("wraps around when navigating before first photo", () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        initialIndex={0}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText("Previous photo"));
    // Wraps to last photo (photo-3, no caption)
    expect(screen.getByRole("img", { name: "Photo" })).toBeInTheDocument();
  });

  it("renders dot indicators when multiple photos", () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        initialIndex={0}
        onClose={vi.fn()}
      />
    );
    const dots = screen.getAllByLabelText(/Go to photo/);
    expect(dots).toHaveLength(3);
  });

  it("navigates via dot indicator click", () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        initialIndex={0}
        onClose={vi.fn()}
      />
    );
    const dots = screen.getAllByLabelText(/Go to photo/);
    fireEvent.click(dots[1]); // Go to photo 2
    expect(screen.getByRole("img", { name: "Interior" })).toBeInTheDocument();
  });

  it("locks body scroll on mount", () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        initialIndex={0}
        onClose={vi.fn()}
      />
    );
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("navigates with keyboard arrows", () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        initialIndex={0}
        onClose={vi.fn()}
      />
    );
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("img", { name: "Interior" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("img", { name: "Engine bay" })).toBeInTheDocument();
  });
});
