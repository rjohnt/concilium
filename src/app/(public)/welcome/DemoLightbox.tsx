"use client";

/* ------------------------------------------------------------------ *
 * DemoLightbox — owns the hero "Watch the demo" button and the modal   *
 * that plays the Concilium sizzle reel. Opening is a user gesture, so  *
 * the video may autoplay with sound; ESC / backdrop / close button     *
 * dismiss it, and body scroll is locked while open.                    *
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";
import styles from "./welcome.module.css";

const POSTER = "/welcome/concilium-sizzle-poster.jpg";
const MP4 = "/welcome/concilium-sizzle.mp4";

export default function DemoLightbox() {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);

    // lock background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // focus the dialog, try to play
    closeBtnRef.current?.focus();
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      v.play().catch(() => {
        /* autoplay may be blocked; controls are available */
      });
    }

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      videoRef.current?.pause();
      // restore focus to the trigger
      triggerRef.current?.focus();
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.btn} ${styles.btnLg} ${styles.btnSecondary}`}
        onClick={() => setOpen(true)}
      >
        <span className={styles.btnIcon}>
          <Play size={15} />
        </span>
        Watch the demo
      </button>

      {open && (
        <div
          className={styles.lbBackdrop}
          role="dialog"
          aria-modal="true"
          aria-label="Concilium demo reel"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className={styles.lbFrame}>
            <button
              ref={closeBtnRef}
              type="button"
              className={styles.lbClose}
              onClick={close}
              aria-label="Close demo"
            >
              <X size={20} />
            </button>
            <video
              ref={videoRef}
              className={styles.lbVideo}
              poster={POSTER}
              controls
              playsInline
              preload="metadata"
            >
              <source src={MP4} type="video/mp4" />
            </video>
          </div>
        </div>
      )}
    </>
  );
}
