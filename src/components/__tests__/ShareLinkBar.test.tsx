import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ShareLinkBar } from "../ShareLinkBar";

// Mock qrcode.react to avoid SVG rendering issues in jsdom
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value, size }: { value: string; size: number }) => (
    <div data-testid="qr-code" data-value={value} data-size={size}>
      QR Code
    </div>
  ),
}));

describe("ShareLinkBar", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renders the share URL", () => {
    render(<ShareLinkBar shareUrl="https://example.com/share/abc-123" />);
    expect(
      screen.getByText("https://example.com/share/abc-123")
    ).toBeInTheDocument();
  });

  it("truncates long URLs", () => {
    const longUrl = "https://example.com/share/very-long-id-that-exceeds-50-chars-123456789";
    render(<ShareLinkBar shareUrl={longUrl} />);
    const displayed = screen.getByText(/https:\/\/example\.com\/share\/very-long/);
    expect(displayed.textContent).toContain("...");
  });

  it("renders a QR code", () => {
    render(<ShareLinkBar shareUrl="https://example.com/share/abc-123" />);
    expect(screen.getByTestId("qr-code")).toBeInTheDocument();
  });

  it("renders 'Scan to view on mobile' caption", () => {
    render(<ShareLinkBar shareUrl="https://example.com/share/abc-123" />);
    expect(
      screen.getByText("Scan to view on mobile")
    ).toBeInTheDocument();
  });

  it("renders a CopyButton", async () => {
    render(<ShareLinkBar shareUrl="https://example.com/share/abc-123" />);
    const button = screen.getByRole("button", { name: "Copy share link" });
    expect(button).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <ShareLinkBar
        shareUrl="https://example.com/share/abc-123"
        className="my-custom-bar"
      />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("my-custom-bar");
    expect(card.className).toContain("card");
  });
});
