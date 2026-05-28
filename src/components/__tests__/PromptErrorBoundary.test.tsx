import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PromptErrorBoundary } from "../PromptErrorBoundary";

// Helper component that throws on render
function BrokenComponent({ message }: { message?: string }): never {
  throw new Error(message ?? "Test error from BrokenComponent");
}

// Helper component that throws a non-Error value
function BrokenNonError(): never {
  throw "string error";
}

// Helper to suppress expected console.error during error boundary tests
function suppressConsoleError() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("PromptErrorBoundary", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  // --- Normal rendering ---

  it("renders children when there is no error", () => {
    render(
      <PromptErrorBoundary>
        <div data-testid="child">Safe Content</div>
      </PromptErrorBoundary>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Safe Content")).toBeInTheDocument();
  });

  // --- Error display ---

  it("renders fallback UI when a child throws an error", () => {
    consoleErrorSpy = suppressConsoleError();

    render(
      <PromptErrorBoundary>
        <BrokenComponent message="Something broke badly" />
      </PromptErrorBoundary>
    );

    // Fallback heading
    expect(
      screen.getByText("Session Ran Into an Issue")
    ).toBeInTheDocument();

    // Description text
    expect(
      screen.getByText(/The prompt session encountered an unexpected error/)
    ).toBeInTheDocument();

    // Error message
    expect(screen.getByText("Something broke badly")).toBeInTheDocument();

    // Icon
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  // --- Reset ---

  it("resets error state when 'Try Again' is clicked", () => {
    consoleErrorSpy = suppressConsoleError();

    // We need a way to trigger a reset. We'll use a component that
    // throws once, then renders normally after reset.
    let shouldThrow = true;

    function SometimesBroken() {
      if (shouldThrow) {
        throw new Error("Temporary error");
      }
      return <div data-testid="recovered">All good now</div>;
    }

    const { rerender } = render(
      <PromptErrorBoundary>
        <SometimesBroken />
      </PromptErrorBoundary>
    );

    // Fallback should be showing
    expect(screen.getByText("Session Ran Into an Issue")).toBeInTheDocument();

    // Click "Try Again"
    shouldThrow = false;
    fireEvent.click(screen.getByText("Try Again"));

    // Re-render to pick up the state change
    rerender(
      <PromptErrorBoundary>
        <SometimesBroken />
      </PromptErrorBoundary>
    );

    // Children should now render
    expect(screen.getByTestId("recovered")).toBeInTheDocument();
    expect(screen.getByText("All good now")).toBeInTheDocument();
  });

  // --- Non-Error throws ---

  it("handles throws of non-Error values gracefully", () => {
    consoleErrorSpy = suppressConsoleError();

    render(
      <PromptErrorBoundary>
        <BrokenNonError />
      </PromptErrorBoundary>
    );

    // Fallback should still render
    expect(
      screen.getByText("Session Ran Into an Issue")
    ).toBeInTheDocument();

    // No error.message should be displayed since it was not an Error instance
    // The error message paragraph should not be in the DOM
    const monoElements = document.querySelectorAll(".font-mono");
    expect(monoElements.length).toBe(0);
  });

  // --- console.error logging ---

  it("logs the error to console.error in componentDidCatch", () => {
    consoleErrorSpy = suppressConsoleError();

    render(
      <PromptErrorBoundary>
        <BrokenComponent message="Logged error" />
      </PromptErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalled();

    // Verify at least one argument contains the expected message
    const allCalls = consoleErrorSpy.mock.calls.flat();
    const hasExpectedMessage = allCalls.some(
      (arg: unknown) =>
        typeof arg === "string" &&
        arg.includes("PromptErrorBoundary caught an error:")
    );
    expect(hasExpectedMessage).toBe(true);
  });

  // --- Back to Dashboard link ---

  it("renders a 'Back to Dashboard' link pointing to /", () => {
    consoleErrorSpy = suppressConsoleError();

    render(
      <PromptErrorBoundary>
        <BrokenComponent />
      </PromptErrorBoundary>
    );

    const link = screen.getByRole("link", { name: "Back to Dashboard" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  // --- Custom fallback ---

  it("renders custom fallback when provided", () => {
    consoleErrorSpy = suppressConsoleError();

    render(
      <PromptErrorBoundary
        fallback={<div data-testid="custom-fallback">Custom Error UI</div>}
      >
        <BrokenComponent />
      </PromptErrorBoundary>
    );

    expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
    expect(screen.getByText("Custom Error UI")).toBeInTheDocument();

    // Default fallback should NOT be rendered
    expect(
      screen.queryByText("Session Ran Into an Issue")
    ).not.toBeInTheDocument();
  });
});
