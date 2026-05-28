"use client";

import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiffSegment {
  type: "equal" | "added" | "removed";
  text: string;
}

interface DiffViewProps {
  oldText: string;
  newText: string;
  /** When true, render side-by-side (for longer texts). Default: auto-detect */
  sideBySide?: boolean;
  /** Label for the "old" column in side-by-side mode */
  oldLabel?: string;
  /** Label for the "new" column in side-by-side mode */
  newLabel?: string;
}

// ---------------------------------------------------------------------------
// Word-level diff algorithm (simple LCS-based)
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  // Split on word boundaries while keeping whitespace tokens
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

function backtrackDiff(
  a: string[],
  b: string[],
  dp: number[][]
): DiffSegment[] {
  const result: DiffSegment[] = [];
  let i = a.length;
  let j = b.length;

  const reversed: DiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      reversed.push({ type: "equal", text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      reversed.push({ type: "added", text: b[j - 1] });
      j--;
    } else if (i > 0) {
      reversed.push({ type: "removed", text: a[i - 1] });
      i--;
    }
  }

  // Reverse to get forward order
  for (let k = reversed.length - 1; k >= 0; k--) {
    result.push(reversed[k]);
  }

  // Merge adjacent equal segments
  return mergeSegments(result);
}

function mergeSegments(segments: DiffSegment[]): DiffSegment[] {
  const merged: DiffSegment[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (last && last.type === seg.type) {
      last.text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

function wordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);
  const lcs = computeLCS(oldTokens, newTokens);
  return backtrackDiff(oldTokens, newTokens, lcs);
}

function isShort(text: string): boolean {
  return text.length < 300 && text.split("\n").length <= 3;
}

// ---------------------------------------------------------------------------
// Unified inline diff
// ---------------------------------------------------------------------------

function UnifiedDiff({ oldText, newText }: DiffViewProps) {
  const segments = useMemo(() => wordDiff(oldText, newText), [oldText, newText]);

  if (segments.length === 0) {
    return (
      <p className="text-sm text-ink-muted italic">No differences found.</p>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-elevated border border-border-subtle text-sm leading-relaxed whitespace-pre-wrap break-words">
      {segments.map((seg, i) => {
        if (seg.type === "added") {
          return (
            <span
              key={i}
              className="bg-olive/20 text-olive font-medium"
            >
              {seg.text}
            </span>
          );
        }
        if (seg.type === "removed") {
          return (
            <span
              key={i}
              className="bg-cardinal/20 text-cardinal line-through"
            >
              {seg.text}
            </span>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Side-by-side diff
// ---------------------------------------------------------------------------

function SideBySideDiff({
  oldText,
  newText,
  oldLabel = "Previous",
  newLabel = "Current",
}: DiffViewProps) {
  const segments = useMemo(() => wordDiff(oldText, newText), [oldText, newText]);

  if (segments.length === 0) {
    return (
      <p className="text-sm text-ink-muted italic col-span-2">
        No differences found.
      </p>
    );
  }

  // Split segments into left (old) and right (new) views
  const oldSegments: DiffSegment[] = [];
  const newSegments: DiffSegment[] = [];

  for (const seg of segments) {
    if (seg.type === "equal") {
      oldSegments.push({ type: "equal", text: seg.text });
      newSegments.push({ type: "equal", text: seg.text });
    } else if (seg.type === "removed") {
      oldSegments.push({ type: "removed", text: seg.text });
    } else if (seg.type === "added") {
      newSegments.push({ type: "added", text: seg.text });
    }
  }

  return (
    <div
      className="grid grid-cols-2 gap-0 border border-border-subtle rounded-lg overflow-hidden text-sm leading-relaxed"
      style={{ minHeight: "3rem" }}
    >
      {/* Left column (old) */}
      <div className="border-r border-border-subtle">
        <div className="px-3 py-1.5 bg-raised border-b border-border-subtle text-xs font-semibold text-ink-muted uppercase tracking-wider">
          {oldLabel}
        </div>
        <div className="p-3 whitespace-pre-wrap break-words bg-cardinal/[0.04] min-h-[3rem]">
          {oldSegments.map((seg, i) => {
            if (seg.type === "removed") {
              return (
                <span
                  key={i}
                  className="bg-cardinal/20 text-cardinal line-through"
                >
                  {seg.text}
                </span>
              );
            }
            return <span key={i}>{seg.text}</span>;
          })}
        </div>
      </div>

      {/* Right column (new) */}
      <div>
        <div className="px-3 py-1.5 bg-raised border-b border-border-subtle text-xs font-semibold text-ink-muted uppercase tracking-wider">
          {newLabel}
        </div>
        <div className="p-3 whitespace-pre-wrap break-words bg-olive/[0.04] min-h-[3rem]">
          {newSegments.map((seg, i) => {
            if (seg.type === "added") {
              return (
                <span key={i} className="bg-olive/20 text-olive font-medium">
                  {seg.text}
                </span>
              );
            }
            return <span key={i}>{seg.text}</span>;
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main DiffView component
// ---------------------------------------------------------------------------

export function DiffView(props: DiffViewProps) {
  const { oldText, newText, sideBySide } = props;

  // Auto-detect: use unified for short texts, side-by-side for longer
  const useSideBySide =
    sideBySide !== undefined ? sideBySide : !isShort(oldText) || !isShort(newText);

  if (useSideBySide) {
    return <SideBySideDiff {...props} />;
  }

  return <UnifiedDiff {...props} />;
}

export { wordDiff };
export type { DiffSegment, DiffViewProps };
