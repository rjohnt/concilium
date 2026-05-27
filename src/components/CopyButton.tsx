"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Copy, Check, Link } from "lucide-react";

interface CopyButtonProps {
  /** Text to copy. Falls back to window.location.href when undefined. */
  text?: string;
  label?: string;
  className?: string;
  /** Use a Link icon instead of Copy icon (for "Copy Link" buttons) */
  icon?: "copy" | "link";
}

export function CopyButton({ text, label, className = "", icon = "copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Only fall back to location.href when text is truly undefined, not empty string
      const copyText = text !== undefined ? text : (typeof window !== "undefined" ? window.location.href : "");

      // Try the Clipboard API
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(copyText).then(
          () => {
            setCopied(true);
            timeoutRef.current = setTimeout(() => setCopied(false), 2000);
          },
          (err) => {
            // Log the actual error instead of a generic warning
            console.error("Clipboard writeText failed:", err);
          }
        );
      } else {
        console.warn("Clipboard API not available");
      }
    },
    [text]
  );

  const ariaLabel = label ? `Copy ${label}` : "Copy to clipboard";

  if (copied) {
    return (
      <button
        className={`btn-ghost p-1.5 rounded-lg text-emerald-400 cursor-default ${className}`}
        aria-label="Copied!"
        disabled
      >
        <Check size={14} />
        <span className="text-xs">Copied!</span>
      </button>
    );
  }

  const IconComponent = icon === "link" ? Link : Copy;

  return (
    <button
      onClick={handleCopy}
      className={`btn-ghost p-1.5 rounded-lg ${className}`}
      aria-label={ariaLabel}
    >
      <IconComponent size={14} />
    </button>
  );
}
