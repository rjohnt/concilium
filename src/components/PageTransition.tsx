"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Initialize to false on BOTH server and first client render — a
  // window-gated initializer makes the two diverge for reduced-motion users
  // (the same hydration-mismatch pattern AuthGuard had). The effect corrects
  // it right after mount.
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const variants = {
    initial: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 8,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.2,
        ease: "easeOut" as const,
      },
    },
  };

  // No AnimatePresence here: combined with SSR hydration it duplicated the
  // page — the server copy was orphaned in the DOM while mode="wait" held the
  // client copy at `initial` (opacity 0) waiting on a phantom exit. A plain
  // motion.div keyed by pathname keeps the enter fade on every navigation;
  // only the brief exit fade is lost.
  return (
    <motion.div
      key={pathname}
      variants={variants}
      initial="initial"
      animate="animate"
      style={{ width: "100%" }}
    >
      {children}
    </motion.div>
  );
}
