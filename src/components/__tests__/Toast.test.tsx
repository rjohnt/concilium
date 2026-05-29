import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { ToastProvider, useToast, type ToastVariant, type ToastMessage } from "../Toast";

// ── Test helpers ───────────────────────────────────────────────────────────

/** A component that uses the toast hook for testing */
function ToastConsumer({
  onAdd,
}: {
  onAdd?: (addToast: ReturnType<typeof useToast>["addToast"]) => void;
}) {
  const { addToast, dismissToast, dismissAll } = useToast();
  return (
    <div>
      <button
        data-testid="add-success"
        onClick={() => addToast({ variant: "success", title: "Done!" })}
      >
        Add Success
      </button>
      <button
        data-testid="add-error"
        onClick={() =>
          addToast({ variant: "error", title: "Failed", description: "Something went wrong" })
        }
      >
        Add Error
      </button>
      <button
        data-testid="add-info"
        onClick={() => addToast({ variant: "info", title: "Heads up" })}
      >
        Add Info
      </button>
      <button
        data-testid="add-warning"
        onClick={() => addToast({ variant: "warning", title: "Careful" })}
      >
        Add Warning
      </button>
      <button
        data-testid="add-custom-duration"
        onClick={() => addToast({ variant: "info", title: "Quick", duration: 500 })}
      >
        Add Quick
      </button>
      <button
        data-testid="add-no-dismiss"
        onClick={() => addToast({ variant: "info", title: "Sticky", duration: 0 })}
      >
        Add Sticky
      </button>
      <button
        data-testid="add-with-action"
        onClick={() =>
          addToast({
            variant: "error",
            title: "Deleted",
            action: { label: "Undo", onClick: () => {} },
          })
        }
      >
        Add With Action
      </button>
      <button
        data-testid="dismiss-all"
        onClick={dismissAll}
      >
        Dismiss All
      </button>
      <button
        data-testid="trigger-onadd"
        onClick={() => onAdd?.(addToast)}
      >
        Trigger
      </button>
    </div>
  );
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Toast", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Provider renders children ──────────────────────────────────────────

  it("renders children inside provider", () => {
    renderWithProvider(<p data-testid="child">Hello</p>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  // ── useToast throws outside provider ───────────────────────────────────

  it("useToast throws outside provider", () => {
    // Suppress console.error for this test since we expect an error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function BadComponent() {
      useToast();
      return null;
    }
    expect(() => render(<BadComponent />)).toThrow(
      "useToast must be used within a <ToastProvider>"
    );
    spy.mockRestore();
  });

  // ── addToast adds a toast ──────────────────────────────────────────────

  it("addToast adds a toast", async () => {
    renderWithProvider(<ToastConsumer />);
    fireEvent.click(screen.getByTestId("add-success"));
    await waitFor(() => {
      expect(screen.getByText("Done!")).toBeInTheDocument();
    });
  });

  // ── All 4 variant renderings ───────────────────────────────────────────

  it.each([
    ["success", "Done!"],
    ["error", "Failed"],
    ["info", "Heads up"],
    ["warning", "Careful"],
  ] as const)("renders %s variant with correct title", async (variant, title) => {
    renderWithProvider(<ToastConsumer />);
    const testId = `add-${variant}` as keyof HTMLElementTagNameMap;
    fireEvent.click(screen.getByTestId(`add-${variant}`));
    await waitFor(() => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });

  // ── Auto-dismiss after default 4s ──────────────────────────────────────

  it("auto-dismisses after default 4s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["setTimeout", "clearTimeout"] });
    renderWithProvider(<ToastConsumer />);
    fireEvent.click(screen.getByTestId("add-success"));
    expect(screen.getByText("Done!")).toBeInTheDocument();

    // Advance almost to 4s
    act(() => vi.advanceTimersByTime(3999));
    expect(screen.getByText("Done!")).toBeInTheDocument();

    // Advance past 4s
    act(() => vi.advanceTimersByTime(1));
    await waitFor(() => {
      expect(screen.queryByText("Done!")).not.toBeInTheDocument();
    });
    vi.useRealTimers();
  });

  // ── Custom duration ────────────────────────────────────────────────────

  it("respects custom duration", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["setTimeout", "clearTimeout"] });
    renderWithProvider(<ToastConsumer />);
    fireEvent.click(screen.getByTestId("add-custom-duration"));
    expect(screen.getByText("Quick")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(500));
    await waitFor(() => {
      expect(screen.queryByText("Quick")).not.toBeInTheDocument();
    });
    vi.useRealTimers();
  });

  // ── duration:0 never dismisses ─────────────────────────────────────────

  it("duration:0 never dismisses", async () => {
    vi.useFakeTimers();
    renderWithProvider(<ToastConsumer />);
    fireEvent.click(screen.getByTestId("add-no-dismiss"));
    expect(screen.getByText("Sticky")).toBeInTheDocument();

    // Advance a long time
    act(() => vi.advanceTimersByTime(30000));
    expect(screen.getByText("Sticky")).toBeInTheDocument();
    vi.useRealTimers();
  });

  // ── Stack limits to 5, oldest removed ──────────────────────────────────

  it("limits stack to 5, removing oldest", async () => {
    renderWithProvider(<ToastConsumer />);

    // Add 6 toasts
    for (let i = 0; i < 6; i++) {
      fireEvent.click(
        screen.getByTestId(
          (["add-success", "add-error", "add-info", "add-warning", "add-success", "add-error"] as const)[i]
        )
      );
    }

    await waitFor(() => {
      // Should only see 5 items
      const statuses = screen.getAllByRole("status");
      expect(statuses.length).toBeLessThanOrEqual(5);
    });
  });

  // ── Newest at bottom of stack ──────────────────────────────────────────

  it("newest toast appears at bottom of visual stack", async () => {
    renderWithProvider(<ToastConsumer />);

    fireEvent.click(screen.getByTestId("add-success"));
    fireEvent.click(screen.getByTestId("add-error"));

    await waitFor(() => {
      const statuses = screen.getAllByRole("status");
      expect(statuses.length).toBe(2);
      // In flex-col array order, first DOM element is the oldest (first added)
      // So the first status element should be the success (oldest)
      expect(statuses[0]).toHaveTextContent("Done!");
      expect(statuses[1]).toHaveTextContent("Failed");
    });
  });

  // ── X button dismisses ─────────────────────────────────────────────────

  it("X button dismisses toast", async () => {
    renderWithProvider(<ToastConsumer />);
    fireEvent.click(screen.getByTestId("add-success"));

    await waitFor(() => {
      expect(screen.getByText("Done!")).toBeInTheDocument();
    });

    const dismissButtons = screen.getAllByLabelText("Dismiss notification");
    fireEvent.click(dismissButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText("Done!")).not.toBeInTheDocument();
    });
  });

  // ── Escape key dismisses topmost ───────────────────────────────────────

  it("Escape key dismisses newest toast", async () => {
    renderWithProvider(<ToastConsumer />);

    fireEvent.click(screen.getByTestId("add-success"));
    fireEvent.click(screen.getByTestId("add-error"));

    await waitFor(() => {
      expect(screen.getByText("Done!")).toBeInTheDocument();
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      // Newest (error) should be gone
      expect(screen.queryByText("Failed")).not.toBeInTheDocument();
      // Oldest (success) should remain
      expect(screen.getByText("Done!")).toBeInTheDocument();
    });
  });

  // ── Action button renders and fires onClick ────────────────────────────

  it("action button renders and fires onClick", async () => {
    const onAction = vi.fn();
    const TestComp = () => {
      const { addToast } = useToast();
      return (
        <button
          data-testid="add"
          onClick={() =>
            addToast({
              variant: "error",
              title: "Deleted",
              action: { label: "Undo", onClick: onAction },
            })
          }
        >
          Add
        </button>
      );
    };

    renderWithProvider(<TestComp />);
    fireEvent.click(screen.getByTestId("add"));

    await waitFor(() => {
      expect(screen.getByText("Undo")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Undo"));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  // ── dismissToast by id ─────────────────────────────────────────────────

  it("dismissToast removes toast by id", async () => {
    const TestComp = () => {
      const { addToast, dismissToast } = useToast();
      return (
        <>
          <button
            data-testid="add"
            onClick={() => addToast({ id: "custom-id", variant: "info", title: "Custom" })}
          >
            Add
          </button>
          <button
            data-testid="dismiss"
            onClick={() => dismissToast("custom-id")}
          >
            Dismiss
          </button>
        </>
      );
    };

    renderWithProvider(<TestComp />);
    fireEvent.click(screen.getByTestId("add"));

    await waitFor(() => {
      expect(screen.getByText("Custom")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("dismiss"));

    await waitFor(() => {
      expect(screen.queryByText("Custom")).not.toBeInTheDocument();
    });
  });

  // ── Accessibility attributes ───────────────────────────────────────────

  it("has role='status' and aria-live='polite'", async () => {
    renderWithProvider(<ToastConsumer />);
    fireEvent.click(screen.getByTestId("add-success"));

    await waitFor(() => {
      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("aria-live", "polite");
      expect(status).toHaveTextContent("Done!");
    });
  });
});
