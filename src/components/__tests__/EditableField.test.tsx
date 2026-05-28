import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { EditableField } from "../EditableField";

describe("EditableField", () => {
  const defaultProps = {
    value: "Test Title",
    onSave: vi.fn(),
    label: "Title",
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders in display mode with the value", () => {
    render(<EditableField {...defaultProps} />);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Edit Title")).toBeInTheDocument();
  });

  it("renders placeholder when value is empty", () => {
    render(
      <EditableField
        {...defaultProps}
        value=""
        placeholder="No title set"
      />
    );
    expect(screen.getByText("No title set")).toBeInTheDocument();
  });

  it("enters edit mode when the pencil button is clicked", () => {
    render(<EditableField {...defaultProps} />);

    const editButton = screen.getByLabelText("Edit Title");
    fireEvent.click(editButton);

    // Should now show Save and Cancel buttons
    expect(screen.getByLabelText("Save Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Cancel editing Title")).toBeInTheDocument();
  });

  it("saves via Enter key and calls onSave", () => {
    const onSave = vi.fn();
    render(<EditableField {...defaultProps} onSave={onSave} />);

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Title"));

    // Change the value
    const input = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "New Title" } });

    // Press Enter to save
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSave).toHaveBeenCalledWith("New Title");
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("cancels via Escape key without calling onSave", () => {
    const onSave = vi.fn();
    render(<EditableField {...defaultProps} onSave={onSave} value="Original" />);

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Title"));

    // Change the value
    const input = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Changed" } });

    // Press Escape to cancel
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onSave).not.toHaveBeenCalled();
    // Should be back in display mode showing original value
    expect(screen.getByText("Original")).toBeInTheDocument();
  });

  it("cancels via Cancel button click without calling onSave", () => {
    const onSave = vi.fn();
    render(<EditableField {...defaultProps} onSave={onSave} value="Original" />);

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Title"));

    // Change the value
    const input = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Changed" } });

    // Click Cancel
    fireEvent.click(screen.getByLabelText("Cancel editing Title"));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Original")).toBeInTheDocument();
  });

  it("prevents saving empty value and shows error message", () => {
    const onSave = vi.fn();
    render(<EditableField {...defaultProps} onSave={onSave} label="Title" />);

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Title"));

    // Clear the field
    const input = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });

    // Try to save
    fireEvent.click(screen.getByLabelText("Save Title"));

    // Should not call onSave
    expect(onSave).not.toHaveBeenCalled();
    // Should still be in edit mode (Cancel button still visible)
    expect(screen.getByLabelText("Cancel editing Title")).toBeInTheDocument();
    // Should show error
    expect(screen.getByRole("alert")).toHaveTextContent("Title cannot be empty");
  });

  it("clears error message when user starts typing again", () => {
    const onSave = vi.fn();
    render(<EditableField {...defaultProps} onSave={onSave} label="Title" />);

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Title"));

    // Clear the field and try to save
    const input = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByLabelText("Save Title"));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Start typing again
    fireEvent.change(input, { target: { value: "New text" } });

    // Error should disappear
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("syncs draft when external value changes", () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <EditableField {...defaultProps} onSave={onSave} value="Initial" />
    );

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Title"));
    const input = screen.getByLabelText("Title") as HTMLInputElement;
    expect(input.value).toBe("Initial");

    // External value changes
    rerender(
      <EditableField {...defaultProps} onSave={onSave} value="Updated External" />
    );

    // Draft should sync
    expect(input.value).toBe("Updated External");
  });

  it("saves via Save button click", () => {
    const onSave = vi.fn();
    render(<EditableField {...defaultProps} onSave={onSave} value="Old" />);

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Title"));

    const input = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "New Value" } });

    fireEvent.click(screen.getByLabelText("Save Title"));

    expect(onSave).toHaveBeenCalledWith("New Value");
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("does not call onSave when value hasn't changed", () => {
    const onSave = vi.fn();
    render(<EditableField {...defaultProps} onSave={onSave} value="Same" />);

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Title"));

    // Don't change anything and save
    fireEvent.click(screen.getByLabelText("Save Title"));

    expect(onSave).not.toHaveBeenCalled();
  });

  it("renders textarea when type is textarea", () => {
    render(<EditableField {...defaultProps} type="textarea" label="Description" />);

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Description"));

    // Should be a textarea, not input
    const textarea = screen.getByLabelText("Description") as HTMLTextAreaElement;
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("calls onSave via Enter in input mode", () => {
    const onSave = vi.fn();
    render(<EditableField {...defaultProps} onSave={onSave} type="input" label="Title" />);

    fireEvent.click(screen.getByLabelText("Edit Title"));

    const input = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Enter Save" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    expect(onSave).toHaveBeenCalledWith("Enter Save");
  });

  it("Shift+Enter in textarea inserts newline instead of saving", () => {
    const onSave = vi.fn();
    render(
      <EditableField
        {...defaultProps}
        onSave={onSave}
        type="textarea"
        label="Description"
        value="Old desc"
      />
    );

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Description"));

    const textarea = screen.getByLabelText("Description") as HTMLTextAreaElement;
    // Set a value with a newline
    fireEvent.change(textarea, { target: { value: "Line 1\nLine 2" } });

    // onSave should NOT have been called (newline is Shift+Enter behavior, but fireEvent.change
    // just sets value; the real test is that Shift+Enter doesn't trigger save)
    // Simulate Shift+Enter keydown — should NOT call onSave
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("uses the provided className and displayClassName", () => {
    const { container } = render(
      <EditableField
        {...defaultProps}
        className="custom-wrapper"
        displayClassName="custom-display"
      />
    );

    // The wrapper div in display mode should have the className
    expect(container.querySelector(".custom-wrapper")).toBeInTheDocument();
    expect(container.querySelector(".custom-display")).toBeInTheDocument();
  });

  // ─── Auto-save tests (DEV-73) ───────────────────────────────────────────

  it("auto-saves after 1500ms of inactivity while editing", () => {
    const onSave = vi.fn();
    render(<EditableField {...defaultProps} onSave={onSave} value="Initial" />);

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Title"));

    // Type a new value
    const input = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Auto saved value" } });

    // Auto-save should NOT have fired yet
    expect(onSave).not.toHaveBeenCalled();

    // Advance timers by 1500ms
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Now auto-save should have fired
    expect(onSave).toHaveBeenCalledWith("Auto saved value");
    expect(onSave).toHaveBeenCalledTimes(1);

    // Should still be in edit mode (Save/Cancel buttons visible)
    expect(screen.getByLabelText("Save Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Cancel editing Title")).toBeInTheDocument();
  });

  it("does not auto-save if value unchanged from last save", () => {
    const onSave = vi.fn();
    render(<EditableField {...defaultProps} onSave={onSave} value="Same Value" />);

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Title"));

    // Type the same value
    const input = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Same Value" } });

    // Advance timers
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Auto-save should NOT have fired (draft === initialValueRef.current)
    expect(onSave).not.toHaveBeenCalled();
  });

  it("debounce resets while typing — auto-save only fires after last keystroke + 1500ms", () => {
    const onSave = vi.fn();
    render(<EditableField {...defaultProps} onSave={onSave} value="Initial" />);

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Title"));
    const input = screen.getByLabelText("Title") as HTMLInputElement;

    // Type first character
    fireEvent.change(input, { target: { value: "A" } });
    // Advance 500ms (not enough)
    act(() => { vi.advanceTimersByTime(500); });
    expect(onSave).not.toHaveBeenCalled();

    // Type second character (resets debounce)
    fireEvent.change(input, { target: { value: "Ab" } });
    // Advance another 500ms (1000ms total, still not enough since debounce reset)
    act(() => { vi.advanceTimersByTime(500); });
    expect(onSave).not.toHaveBeenCalled();

    // Type third character
    fireEvent.change(input, { target: { value: "Abc" } });
    // Advance 1500ms from last keystroke
    act(() => { vi.advanceTimersByTime(1500); });

    // Now auto-save should fire with final value
    expect(onSave).toHaveBeenCalledWith("Abc");
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("explicit save clears pending auto-save timer", () => {
    const onSave = vi.fn();
    render(<EditableField {...defaultProps} onSave={onSave} value="Initial" />);

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Title"));
    const input = screen.getByLabelText("Title") as HTMLInputElement;

    // Type a value — auto-save timer starts
    fireEvent.change(input, { target: { value: "Saved manually" } });

    // Explicitly save before timer fires (advance only 500ms)
    act(() => { vi.advanceTimersByTime(500); });
    fireEvent.click(screen.getByLabelText("Save Title"));

    // Explicit save should have been called once
    expect(onSave).toHaveBeenCalledWith("Saved manually");
    expect(onSave).toHaveBeenCalledTimes(1);

    // Advance past 1500ms — auto-save should NOT fire again
    act(() => { vi.advanceTimersByTime(1500); });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("cancel clears pending auto-save timer", () => {
    const onSave = vi.fn();
    render(<EditableField {...defaultProps} onSave={onSave} value="Original" />);

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Title"));
    const input = screen.getByLabelText("Title") as HTMLInputElement;

    // Type a value
    fireEvent.change(input, { target: { value: "Should not save" } });

    // Cancel before timer fires
    act(() => { vi.advanceTimersByTime(500); });
    fireEvent.click(screen.getByLabelText("Cancel editing Title"));

    // Advance past 1500ms — auto-save should NOT fire
    act(() => { vi.advanceTimersByTime(1500); });
    expect(onSave).not.toHaveBeenCalled();

    // Should be back in display mode with original value
    expect(screen.getByText("Original")).toBeInTheDocument();
  });

  it("auto-save keeps edit mode active (does not exit to display)", () => {
    const onSave = vi.fn();
    render(<EditableField {...defaultProps} onSave={onSave} value="Initial" />);

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Title"));
    const input = screen.getByLabelText("Title") as HTMLInputElement;

    // Change value
    fireEvent.change(input, { target: { value: "Still editing" } });

    // Trigger auto-save
    act(() => { vi.advanceTimersByTime(1500); });

    expect(onSave).toHaveBeenCalledWith("Still editing");

    // Should STILL be in edit mode (Save button still visible)
    expect(screen.getByLabelText("Save Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Cancel editing Title")).toBeInTheDocument();

    // The input should still hold the draft
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Still editing");
  });

  it("auto-save works for textarea type", () => {
    const onSave = vi.fn();
    render(
      <EditableField
        {...defaultProps}
        onSave={onSave}
        type="textarea"
        label="Description"
        value="Old description"
      />
    );

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Description"));
    const textarea = screen.getByLabelText("Description") as HTMLTextAreaElement;

    // Change value
    fireEvent.change(textarea, { target: { value: "New auto-saved description" } });

    // Trigger auto-save
    act(() => { vi.advanceTimersByTime(1500); });

    expect(onSave).toHaveBeenCalledWith("New auto-saved description");
    expect(onSave).toHaveBeenCalledTimes(1);

    // Should still be in edit mode
    expect(screen.getByLabelText("Save Description")).toBeInTheDocument();
  });

  it("does not auto-save empty value", () => {
    const onSave = vi.fn();
    render(<EditableField {...defaultProps} onSave={onSave} value="Initial" />);

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Title"));
    const input = screen.getByLabelText("Title") as HTMLInputElement;

    // Clear the field
    fireEvent.change(input, { target: { value: "" } });

    // Advance timers
    act(() => { vi.advanceTimersByTime(1500); });

    // Auto-save should NOT fire for empty value
    expect(onSave).not.toHaveBeenCalled();

    // Should still be in edit mode
    expect(screen.getByLabelText("Save Title")).toBeInTheDocument();
  });

  it("cleanup on unmount clears auto-save timer", () => {
    const onSave = vi.fn();
    const { unmount } = render(
      <EditableField {...defaultProps} onSave={onSave} value="Initial" />
    );

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit Title"));
    const input = screen.getByLabelText("Title") as HTMLInputElement;

    // Type a value — auto-save timer starts
    fireEvent.change(input, { target: { value: "Should not auto-save after unmount" } });

    // Unmount before timer fires
    unmount();

    // Advance timers past 1500ms
    act(() => { vi.advanceTimersByTime(1500); });

    // Auto-save should NOT have fired (component is unmounted, timer was cleared)
    expect(onSave).not.toHaveBeenCalled();
  });
});
