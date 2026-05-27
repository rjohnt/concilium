import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeleteTicketDialog } from "../DeleteTicketDialog";

describe("DeleteTicketDialog", () => {
  const defaultProps = {
    isOpen: true,
    ticketTitle: "Dark mode toggle in user settings",
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
  };

  it("renders when open", () => {
    render(<DeleteTicketDialog {...defaultProps} />);
    expect(screen.getByText("Delete Ticket")).toBeInTheDocument();
    // The component uses &ldquo; and &rdquo; which render as \u201C and \u201D
    expect(screen.getByText(/Dark mode toggle in user settings/)).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to delete/)
    ).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<DeleteTicketDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Delete Ticket")).not.toBeInTheDocument();
  });

  it("fires onConfirm callback when Delete button is clicked", () => {
    const onConfirm = vi.fn();
    render(<DeleteTicketDialog {...defaultProps} onConfirm={onConfirm} />);

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("fires onCancel callback when Cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<DeleteTicketDialog {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("fires onCancel callback when X close button is clicked", () => {
    const onCancel = vi.fn();
    render(<DeleteTicketDialog {...defaultProps} onCancel={onCancel} />);

    // The X button is the first button in the dialog (before Cancel and Delete)
    const buttons = screen.getAllByRole("button");
    // buttons: [X close, Cancel, Delete]
    fireEvent.click(buttons[0]);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("displays the correct ticket title", () => {
    render(
      <DeleteTicketDialog {...defaultProps} ticketTitle="API rate limiting fix" />
    );
    expect(screen.getByText(/API rate limiting fix/)).toBeInTheDocument();
  });

  it("fires onCancel when backdrop is clicked", () => {
    const onCancel = vi.fn();
    render(<DeleteTicketDialog {...defaultProps} onCancel={onCancel} />);

    // The backdrop is the absolute-positioned div with onClick={onCancel}
    const backdrop = document.querySelector(".absolute.inset-0");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
