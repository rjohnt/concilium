import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "../toast-context";

// Test consumer component that exposes toast API
function ToastConsumer({
  onRender,
}: {
  onRender?: (ctx: ReturnType<typeof useToast>) => void;
}) {
  const ctx = useToast();
  onRender?.(ctx);
  return (
    <div>
      <span data-testid="toast-count">{ctx.toasts.length}</span>
      <button onClick={() => ctx.toast("Hello", "info")}>Add Toast</button>
      <button onClick={() => ctx.toast("Success!", "success")}>
        Add Success
      </button>
      <button onClick={() => ctx.toast("Error!", "error")}>Add Error</button>
      <button
        onClick={() => {
          if (ctx.toasts.length > 0) {
            ctx.dismissToast(ctx.toasts[0].id);
          }
        }}
      >
        Dismiss First
      </button>
    </div>
  );
}

function renderWithProvider() {
  let capturedCtx: ReturnType<typeof useToast> | null = null;
  const result = render(
    <ToastProvider>
      <ToastConsumer onRender={(ctx) => (capturedCtx = ctx)} />
    </ToastProvider>,
  );
  return { ...result, getCtx: () => capturedCtx! };
}

function clickButton(label: string) {
  act(() => {
    screen.getByText(label).click();
  });
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders children", () => {
    render(
      <ToastProvider>
        <div data-testid="child">Child content</div>
      </ToastProvider>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("toast() adds toasts", () => {
    renderWithProvider();
    clickButton("Add Toast");
    expect(screen.getByTestId("toast-count").textContent).toBe("1");
  });

  it("toast() adds multiple toasts", () => {
    renderWithProvider();
    clickButton("Add Toast");
    clickButton("Add Success");
    clickButton("Add Error");
    expect(screen.getByTestId("toast-count").textContent).toBe("3");
  });

  it("dismissToast() removes toasts", () => {
    renderWithProvider();
    clickButton("Add Toast");
    expect(screen.getByTestId("toast-count").textContent).toBe("1");

    clickButton("Dismiss First");
    expect(screen.getByTestId("toast-count").textContent).toBe("0");
  });

  it("auto-dismisses after default 4 seconds", () => {
    renderWithProvider();
    clickButton("Add Toast");
    expect(screen.getByTestId("toast-count").textContent).toBe("1");

    // Advance 4 seconds
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByTestId("toast-count").textContent).toBe("0");
  });

  it("respects custom duration", () => {
    const { getCtx } = renderWithProvider();

    act(() => {
      getCtx().toast("Custom duration", "info", 2000);
    });

    expect(screen.getByTestId("toast-count").textContent).toBe("1");

    // Not dismissed after 1999ms
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(screen.getByTestId("toast-count").textContent).toBe("1");

    // Dismissed after 2000ms
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByTestId("toast-count").textContent).toBe("0");
  });

  it("clears timeout on manual dismiss (no stale timeout leak)", () => {
    renderWithProvider();
    clickButton("Add Toast");
    expect(screen.getByTestId("toast-count").textContent).toBe("1");

    // Manually dismiss before auto-dismiss
    clickButton("Dismiss First");
    expect(screen.getByTestId("toast-count").textContent).toBe("0");

    // Advance past 4s — should NOT attempt to dismiss again (no error)
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId("toast-count").textContent).toBe("0");
  });

  it("throws when useToast is used outside ToastProvider", () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    function BadConsumer() {
      useToast();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow(
      "useToast must be used within a ToastProvider",
    );

    spy.mockRestore();
  });
});
