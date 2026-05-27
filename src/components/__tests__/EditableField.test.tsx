import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditableField } from "../EditableField";

describe("EditableField", () => {
  const defaultProps = {
    value: "Test Title",
    onSave: vi.fn(),
    label: "Title",
  };

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
});
