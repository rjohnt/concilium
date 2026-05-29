"use client";

import { useState } from "react";
import { Car, Calendar, Gauge, ListTodo } from "lucide-react";
import type { VehicleSummary } from "@/lib/share-types";

interface VehicleHeroProps {
  vehicle: VehicleSummary;
  /** Optional hero image URL. If not provided or on error, shows dark placeholder. */
  heroImage?: string;
  /** Total event count displayed alongside vehicle stats. */
  eventsCount?: number;
}

function formatMileage(mileage?: number): string {
  if (mileage == null) return "—";
  return mileage.toLocaleString("en-US");
}

export function VehicleHero({
  vehicle,
  heroImage,
  eventsCount,
}: VehicleHeroProps) {
  const [imageError, setImageError] = useState(false);

  const hasHero = heroImage && !imageError;

  return (
    <div className="relative w-full -mx-8 md:-ml-64 md:w-[calc(100%+16rem)] overflow-hidden">
      {/* Hero background */}
      <div className="relative h-64 md:h-80 lg:h-96 w-full">
        {hasHero ? (
          <img
            src={heroImage}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="h-full w-full bg-[#141210] flex items-center justify-center">
            <Car size={72} className="text-ink-ghost opacity-40" />
          </div>
        )}

        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1714] via-[#1a1714]/60 to-transparent" />
      </div>

      {/* Overlaid stats */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-ink-primary mb-4">
          {vehicle.year} {vehicle.make} {vehicle.model}
          {vehicle.trim && (
            <span className="text-ink-secondary font-normal ml-2 text-lg md:text-xl">
              {vehicle.trim}
            </span>
          )}
        </h1>

        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          {/* Mileage */}
          <div className="flex items-center gap-2 text-ink-secondary">
            <Gauge size={18} className="text-gold shrink-0" />
            <span className="text-sm md:text-base">
              {formatMileage(vehicle.mileage)} mi
            </span>
          </div>

          {/* Events count */}
          {eventsCount != null && (
            <div className="flex items-center gap-2 text-ink-secondary">
              <ListTodo size={18} className="text-gold shrink-0" />
              <span className="text-sm md:text-base">
                {eventsCount} {eventsCount === 1 ? "event" : "events"}
              </span>
            </div>
          )}

          {/* Year (from the date perspective) */}
          <div className="flex items-center gap-2 text-ink-secondary">
            <Calendar size={18} className="text-gold shrink-0" />
            <span className="text-sm md:text-base">{vehicle.year}</span>
          </div>

          {/* Color info if available */}
          {vehicle.exteriorColor && (
            <div
              className="flex items-center gap-2 text-ink-secondary"
              title={vehicle.exteriorColor}
            >
              <span
                className="inline-block w-4 h-4 rounded-full border border-border-visible shrink-0"
                style={{ backgroundColor: nameToHex(vehicle.exteriorColor) }}
              />
              <span className="text-sm md:text-base">
                {vehicle.exteriorColor}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Simple color name → hex mapping for the swatch dot. Fallback to gold. */
function nameToHex(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("red")) return "#c42e2e";
  if (lower.includes("blue")) return "#4a6fa5";
  if (lower.includes("black")) return "#1a1a1a";
  if (lower.includes("white")) return "#f0f0f0";
  if (lower.includes("silver") || lower.includes("grey") || lower.includes("gray"))
    return "#a0a0a0";
  if (lower.includes("green")) return "#3a6b3a";
  if (lower.includes("yellow")) return "#d4b840";
  if (lower.includes("orange")) return "#d4742a";
  if (lower.includes("brown")) return "#6b4c3a";
  if (lower.includes("gold")) return "#c9a84c";
  return "#c9a84c";
}
