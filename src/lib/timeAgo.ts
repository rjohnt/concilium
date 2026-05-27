/**
 * Formats an ISO date string as a relative time string.
 * Returns values like "just now", "5m ago", "3h ago", "2d ago".
 *
 * @param isoString - ISO 8601 date string
 * @returns Relative time string
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Unknown";
  const seconds = Math.floor(
    (Date.now() - date.getTime()) / 1000
  );
  if (seconds < 0) return "just now";
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/**
 * Returns an absolute date-time string suitable for tooltips.
 * Format: "May 27, 2026, 3:45 PM"
 */
export function formatAbsoluteDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }) + ", " + date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
