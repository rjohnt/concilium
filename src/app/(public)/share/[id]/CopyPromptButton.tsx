"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import styles from "../share.module.css";

/**
 * Copies the council-refined agent prompt to the clipboard. The prompt is
 * generated server-side and passed in, so a viewer of any shared council can
 * take the spec straight to their own coding agent.
 */
export default function CopyPromptButton({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(prompt).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        /* clipboard blocked — leave the button in its default state */
      }
    );
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
      aria-live="polite"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? "Copied — paste into your agent" : "Copy agent prompt"}
    </button>
  );
}
