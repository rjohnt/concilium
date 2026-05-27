import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Sidebar } from "../Sidebar";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: React.MouseEventHandler;
    [key: string]: unknown;
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

// Mock auth-context
const mockSignOut = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(() => ({
    user: {
      email: "user@example.com",
      user_metadata: { full_name: "Test User" },
    },
    signOut: mockSignOut,
  })),
}));

// Mock store — getTickets returns empty by default
const mockGetTickets = vi.fn(() => []);
vi.mock("@/lib/store", () => ({
  getTickets: (...args: unknown[]) => mockGetTickets(...args),
}));

// Helper to create a mock matchMedia
function mockMatchMedia(matches: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("Sidebar", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame"] });
    // Default to desktop
    window.matchMedia = mockMatchMedia(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // --- Hamburger button tests ---

  it("renders hamburger button with md:hidden class (visible on mobile, hidden on desktop)", () => {
    render(<Sidebar />);
    const hamburger = screen.getByRole("button", { name: "Open sidebar" });
    expect(hamburger).toBeInTheDocument();
    expect(hamburger.className).toContain("md:hidden");
  });

  it("hamburger has aria-expanded=false by default", () => {
    render(<Sidebar />);
    const hamburger = screen.getByRole("button", { name: "Open sidebar" });
    expect(hamburger).toHaveAttribute("aria-expanded", "false");
  });

  it("hamburger has aria-expanded=true when sidebar is open", async () => {
    render(<Sidebar />);
    const hamburger = screen.getByRole("button", { name: "Open sidebar" });
    fireEvent.click(hamburger);
    expect(hamburger).toHaveAttribute("aria-expanded", "true");
  });

  it("hamburger has aria-controls pointing to sidebar-navigation", () => {
    render(<Sidebar />);
    const hamburger = screen.getByRole("button", { name: "Open sidebar" });
    expect(hamburger).toHaveAttribute("aria-controls", "sidebar-navigation");
  });

  // --- Sidebar visibility tests ---

  it("sidebar is hidden on mobile by default (-translate-x-full)", () => {
    render(<Sidebar />);
    const aside = document.getElementById("sidebar-navigation");
    expect(aside).toBeInTheDocument();
    expect(aside!.className).toContain("-translate-x-full");
  });

  it("sidebar becomes visible (translate-x-0) when hamburger is clicked", async () => {
    render(<Sidebar />);
    const hamburger = screen.getByRole("button", { name: "Open sidebar" });
    fireEvent.click(hamburger);

    // Advance animation frame for focus callback
    act(() => {
      vi.advanceTimersByTime(16);
    });

    const aside = document.getElementById("sidebar-navigation");
    expect(aside!.className).toContain("translate-x-0");
  });

  it("sidebar has md:translate-x-0 class (always visible on desktop)", () => {
    render(<Sidebar />);
    const aside = document.getElementById("sidebar-navigation");
    expect(aside!.className).toContain("md:translate-x-0");
  });

  it("sidebar has id='sidebar-navigation'", () => {
    render(<Sidebar />);
    const aside = document.getElementById("sidebar-navigation");
    expect(aside).toBeInTheDocument();
  });

  it("sidebar has overscroll-contain class for iOS", () => {
    render(<Sidebar />);
    const aside = document.getElementById("sidebar-navigation");
    expect(aside!.className).toContain("overscroll-contain");
  });

  // --- Backdrop tests ---

  it("backdrop does not render when sidebar is closed", () => {
    render(<Sidebar />);
    // The backdrop is a fixed inset button; it should not be in the DOM
    const backdrop = document.querySelector("button.fixed.inset-0");
    expect(backdrop).not.toBeInTheDocument();
  });

  it("backdrop renders when sidebar is open", async () => {
    render(<Sidebar />);
    const hamburger = screen.getByRole("button", { name: "Open sidebar" });
    fireEvent.click(hamburger);

    act(() => {
      vi.advanceTimersByTime(16);
    });

    // The backdrop is a fixed inset button
    const backdrop = document.querySelector("button.fixed.inset-0");
    expect(backdrop).toBeInTheDocument();
  });

  it("clicking backdrop closes sidebar", async () => {
    render(<Sidebar />);
    const hamburger = screen.getByRole("button", { name: "Open sidebar" });
    fireEvent.click(hamburger);

    act(() => {
      vi.advanceTimersByTime(16);
    });

    const backdrop = document.querySelector<HTMLButtonElement>("button.fixed.inset-0");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    const aside = document.getElementById("sidebar-navigation");
    expect(aside!.className).toContain("-translate-x-full");
  });

  // --- Close button tests ---

  it("close button renders when sidebar is open", async () => {
    render(<Sidebar />);
    const hamburger = screen.getByRole("button", { name: "Open sidebar" });
    fireEvent.click(hamburger);

    act(() => {
      vi.advanceTimersByTime(16);
    });

    // The X close button is inside the sidebar aside
    const xButton = document.querySelector<HTMLButtonElement>(
      '#sidebar-navigation button[aria-label="Close sidebar"]'
    );
    expect(xButton).toBeInTheDocument();
  });

  it("clicking X close button closes sidebar", async () => {
    render(<Sidebar />);
    const hamburger = screen.getByRole("button", { name: "Open sidebar" });
    fireEvent.click(hamburger);

    act(() => {
      vi.advanceTimersByTime(16);
    });

    const xButton = document.querySelector<HTMLButtonElement>(
      '#sidebar-navigation button[aria-label="Close sidebar"]'
    );
    expect(xButton).not.toBeNull();
    fireEvent.click(xButton!);

    const aside = document.getElementById("sidebar-navigation");
    expect(aside!.className).toContain("-translate-x-full");
  });

  // --- Navigation link tests ---

  it("clicking a nav link closes the sidebar", async () => {
    render(<Sidebar />);
    const hamburger = screen.getByRole("button", { name: "Open sidebar" });
    fireEvent.click(hamburger);

    act(() => {
      vi.advanceTimersByTime(16);
    });

    // Click the Dashboard link
    const dashboardLink = screen.getByText("Dashboard");
    fireEvent.click(dashboardLink);

    const aside = document.getElementById("sidebar-navigation");
    expect(aside!.className).toContain("-translate-x-full");
  });

  // --- Escape key tests ---

  it("pressing Escape closes the sidebar", async () => {
    render(<Sidebar />);
    const hamburger = screen.getByRole("button", { name: "Open sidebar" });
    fireEvent.click(hamburger);

    act(() => {
      vi.advanceTimersByTime(16);
    });

    const aside = document.getElementById("sidebar-navigation");
    expect(aside!.className).toContain("translate-x-0");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(aside!.className).toContain("-translate-x-full");
  });

  it("pressing Escape does nothing when sidebar is closed", () => {
    render(<Sidebar />);
    const aside = document.getElementById("sidebar-navigation");
    const initialClass = aside!.className;

    fireEvent.keyDown(document, { key: "Escape" });

    // Class should be unchanged
    expect(aside!.className).toBe(initialClass);
  });

  // --- Body scroll lock test ---

  it("locks body scroll when sidebar is open", async () => {
    render(<Sidebar />);
    const hamburger = screen.getByRole("button", { name: "Open sidebar" });
    fireEvent.click(hamburger);

    act(() => {
      vi.advanceTimersByTime(16);
    });

    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores body scroll when sidebar is closed", async () => {
    render(<Sidebar />);
    const hamburger = screen.getByRole("button", { name: "Open sidebar" });
    fireEvent.click(hamburger);

    act(() => {
      vi.advanceTimersByTime(16);
    });

    expect(document.body.style.overflow).toBe("hidden");

    // Close via backdrop
    const backdrop = document.querySelector<HTMLButtonElement>("button.fixed.inset-0");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(document.body.style.overflow).toBe("");
  });

  // --- Focus management tests ---

  it("focuses the close button when sidebar opens", async () => {
    render(<Sidebar />);
    const hamburger = screen.getByRole("button", { name: "Open sidebar" });
    fireEvent.click(hamburger);

    // Advance rAF so the focus callback runs
    act(() => {
      vi.advanceTimersByTime(16);
    });

    const xButton = document.querySelector<HTMLButtonElement>(
      '#sidebar-navigation button[aria-label="Close sidebar"]'
    );
    expect(xButton).not.toBeNull();
    expect(document.activeElement).toBe(xButton);
  });

  it("returns focus to hamburger when sidebar closes", async () => {
    render(<Sidebar />);
    const hamburger = screen.getByRole("button", { name: "Open sidebar" });
    fireEvent.click(hamburger);

    act(() => {
      vi.advanceTimersByTime(16);
    });

    // Close via Escape
    fireEvent.keyDown(document, { key: "Escape" });

    expect(document.activeElement).toBe(hamburger);
  });

  // --- Design token test ---

  it("uses text-deep instead of hardcoded color on GitBranch icon", () => {
    render(<Sidebar />);
    const aside = document.getElementById("sidebar-navigation");
    // The GitBranch SVG should have text-deep class
    const svgIcon = aside!.querySelector("svg.text-deep");
    expect(svgIcon).toBeInTheDocument();
  });

  // --- Renders nav items ---

  it("renders all navigation items", () => {
    render(<Sidebar />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("New Ticket")).toBeInTheDocument();
    expect(screen.getByText("VIN Decoder")).toBeInTheDocument();
  });

  // --- Ticket badge tests ---

  it("badge is hidden when no tickets exist", () => {
    mockGetTickets.mockReturnValue([]);
    render(<Sidebar />);
    // The count badge span should not be present
    expect(
      screen.queryByText(/^\d+$/, { selector: "span.min-w-\\[18px\\]" })
    ).not.toBeInTheDocument();
  });

  it("badge renders when tickets exist", () => {
    mockGetTickets.mockReturnValue([{ id: "1", status: "done", updatedAt: new Date().toISOString() }]);
    render(<Sidebar />);
    // The count badge span with class containing min-w-[18px] should show "1"
    const badge = document.querySelector("span.min-w-\\[18px\\]");
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent?.trim()).toBe("1");
  });

  it("badge shows correct ticket count", () => {
    mockGetTickets.mockReturnValue([
      { id: "1", status: "done", updatedAt: new Date().toISOString() },
      { id: "2", status: "draft", updatedAt: new Date().toISOString() },
      { id: "3", status: "in-review", updatedAt: new Date().toISOString() },
    ]);
    render(<Sidebar />);
    const badge = document.querySelector("span.min-w-\\[18px\\]");
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent?.trim()).toBe("3");
  });

  it("active dot renders for active tickets (draft, in-review, consensus)", () => {
    mockGetTickets.mockReturnValue([
      { id: "1", status: "draft", updatedAt: new Date().toISOString() },
    ]);
    render(<Sidebar />);
    // The pulsing dot wrapper is a span with class "relative flex h-2.5 w-2.5"
    const dot = document.querySelector("span.relative.flex.h-2\\.5.w-2\\.5");
    expect(dot).toBeInTheDocument();
  });

  it("active dot is hidden when no active tickets", () => {
    mockGetTickets.mockReturnValue([
      { id: "1", status: "building", updatedAt: new Date().toISOString() },
      { id: "2", status: "done", updatedAt: new Date().toISOString() },
    ]);
    render(<Sidebar />);
    const dot = document.querySelector("span.relative.flex.h-2\\.5.w-2\\.5");
    expect(dot).not.toBeInTheDocument();
  });
});
