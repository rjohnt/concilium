"use client";

import { AlertTriangle, X } from "lucide-react";

interface DeleteTicketDialogProps {
  isOpen: boolean;
  ticketTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteTicketDialog({
  isOpen,
  ticketTitle,
  onCancel,
  onConfirm,
}: DeleteTicketDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-raised border border-border-visible rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cardinal/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-cardinal" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-ink-primary mb-1">
              Delete Ticket
            </h3>
            <p className="text-sm text-ink-secondary">
              Are you sure you want to delete{" "}
              <span className="font-medium text-ink-primary">
                &ldquo;{ticketTitle}&rdquo;
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="flex-shrink-0 p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-elevated transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-cardinal text-white hover:bg-cardinal/90 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
