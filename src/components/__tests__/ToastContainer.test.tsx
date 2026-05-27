import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastContainer } from "../ToastContainer";
import { ToastProvider } from "../../lib/toast-context";
import { useToast } from "../../lib/toast-context";

// Helper component to trigger toasts from inside the provider
function ToastTrigger({
  messages,
}: {
  messages: Array<{ text: string; type?: "success" | "error" | "info" }>;
}) {
  const { toast } = useToast();
  return (
    <button
      onClick={() =>
        act(() => messages.forEach((m) => toast(m.text, m.type)))
      }
    >
      Trigger Toasts
    </button>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <ToastContainer />
      <ToastTrigger
        messages={[
          { text: "First toast", type: "success" },
          { text: "Second toast", type: "error" },
        ]}
      />
    </ToastProvider>,
  );
}

describe("ToastContainer", () => {
  it("renders nothing when no toasts are present", () => {
    render(
      <ToastProvider>
        <ToastContainer />
      </ToastProvider>,
    );

    // Should not render any toast alerts
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders toasts when present", async () => {
    renderWithProvider();

    act(() => {
      screen.getByText("Trigger Toasts").click();
    });

    expect(await screen.findAllByRole("alert")).toHaveLength(2);
    expect(screen.getByText("First toast")).toBeInTheDocument();
    expect(screen.getByText("Second toast")).toBeInTheDocument();
  });

  it("has aria-live attribute when toasts are present", () => {
    renderWithProvider();

    act(() => {
      screen.getByText("Trigger Toasts").click();
    });

    const container = document.querySelector('[aria-live="polite"]');
    expect(container).toBeInTheDocument();
  });

  it("has aria-label on the container when toasts are present", () => {
    renderWithProvider();

    act(() => {
      screen.getByText("Trigger Toasts").click();
    });

    const container = document.querySelector('[aria-label="Notifications"]');
    expect(container).toBeInTheDocument();
  });
});
