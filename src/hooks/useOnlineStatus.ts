"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Detects browser online/offline status and tracks whether the user has
 * recently reconnected after being offline.
 *
 * - `isOnline`: `true` by default (SSR-safe), updated on mount from
 *   `navigator.onLine` and whenever `online`/`offline` events fire.
 * - `wasOffline`: flips to `true` after an `offline→online` transition.
 *   Call `resetWasOffline()` to reset it back to `false`.
 *
 * @example
 * ```tsx
 * const { isOnline, wasOffline, resetWasOffline } = useOnlineStatus();
 *
 * if (!isOnline) return <OfflineBanner />;
 * if (wasOffline) return <ReconnectedBanner onDismiss={resetWasOffline} />;
 * ```
 */
export function useOnlineStatus(): {
  isOnline: boolean;
  wasOffline: boolean;
  resetWasOffline: () => void;
} {
  const [isOnline, setIsOnline] = useState(true);

  // Track whether we've ever detected offline so we can fire wasOffline
  // on the first online event after being offline.
  // We use a ref so we never miss a transition between renders.
  const wasOfflineRef = useRef(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // On mount, sync to the real navigator state so the SSR default
    // (true) only lasts until the first client render.
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);

      // If we were previously offline, flag the reconnection.
      if (wasOfflineRef.current) {
        setWasOffline(true);
        wasOfflineRef.current = false;
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const resetWasOffline = useCallback(() => {
    setWasOffline(false);
  }, []);

  return { isOnline, wasOffline, resetWasOffline };
}
