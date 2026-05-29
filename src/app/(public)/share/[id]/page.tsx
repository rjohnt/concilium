"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { FileQuestion } from "lucide-react";
import { VehicleHero } from "@/components/VehicleHero";
import { ShareTimeline } from "@/components/ShareTimeline";
import { ShareLinkBar } from "@/components/ShareLinkBar";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { SharePageSkeleton } from "@/components/SharePageSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { fetchShareData } from "@/lib/share-store";
import type { ShareData, TimelinePhoto } from "@/lib/share-types";

interface LightboxState {
  photos: TimelinePhoto[];
  index: number;
}

export default function SharePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("No share ID provided.");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const result = fetchShareData(id);
        if (cancelled) return;

        if (!result) {
          setError("Share not found or link is invalid.");
        } else {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load share data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePhotoClick = useCallback(
    (photos: TimelinePhoto[], index: number) => {
      setLightbox({ photos, index });
    },
    []
  );

  const handleCloseLightbox = useCallback(() => {
    setLightbox(null);
  }, []);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${id}`
      : "";

  // --- Loading state ---
  if (loading) {
    return <SharePageSkeleton />;
  }

  // --- Error / null state ---
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <EmptyState
          icon={FileQuestion}
          title="Share Not Found"
          description={
            error ||
            "This share link may have expired or is invalid. Please check the URL and try again."
          }
        />
      </div>
    );
  }

  // --- Loaded state ---
  const categories = data.timeline
    .map((e) => e.category)
    .filter((v, i, a) => a.indexOf(v) === i);

  return (
    <>
      <div className="md:-ml-64">
        {/* Hero */}
        <VehicleHero
          vehicle={data.vehicle}
          eventsCount={data.timeline.length}
        />

        {/* Content: timeline + share bar */}
        <div className="max-w-3xl mx-auto px-4 md:px-0 pt-8 pb-24">
          <ShareTimeline
            events={data.timeline}
            categories={categories}
            onPhotoClick={handlePhotoClick}
          />
        </div>
      </div>

      {/* Sticky share bar */}
      <div className="sticky bottom-0 z-20 bg-gradient-to-t from-[#1a1714] via-[#1a1714]/95 to-transparent pt-6 pb-4">
        <div className="max-w-3xl mx-auto px-4 md:px-0 md:-ml-64">
          <ShareLinkBar shareUrl={shareUrl} />
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={handleCloseLightbox}
        />
      )}
    </>
  );
}
