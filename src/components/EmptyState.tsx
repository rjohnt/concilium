"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";

export interface EmptyStateAction {
  label: string;
  href: string;
}

export interface EmptyStateProps {
  /** Lucide icon component to display */
  icon: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description: string;
  /** Optional CTA link below the description */
  action?: EmptyStateAction;
  /** Additional CSS classes for the wrapper card */
  className?: string;
  /** Optional children rendered below the description/action (e.g. custom buttons) */
  children?: React.ReactNode;
}

/**
 * Reusable empty state component.
 * Renders a centered card with a large icon, title, description,
 * and optional CTA link or custom children.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
  children,
}: EmptyStateProps) {
  return (
    <div className={`card text-center py-16 ${className}`}>
      <Icon
        size={48}
        className="text-ink-ghost mx-auto mb-4"
        aria-hidden="true"
      />
      <h3 className="text-lg font-medium text-ink-secondary mb-2">{title}</h3>
      <p className="text-sm text-ink-muted max-w-md mx-auto">{description}</p>

      {action && (
        <Link href={action.href} className="btn-primary inline-flex mt-4">
          {action.label}
        </Link>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
