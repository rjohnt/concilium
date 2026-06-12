import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CommandPalette } from "../CommandPalette";
import { ToastProvider } from "@/components/Toast";

// ── Mocks ────────────────────────────────────────────────────────────────
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/",
}));

// Helper: fire a global keydown event on the window
function fireKeyDown(key: string, opts: Partial<KeyboardEvent> = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  window.dispatchEvent(event);
  return event;
}

function openPalette() {
  act(() => {
    fireKeyDown("k", { metaKey: true, ctrlKey: false });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Clean up any rendered components from previous tests
  document.body.innerHTML = "";
});

describe("CommandPalette", () => {
  // ── Visibility ──────────────────────────────────────────────────────
  it("renders nothing by default (isOpen=false initially)", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ── Open ────────────────────────────────────────────────────────────
  it("opens on Meta+K", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);

    act(() => {
      fireKeyDown("k", { metaKey: true, ctrlKey: false });
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens on Ctrl+K", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);

    act(() => {
      fireKeyDown("k", { metaKey: false, ctrlKey: true });
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // ── Close ───────────────────────────────────────────────────────────
  it("closes on Escape", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    act(() => {
      fireKeyDown("Escape");
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on backdrop click", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    // The backdrop is the outermost div with the click handler
    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.parentElement!;

    act(() => {
      fireEvent.click(backdrop);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ── ARIA ────────────────────────────────────────────────────────────
  it("has correct ARIA attributes", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Command palette");
  });

  it("input has aria-activedescendant pointing to selected command", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    const input = screen.getByPlaceholderText("Search tickets or run a command…");
    // First command should be selected by default
    expect(input).toHaveAttribute("aria-activedescendant", "command-0");
  });

  it("command items have role='option' and aria-selected", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);

    // First item selected by default
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[1]).toHaveAttribute("aria-selected", "false");
  });

  // ── Keyboard navigation ─────────────────────────────────────────────
  it("navigates with ArrowDown", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    act(() => {
      fireKeyDown("ArrowDown");
    });

    const options = screen.getAllByRole("option");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(options[0]).toHaveAttribute("aria-selected", "false");
  });

  it("navigates with ArrowUp", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    // ArrowDown then ArrowUp should go back to first
    act(() => { fireKeyDown("ArrowDown"); });
    act(() => { fireKeyDown("ArrowUp"); });

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
  });

  it("wraps around at boundaries (ArrowDown past last → first)", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    const options = screen.getAllByRole("option");

    // Press ArrowDown enough times to wrap
    act(() => {
      for (let i = 0; i < options.length; i++) {
        fireKeyDown("ArrowDown");
      }
    });

    expect(options[0]).toHaveAttribute("aria-selected", "true");
  });

  it("wraps around at boundaries (ArrowUp past first → last)", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    const options = screen.getAllByRole("option");

    act(() => {
      fireKeyDown("ArrowUp");
    });

    expect(options[options.length - 1]).toHaveAttribute("aria-selected", "true");
  });

  it("Enter navigates to selected command", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    act(() => {
      fireKeyDown("Enter");
    });

    // First command is "Go to Dashboard" → href "/"
    expect(mockPush).toHaveBeenCalledWith("/");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ── Focus trap ──────────────────────────────────────────────────────
  it("Tab from input moves focus to first command", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    const input = screen.getByPlaceholderText("Search tickets or run a command…");

    act(() => {
      input.focus();
    });

    act(() => {
      fireKeyDown("Tab");
    });

    const firstCommand = document.getElementById("command-0");
    expect(document.activeElement).toBe(firstCommand);
  });

  it("Shift+Tab wraps from input to last command", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    const input = screen.getByPlaceholderText("Search tickets or run a command…");

    act(() => {
      input.focus();
    });

    act(() => {
      fireKeyDown("Tab", { shiftKey: true });
    });

    const commands = screen.getAllByRole("option");
    const lastCommand = document.getElementById(`command-${commands.length - 1}`);
    expect(document.activeElement).toBe(lastCommand);
  });

  it("Tab from last command wraps back to input", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    const commands = screen.getAllByRole("option");
    const lastCommand = document.getElementById(`command-${commands.length - 1}`)!;

    act(() => {
      lastCommand.focus();
    });

    act(() => {
      fireKeyDown("Tab");
    });

    expect(document.activeElement?.id).toBe("palette-input");
  });

  // ── Search filtering ────────────────────────────────────────────────
  it("search filtering works (case-insensitive)", async () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    const input = screen.getByPlaceholderText("Search tickets or run a command…");

    await act(async () => {
      fireEvent.change(input, { target: { value: "new" } });
    });

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("New Ticket");
  });

  it("shows empty state for no match", async () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    const input = screen.getByPlaceholderText("Search tickets or run a command…");

    await act(async () => {
      fireEvent.change(input, { target: { value: "zzz_nonexistent" } });
    });

    expect(screen.getByText(/No tickets or commands match/)).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  // ── Command hints ───────────────────────────────────────────────────
  it("shows kbd hints for commands", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    // Each command has a shortcut displayed as a <kbd> element
    const kbds = screen.getAllByText(/⌘/);
    expect(kbds.length).toBeGreaterThan(0);

    expect(screen.getByText("⌘1")).toBeInTheDocument();
    expect(screen.getByText("⌘N")).toBeInTheDocument();
  });

  // ── Click navigation ────────────────────────────────────────────────
  it("click on a command navigates", () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    const newTicketButton = screen.getByText("New Ticket");

    act(() => {
      fireEvent.click(newTicketButton);
    });

    expect(mockPush).toHaveBeenCalledWith("/new");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ── Reset on open ──────────────────────────────────────────────────
  it("resets query and selection when reopened", async () => {
    render(<ToastProvider><CommandPalette /></ToastProvider>);
    openPalette();

    const input = screen.getByPlaceholderText("Search tickets or run a command…");

    // Type something and navigate
    await act(async () => {
      fireEvent.change(input, { target: { value: "vin" } });
    });
    act(() => { fireKeyDown("ArrowDown"); });

    // Close
    act(() => { fireKeyDown("Escape"); });

    // Reopen
    openPalette();

    const newInput = screen.getByPlaceholderText("Search tickets or run a command…");
    expect(newInput).toHaveValue("");
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
  });
});
