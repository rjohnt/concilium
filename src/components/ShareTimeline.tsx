"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Wrench,
  Cog,
  PaintBucket,
  Calendar,
  Star,
  HelpCircle,
  Gauge,
  MapPin,
} from "lucide-react";
import type { TimelineEvent, TimelineCategory, TimelinePhoto } from "@/lib/share-types";

// Extended event type with optional fields present in the spec but not yet in the core type.
// This avoids touching src/lib/ while supporting the full timeline display.
interface TimelineEventDisplay {
  id: string;
  date: string;
  title: string;
  description: string;
  category: TimelineCategory;
  photos: TimelinePhoto[];
  mileage?: number;
  provider?: string;
}

// --- Category metadata (mapping the string union to display info) ---

interface CategoryMeta {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

const CATEGORY_META: Record<TimelineCategory, CategoryMeta> = {
  purchase: { label: "Purchase", icon: ShoppingBag, color: "#c9a84c" },
  service: { label: "Service", icon: Wrench, color: "#6b8fa8" },
  modification: { label: "Modification", icon: Cog, color: "#8a7030" },
  restoration: { label: "Restoration", icon: PaintBucket, color: "#6b8f5e" },
  event: { label: "Event", icon: Calendar, color: "#b84545" },
  milestone: { label: "Milestone", icon: Star, color: "#c9a84c" },
  other: { label: "Other", icon: HelpCircle, color: "#7a7468" },
};

// --- Helpers ---

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMileage(mileage?: number): string {
  if (mileage == null) return "";
  return `${mileage.toLocaleString("en-US")} mi`;
}

// --- Stagger config ---

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

// --- Component ---

interface ShareTimelineProps {
  events: TimelineEventDisplay[];
  categories: TimelineCategory[];
  onPhotoClick?: (photos: TimelinePhoto[], index: number) => void;
}

export function ShareTimeline({
  events,
  categories,
  onPhotoClick,
}: ShareTimelineProps) {
  const [activeCategory, setActiveCategory] = useState<TimelineCategory | "all">("all");

  const filtered =
    activeCategory === "all"
      ? events
      : events.filter((e) => e.category === activeCategory);

  const handlePhotoClick = useCallback(
    (photos: TimelinePhoto[], index: number) => {
      onPhotoClick?.(photos, index);
    },
    [onPhotoClick]
  );

  const visibleCategories = (["all"] as Array<"all" | TimelineCategory>).concat(
    categories
  );

  return (
    <div>
      {/* Section heading */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-ink-primary">
          Service History
          <span className="ml-2 text-sm font-normal text-ink-muted">
            ({filtered.length})
          </span>
        </h2>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {visibleCategories.map((cat) => {
          const isActive = activeCategory === cat;
          const meta =
            cat === "all"
              ? { label: "All", icon: Calendar, color: "#b8b2a6" }
              : CATEGORY_META[cat];
          const Icon = meta.icon;

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`badge shrink-0 cursor-pointer whitespace-nowrap transition-all ${
                isActive
                  ? "bg-gold/20 text-gold border border-gold/40"
                  : "bg-elevated text-ink-muted border border-border-subtle hover:border-border-visible hover:text-ink-secondary"
              }`}
            >
              <Icon size={14} />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar size={36} className="text-ink-ghost mx-auto mb-3" />
          <p className="text-ink-muted text-sm">
            {activeCategory === "all"
              ? "No events recorded yet."
              : `No "${CATEGORY_META[activeCategory].label.toLowerCase()}" events found.`}
          </p>
        </div>
      ) : (
        <motion.div
          className="relative pl-8 md:pl-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Vertical timeline line */}
          <div className="absolute left-[15px] md:left-[19px] top-2 bottom-2 w-[2px] bg-border-subtle rounded-full" />

          <div className="space-y-8">
            {filtered.map((event) => {
              const meta = CATEGORY_META[event.category];
              const CatIcon = meta.icon;

              return (
                <motion.div
                  key={event.id}
                  className="relative"
                  variants={itemVariants}
                >
                  {/* Date on the left of the line */}
                  <div className="absolute left-[-1.6rem] md:left-[-1.9rem] top-0 w-[34px] md:w-[40px] text-right -translate-x-full pr-3">
                    <span className="text-xs text-ink-muted whitespace-nowrap">
                      {formatDate(event.date)}
                    </span>
                  </div>

                  {/* Dot on the timeline */}
                  <div
                    className="absolute left-[11px] md:left-[15px] top-1.5 w-[10px] h-[10px] rounded-full border-2 border-border-subtle bg-raised z-10"
                    style={{ borderColor: meta.color }}
                  />

                  {/* Event card */}
                  <div className="card p-4 md:p-5">
                    <div className="flex items-start gap-3 mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${meta.color}20` }}
                      >
                        <CatIcon size={16} className="text-ink-muted" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-ink-primary leading-snug">
                          {event.title}
                        </h4>
                        <p className="text-sm text-ink-secondary mt-1 line-clamp-3">
                          {event.description}
                        </p>
                      </div>
                    </div>

                    {/* Meta row: mileage + provider */}
                    <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border-subtle">
                      {event.mileage != null && (
                        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                          <Gauge size={13} />
                          <span>{formatMileage(event.mileage)}</span>
                        </div>
                      )}
                      {event.provider && (
                        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                          <MapPin size={13} />
                          <span>{event.provider}</span>
                        </div>
                      )}
                      <div className="badge bg-elevated text-ink-muted text-[10px]">
                        {meta.label}
                      </div>
                    </div>

                    {/* Photo thumbnails */}
                    {event.photos.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
                        {event.photos.map((photo, idx) => (
                          <button
                            key={photo.id}
                            onClick={() =>
                              handlePhotoClick(event.photos, idx)
                            }
                            className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border-subtle hover:border-gold/50 transition-colors focus:outline-none focus:ring-2 focus:ring-gold/40"
                          >
                            <img
                              src={photo.url}
                              alt={photo.caption || "Event photo"}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
