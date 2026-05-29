// === Share Types for Public Share Page (DEV-8) ===

export type TimelineCategory =
  | "purchase"
  | "service"
  | "modification"
  | "restoration"
  | "event"
  | "milestone"
  | "other";

export interface VehicleSummary {
  make: string;
  model: string;
  year: number;
  vin: string;
  trim?: string;
  exteriorColor?: string;
  interiorColor?: string;
  mileage?: number;
  price?: number;
}

export interface TimelinePhoto {
  id: string;
  url: string;
  caption?: string;
  takenAt: string; // ISO string
}

export interface TimelineEvent {
  id: string;
  date: string; // ISO string
  title: string;
  description: string;
  category: TimelineCategory;
  photos: TimelinePhoto[];
  mileage?: number;
  provider?: string;
}

export interface ShareData {
  shareId: string;
  vehicle: VehicleSummary;
  timeline: TimelineEvent[];
  sellerNotes: string;
  createdAt: string; // ISO string
}
