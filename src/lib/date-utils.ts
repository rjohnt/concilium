export interface DueDateInfo {
  label: string;
  className: string;
  isOverdue: boolean;
}

/**
 * Format a due date (ISO string) into a human-readable label with appropriate
 * styling class names. Returns structured data so callers don't need to do
 * fragile string matching to detect overdue status.
 */
export function formatDueDate(dueDate: string): DueDateInfo {
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const diffMs = due - now;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffMs < 0) {
    // Overdue
    const overdueDays = Math.abs(
      Math.floor(diffMs / (1000 * 60 * 60 * 24))
    );
    if (overdueDays === 0) {
      return {
        label: "Overdue today",
        className: "text-cardinal",
        isOverdue: true,
      };
    }
    return {
      label: `Overdue by ${overdueDays}d`,
      className: "text-cardinal",
      isOverdue: true,
    };
  }

  if (diffHours <= 24) {
    return {
      label: `Due in ${diffHours}h`,
      className: "text-gold",
      isOverdue: false,
    };
  }

  return {
    label: `Due in ${diffDays}d`,
    className: "text-ink-muted",
    isOverdue: false,
  };
}
