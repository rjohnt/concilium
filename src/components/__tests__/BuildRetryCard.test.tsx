import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BuildRetryCard } from "../BuildRetryCard";

describe("BuildRetryCard", () => {
  it("renders error message when provided", () => {
    render(
      <BuildRetryCard
        errorMessage="Something went wrong"
        isRetrying={false}
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByText("Build Generation Failed")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders default attempt text when not maxed out", () => {
    render(
      <BuildRetryCard buildRetryCount={1} isRetrying={false} onRetry={vi.fn()} />
    );
    expect(screen.getByText("Attempt 1 of 3")).toBeInTheDocument();
  });

  it("renders Retry Build button and calls onRetry on click", () => {
    const onRetry = vi.fn();
    render(<BuildRetryCard isRetrying={false} onRetry={onRetry} />);
    const button = screen.getByText("Retry Build");
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("disables button while retrying", () => {
    render(<BuildRetryCard isRetrying={true} onRetry={vi.fn()} />);
    const button = screen.getByText("Retrying...");
    expect(button).toBeDisabled();
  });

  it("shows spinner and retry-attempt text during retry", () => {
    render(
      <BuildRetryCard buildRetryCount={1} isRetrying={true} onRetry={vi.fn()} />
    );
    expect(
      screen.getByText(/Retrying build\.\.\. Attempt 2 of 3/)
    ).toBeInTheDocument();
  });

  it("shows terminal message and Max Retries Reached after 3 failures", () => {
    const onRetry = vi.fn();
    render(
      <BuildRetryCard buildRetryCount={3} isRetrying={false} onRetry={onRetry} />
    );
    expect(
      screen.getByText("Maximum retry attempts reached")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Max Retries Reached")
    ).toBeInTheDocument();
    const button = screen.getByText("Max Retries Reached");
    expect(button).toBeDisabled();
  });
});
