"use client";

import React from "react";

// === Skeleton Primitives ===

type SkeletonTextProps = {
  /** Number of text lines to render */
  lines?: number;
  /** Width classes for each line (e.g., 'full', '3/4', '1/2').
   *  If fewer widths than lines, the last width is reused. */
  widths?: string[];
  className?: string;
};

function widthClass(w: string): string {
  switch (w) {
    case "full":
      return "w-full";
    case "3/4":
      return "w-3/4";
    case "1/2":
      return "w-1/2";
    case "1/3":
      return "w-1/3";
    case "2/3":
      return "w-2/3";
    case "1/4":
      return "w-1/4";
    case "5/6":
      return "w-5/6";
    default:
      return w; // allow arbitrary Tailwind classes
  }
}

export function SkeletonText({
  lines = 3,
  widths = ["full", "3/4", "1/2"],
  className = "",
}: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-elevated rounded animate-pulse ${widthClass(
            widths[i] ?? widths[widths.length - 1]
          )}`}
        />
      ))}
    </div>
  );
}

type SkeletonAvatarProps = {
  /** Size variant */
  size?: "sm" | "md" | "lg";
  className?: string;
};

const avatarSizes: Record<string, string> = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
};

export function SkeletonAvatar({
  size = "md",
  className = "",
}: SkeletonAvatarProps) {
  return (
    <div
      aria-hidden="true"
      className={`${avatarSizes[size]} rounded-full bg-elevated animate-pulse ${className}`}
    />
  );
}

// === Page-level Skeletons ===

/**
 * Skeleton placeholder matching the TicketCard layout:
 * - Title bar row (id badge + status badge + copy button area)
 * - Title line
 * - 2 description lines
 * - Progress bar area
 * - Persona avatars row + stats
 */
export function SkeletonCard() {
  return (
    <div className="card relative" aria-hidden="true">
      {/* CopyButton skeleton area (abs-positioned to match TicketCard) */}
      <div className="absolute top-3 right-3 h-6 w-6 bg-elevated rounded animate-pulse" />

      {/* Top row: ID + status badge */}
      <div className="flex items-center gap-2 mb-1">
        <div className="h-4 w-16 bg-elevated rounded animate-pulse" />
        <div className="h-5 w-16 bg-elevated rounded-full animate-pulse" />
      </div>

      {/* Title */}
      <div className="h-6 w-2/3 bg-elevated rounded animate-pulse mt-2" />

      {/* Description lines */}
      <div className="mt-1.5 space-y-1.5">
        <div className="h-4 w-full bg-elevated rounded animate-pulse" />
        <div className="h-4 w-4/5 bg-elevated rounded animate-pulse" />
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="h-3 w-16 bg-elevated rounded animate-pulse" />
          <div className="h-3 w-8 bg-elevated rounded animate-pulse" />
        </div>
        <div className="h-1.5 bg-elevated rounded-full animate-pulse" />
      </div>

      {/* Persona avatars row + stats */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex -space-x-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonAvatar key={i} size="sm" className="ring-2 ring-deep" />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3 w-10 bg-elevated rounded animate-pulse" />
          <div className="h-3 w-12 bg-elevated rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard skeleton: stats row + multiple skeleton ticket cards.
 */
export function DashboardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="max-w-5xl mx-auto" aria-hidden="true">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-elevated rounded animate-pulse" />
          <div className="h-4 w-64 bg-elevated rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-elevated rounded-lg animate-pulse" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-elevated animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-7 w-8 bg-elevated rounded animate-pulse" />
              <div className="h-3 w-20 bg-elevated rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Ticket cards skeleton */}
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Detail page skeleton: breadcrumb + persona bar + ticket header + consensus + feedback area.
 */
export function DetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto" aria-hidden="true">
      {/* Breadcrumb */}
      <div className="h-5 w-36 bg-elevated rounded animate-pulse mb-6" />

      {/* Persona indicator bar */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-raised/60 border border-border-subtle">
        <div className="w-8 h-8 rounded-full bg-elevated animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-40 bg-elevated rounded animate-pulse" />
          <div className="h-3 w-56 bg-elevated rounded animate-pulse" />
        </div>
        <div className="h-8 w-20 bg-elevated rounded-lg animate-pulse" />
      </div>

      {/* Ticket header card */}
      <div className="card mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            {/* ID + status badge row */}
            <div className="flex items-center gap-3">
              <div className="h-4 w-16 bg-elevated rounded animate-pulse" />
              <div className="h-5 w-20 bg-elevated rounded-full animate-pulse" />
            </div>

            {/* Title */}
            <div className="h-7 w-2/3 bg-elevated rounded animate-pulse" />

            {/* Description */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-elevated rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-elevated rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-elevated rounded animate-pulse" />
            </div>

            {/* Date meta */}
            <div className="flex items-center gap-4">
              <div className="h-3 w-32 bg-elevated rounded animate-pulse" />
              <div className="h-3 w-36 bg-elevated rounded animate-pulse" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-start gap-2 flex-shrink-0">
            <div className="flex flex-col items-end gap-2">
              <div className="h-8 w-8 bg-elevated rounded-lg animate-pulse" />
              <div className="h-9 w-36 bg-elevated rounded-lg animate-pulse" />
            </div>
            <div className="h-8 w-8 bg-elevated rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Consensus progress card */}
      <div className="card mb-6">
        <div className="space-y-3">
          <div className="h-5 w-40 bg-elevated rounded animate-pulse" />
          <div className="h-2 w-full bg-elevated rounded-full animate-pulse" />
          <div className="flex -space-x-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonAvatar key={i} size="sm" className="ring-2 ring-deep" />
            ))}
          </div>
        </div>
      </div>

      {/* Feedback panel skeleton */}
      <div className="card">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <SkeletonAvatar size="md" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-24 bg-elevated rounded animate-pulse" />
              <div className="h-3 w-36 bg-elevated rounded animate-pulse" />
            </div>
          </div>
          <div className="h-24 w-full bg-elevated rounded animate-pulse" />
          <div className="flex justify-end">
            <div className="h-9 w-24 bg-elevated rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Prompt session page skeleton.
 */
export function PromptSessionSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-deep" aria-hidden="true">
      {/* Top bar */}
      <header className="flex-shrink-0 border-b border-border-subtle bg-raised/80 backdrop-blur-sm">
        <div className="flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-4">
            <div className="h-5 w-28 bg-elevated rounded animate-pulse" />
            <div className="h-5 w-px bg-border-subtle" />
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 bg-elevated rounded animate-pulse" />
              <div className="h-4 w-40 bg-elevated rounded animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-32 bg-elevated rounded-lg animate-pulse" />
        </div>
      </header>

      {/* Content area: two-panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="w-80 lg:w-96 flex-shrink-0 border-r border-border-subtle bg-base/40 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="h-6 w-32 bg-elevated rounded-full animate-pulse" />
              <div className="h-5 w-full bg-elevated rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-elevated rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-elevated rounded animate-pulse" />
              <div className="flex items-center gap-3">
                <div className="h-3 w-24 bg-elevated rounded animate-pulse" />
                <div className="h-3 w-28 bg-elevated rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-5 w-36 bg-elevated rounded animate-pulse" />
              <div className="h-2 w-full bg-elevated rounded-full animate-pulse" />
              <div className="flex -space-x-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonAvatar
                    key={i}
                    size="sm"
                    className="ring-2 ring-deep"
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-elevated/40 border border-border-subtle"
                >
                  <div className="h-3 w-16 bg-elevated rounded animate-pulse mb-2" />
                  <div className="h-7 w-8 bg-elevated rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-elevated animate-pulse" />
            <div className="h-6 w-32 mx-auto bg-elevated rounded animate-pulse" />
            <div className="h-4 w-64 mx-auto bg-elevated rounded animate-pulse" />
            <div className="h-9 w-36 mx-auto bg-elevated rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
