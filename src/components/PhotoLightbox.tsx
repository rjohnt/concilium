"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { TimelinePhoto } from "@/lib/share-types";

interface PhotoLightboxProps {
  photos: TimelinePhoto[];
  initialIndex: number;
  onClose: () => void;
}

export function PhotoLightbox({
  photos,
  initialIndex,
  onClose,
}: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const hasMultiple = photos.length > 1;

  // Body scroll lock
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (hasMultiple) {
            setCurrentIndex((prev) =>
              prev === 0 ? photos.length - 1 : prev - 1
            );
          }
          break;
        case "ArrowRight":
          if (hasMultiple) {
            setCurrentIndex((prev) =>
              prev === photos.length - 1 ? 0 : prev + 1
            );
          }
          break;
      }
    },
    [onClose, hasMultiple, photos.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const currentPhoto = photos[currentIndex];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-raised/80 hover:bg-raised text-ink-muted hover:text-ink-primary transition-colors"
        aria-label="Close lightbox"
      >
        <X size={20} />
      </button>

      {/* Left arrow */}
      {hasMultiple && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex((prev) =>
              prev === 0 ? photos.length - 1 : prev - 1
            );
          }}
          className="absolute left-4 z-10 p-2 rounded-full bg-raised/80 hover:bg-raised text-ink-muted hover:text-ink-primary transition-colors"
          aria-label="Previous photo"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Right arrow */}
      {hasMultiple && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex((prev) =>
              prev === photos.length - 1 ? 0 : prev + 1
            );
          }}
          className="absolute right-4 z-10 p-2 rounded-full bg-raised/80 hover:bg-raised text-ink-muted hover:text-ink-primary transition-colors"
          aria-label="Next photo"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Image */}
      <div onClick={(e) => e.stopPropagation()} className="relative">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentPhoto.id}
            src={currentPhoto.url}
            alt={currentPhoto.caption || "Photo"}
            className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          />
        </AnimatePresence>

        {/* Caption */}
        {currentPhoto.caption && (
          <p className="text-center text-sm text-ink-muted mt-3 px-4">
            {currentPhoto.caption}
          </p>
        )}
      </div>

      {/* Dot indicators */}
      {hasMultiple && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {photos.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? "bg-gold w-5"
                  : "bg-ink-ghost hover:bg-ink-muted"
              }`}
              aria-label={`Go to photo ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
