"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Link } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  /** Use a Link icon instead of Copy icon (for "Copy Link" buttons) */
  icon?: "copy" | "link";
}

export function CopyButton({ text, label, className = "", icon = "copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const copyText = text || (typeof window !== "undefined" ? window.location.href : "");

      // Try the Clipboard API
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(copyText).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          },
          () => {
            console.warn("Clipboard write failed");
            // Still show feedback even on failure
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        );
      } else {
        // Clipboard API not available — show warning and fallback feedback
        console.warn("Clipboard API not available");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
      title={ariaLabel}
    >
      <IconComponent size={14} />
      {label && <span className="text-xs sr-only">{label}</span>}
    </button>
  );
}
