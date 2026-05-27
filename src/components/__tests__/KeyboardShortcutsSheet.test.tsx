import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { KeyboardShortcutsSheet } from "../KeyboardShortcutsSheet";

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

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("KeyboardShortcutsSheet", () => {
  // ── Visibility ──────────────────────────────────────────────────────
  it("renders the floating button by default", () => {
    render(<KeyboardShortcutsSheet />);
    expect(
      screen.getByRole("button", { name: "Keyboard shortcuts" }),
    ).toBeInTheDocument();
  });

  it("sheet is hidden initially (no dialog in DOM)", () => {
    render(<KeyboardShortcutsSheet />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ── Open via '?' key ────────────────────────────────────────────────
  it('opens the sheet when pressing "?"', () => {
    render(<KeyboardShortcutsSheet />);

    act(() => {
      fireKeyDown("?");
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it('pressing "?" again toggles the sheet closed', () => {
    render(<KeyboardShortcutsSheet />);

    act(() => {
      fireKeyDown("?");
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    act(() => {
      fireKeyDown("?");
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ── Close via Escape ────────────────────────────────────────────────
  it("closes the sheet when pressing Escape", () => {
    render(<KeyboardShortcutsSheet />);

    act(() => {
      fireKeyDown("?");
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    act(() => {
      fireKeyDown("Escape");
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ── Close via backdrop click ────────────────────────────────────────
  it("closes when clicking the backdrop", () => {
    render(<KeyboardShortcutsSheet />);

    act(() => {
      fireKeyDown("?");
    });

    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.parentElement!;

    act(() => {
      fireEvent.click(backdrop);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ── Click on sheet panel does NOT close ─────────────────────────────
  it("does not close when clicking inside the sheet panel", () => {
    render(<KeyboardShortcutsSheet />);

    act(() => {
      fireKeyDown("?");
    });

    const dialog = screen.getByRole("dialog");
    act(() => {
      fireEvent.click(dialog);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // ── '?' ignored when typing in inputs ──────────────────────────────
  it('does NOT open when "?" is pressed while focused in a text input', () => {
    render(
      <>
        <input type="text" data-testid="my-input" placeholder="Type here" />
        <KeyboardShortcutsSheet />
      </>,
    );

    const input = screen.getByTestId("my-input");
    act(() => {
      input.focus();
    });

    act(() => {
      fireKeyDown("?");
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it('does NOT open when "?" is pressed while focused in a textarea', () => {
    render(
      <>
        <textarea data-testid="my-textarea" placeholder="Write here" />
        <KeyboardShortcutsSheet />
      </>,
    );

    const textarea = screen.getByTestId("my-textarea");
    act(() => {
      textarea.focus();
    });

    act(() => {
      fireKeyDown("?");
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it('does NOT open when "?" is pressed while focused in a contentEditable element', () => {
    render(
      <>
        <div data-testid="my-editable" contentEditable suppressContentEditableWarning>
          editable
        </div>
        <KeyboardShortcutsSheet />
      </>,
    );

    const editable = screen.getByTestId("my-editable");
    act(() => {
      editable.focus();
      // jsdom does not set isContentEditable from the attribute alone;
      // define it manually so the isTypingTarget check works.
      Object.defineProperty(editable, "isContentEditable", {
        value: true,
        configurable: true,
      });
    });

    act(() => {
      fireKeyDown("?");
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it('does NOT treat radio/checkbox inputs as typing targets', () => {
    render(
      <>
        <input type="checkbox" data-testid="my-checkbox" />
        <KeyboardShortcutsSheet />
      </>,
    );

    const checkbox = screen.getByTestId("my-checkbox");
    act(() => {
      checkbox.focus();
    });

    act(() => {
      fireKeyDown("?");
    });

    // Radio/checkbox should NOT block the shortcut
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // ── Floating button behavior ────────────────────────────────────────
  it("floating button is clickable and opens the sheet", () => {
    render(<KeyboardShortcutsSheet />);

    const button = screen.getByRole("button", { name: "Keyboard shortcuts" });

    act(() => {
      fireEvent.click(button);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("floating button has pointer-events-none + opacity-0 when sheet is open", () => {
    render(<KeyboardShortcutsSheet />);

    act(() => {
      fireKeyDown("?");
    });

    const button = screen.getByRole("button", { name: "Keyboard shortcuts" });
    expect(button.className).toContain("pointer-events-none");
    expect(button.className).toContain("opacity-0");
  });

  // ── Shortcut groups ─────────────────────────────────────────────────
  it("renders shortcut groups with category headings", () => {
    render(<KeyboardShortcutsSheet />);

    act(() => {
      fireKeyDown("?");
    });

    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Session Prompt")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
  });

  it("renders shortcut descriptions and key hints", () => {
    render(<KeyboardShortcutsSheet />);

    act(() => {
      fireKeyDown("?");
    });

    expect(screen.getByText("Open command palette")).toBeInTheDocument();
    expect(screen.getByText("Submit feedback")).toBeInTheDocument();
    expect(screen.getByText("Toggle this cheat sheet")).toBeInTheDocument();
  });

  it("renders keyboard key labels", () => {
    render(<KeyboardShortcutsSheet />);

    act(() => {
      fireKeyDown("?");
    });

    // Kbd elements are <kbd> tags
    const kbds = document.querySelectorAll("kbd");
    expect(kbds.length).toBeGreaterThan(0);
  });

  // ── ARIA attributes ─────────────────────────────────────────────────
  it("has correct ARIA attributes on the dialog", () => {
    render(<KeyboardShortcutsSheet />);

    act(() => {
      fireKeyDown("?");
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Keyboard shortcuts");
    expect(dialog).toHaveAttribute("aria-describedby", "shortcuts-sheet-footer");
  });

  it("footer hint has the expected id for aria-describedby", () => {
    render(<KeyboardShortcutsSheet />);

    act(() => {
      fireKeyDown("?");
    });

    const footer = document.getElementById("shortcuts-sheet-footer");
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveTextContent(/press.*anytime to toggle/i);
  });

  // ── Close button ────────────────────────────────────────────────────
  it("close X button closes the sheet", () => {
    render(<KeyboardShortcutsSheet />);

    act(() => {
      fireKeyDown("?");
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const closeButton = screen.getByRole("button", {
      name: "Close shortcuts sheet",
    });

    act(() => {
      fireEvent.click(closeButton);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
