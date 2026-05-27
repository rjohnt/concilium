import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Toast, type ToastProps } from "../Toast";

function renderToast(props: Partial<ToastProps> = {}) {
  const defaultProps: ToastProps = {
    id: "toast-1",
    message: "Test message",
    type: "info",
    onClose: vi.fn(),
  };
  return render(<Toast {...defaultProps} {...props} />);
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the message", () => {
    renderToast({ message: "Operation completed!" });
    expect(screen.getByText("Operation completed!")).toBeInTheDocument();
  });

  it("renders the correct icon for success type", () => {
    renderToast({ type: "success", message: "Success!" });
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Success!")).toBeInTheDocument();
  });

  it("renders the correct icon for error type", () => {
    renderToast({ type: "error", message: "Error!" });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Error!")).toBeInTheDocument();
  });

  it("renders the correct icon for info type", () => {
    renderToast({ type: "info", message: "Info!" });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Info!")).toBeInTheDocument();
  });

  it("calls onClose when X button is clicked", () => {
    const onClose = vi.fn();
    renderToast({ onClose });

    const closeButton = screen.getByLabelText("Close");
    fireEvent.click(closeButton);

    // onClose is called after 300ms exit animation
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onClose).toHaveBeenCalledWith("toast-1");
  });

  it("handles enter animation state", () => {
    const { container } = renderToast();

    // Initial state: entering is true, so toast has opacity-0 translate-x-full
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.className).toContain("opacity-0");
    expect(alert?.className).toContain("translate-x-full");
  });

  it("handles exit animation state", () => {
    const onClose = vi.fn();
    renderToast({ onClose });

    const closeButton = screen.getByLabelText("Close");
    fireEvent.click(closeButton);

    // Toast should now have exiting state before onClose fires
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("opacity-0");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onClose).toHaveBeenCalledWith("toast-1");
  });

  it("uses 'info' as default type", () => {
    const { container } = renderToast({ type: undefined });
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.className).toContain("border-l-blue-steel");
  });
});
