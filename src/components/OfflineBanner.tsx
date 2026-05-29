"use client";

import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff, CheckCircle2, X } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const VARIANT_STYLES = {
  offline: {
    bg: "bg-gold/10",
    border: "border-gold/40",
    text: "text-gold",
  },
  reconnected: {
    bg: "bg-olive/10",
    border: "border-olive/40",
    text: "text-olive",
  },
} as const;

/**
 * Offline detection banner with reconnection feedback.
 *
 * - Hidden when online with no prior offline event.
 * - Amber "You are offline" banner when offline.
 * - Green "Reconnected" banner on reconnect, auto-dismisses after 3s.
 */
export function OfflineBanner() {
  const { isOnline, wasOffline, resetWasOffline } = useOnlineStatus();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Prefers-reduced-motion ────────────────────────────────────────────

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── Auto-dismiss after 3s on reconnect ────────────────────────────────

  useEffect(() => {
    if (wasOffline && isOnline) {
      timerRef.current = setTimeout(() => {
        resetWasOffline();
        timerRef.current = null;
      }, 3000);
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [wasOffline, isOnline, resetWasOffline]);

  // ── Determine state ───────────────────────────────────────────────────

  // Hidden: online and no reconnect to show
  if (isOnline && !wasOffline) return null;

  const isOffline = !isOnline;
  const variant = isOffline ? "offline" : "reconnected";
  const styles = VARIANT_STYLES[variant];

  // ── Dismiss handler ───────────────────────────────────────────────────

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    resetWasOffline();
  };

  // ── Animation props ───────────────────────────────────────────────────

  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: -12, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -12, scale: 0.95 },
        transition: { duration: 0.2, ease: "easeOut" as const },
      };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none pt-2">
      <AnimatePresence>
        <motion.div
          {...animationProps}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm ${styles.bg} ${styles.border}`}
          style={{ backgroundColor: "#211e1a" }}
        >
          {isOffline ? (
            <WifiOff size={18} className={`flex-shrink-0 ${styles.text}`} />
          ) : (
            <CheckCircle2
              size={18}
              className={`flex-shrink-0 ${styles.text}`}
            />
          )}
          <span className={`text-sm font-semibold ${styles.text}`}>
            {isOffline ? "You are offline" : "Reconnected"}
          </span>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-overlay/50 transition-colors"
            aria-label="Dismiss connectivity notification"
          >
            <X size={14} />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
