import type { ShareData } from "./share-types";

// UUID v4 regex for validating share IDs
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// === Mock Share Data ===

const MOCK_SHARE_DATA: ShareData = {
  shareId: "a1b2c3d4-e5f6-4000-8000-000000000001",
  vehicle: {
    make: "Porsche",
    model: "911 Carrera",
    year: 1987,
    vin: "WP0AB0910HS122001",
    trim: "Coupe",
    exteriorColor: "Guards Red",
    interiorColor: "Black Leather",
    mileage: 68000,
    price: 89500,
  },
  timeline: [
    {
      id: "evt-001",
      date: "1987-03-15T00:00:00.000Z",
      title: "Original Delivery",
      description:
        "Delivered new to Beverly Hills Porsche. Window sticker shows $52,900 MSRP with sport seats and sunroof options.",
      category: "purchase",
      photos: [
        {
          id: "photo-001",
          url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800",
          caption: "Original window sticker",
          takenAt: "1987-03-15T00:00:00.000Z",
        },
      ],
    },
    {
      id: "evt-002",
      date: "2019-06-01T00:00:00.000Z",
      title: "Engine Rebuild",
      description:
        "Complete engine rebuild by Rennsport Autohaus. New pistons, cylinders, timing chains, and valve guides. $18,500 invoice on file.",
      category: "service",
      photos: [
        {
          id: "photo-002",
          url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800",
          caption: "Engine bay after rebuild",
          takenAt: "2019-06-01T00:00:00.000Z",
        },
        {
          id: "photo-003",
          url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800",
          caption: "Service invoice detail",
          takenAt: "2019-06-01T00:00:00.000Z",
        },
      ],
    },
    {
      id: "evt-003",
      date: "2021-04-10T00:00:00.000Z",
      title: "Suspension Upgrade",
      description:
        "Bilstein B6 shocks installed at all four corners with new bushings and turbo tie rods. Alignment performed at West End Alignment.",
      category: "modification",
      photos: [],
    },
    {
      id: "evt-004",
      date: "2023-09-20T00:00:00.000Z",
      title: "Paint Correction & Ceramic Coating",
      description:
        "Three-stage paint correction by Elite Detail Studio. Gtechniq Crystal Serum Ultra ceramic coating applied. Paint depth measurements available.",
      category: "restoration",
      photos: [
        {
          id: "photo-004",
          url: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800",
          caption: "After paint correction",
          takenAt: "2023-09-20T00:00:00.000Z",
        },
      ],
    },
    {
      id: "evt-005",
      date: "2024-05-18T00:00:00.000Z",
      title: "Luftgekühlt 10 Display",
      description:
        "Selected for the curated corral at Luftgekühlt 10 in Los Angeles. Awarded People's Choice runner-up in the G-body category.",
      category: "event",
      photos: [
        {
          id: "photo-005",
          url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800",
          caption: "On display at Luftgekühlt 10",
          takenAt: "2024-05-18T00:00:00.000Z",
        },
      ],
    },
  ],
  sellerNotes:
    "This 1987 911 Carrera has been in my care for the past 8 years and has been maintained without regard to cost. It's a fantastic driver with strong oil pressure, no smoke on startup, and ice-cold A/C. The G50 transmission shifts beautifully. Comes with extensive records, original tools, and the window sticker. The only reason I'm selling is to make room for a 964 Turbo.",
  createdAt: "2025-01-15T10:30:00.000Z",
};

/**
 * Fetch share data by UUID.
 *
 * Returns mock ShareData for valid UUID v4 share IDs.
 * Returns null for invalid UUIDs (non-UUID strings, malformed, wrong version).
 */
export function fetchShareData(shareId: string): ShareData | null {
  if (!UUID_REGEX.test(shareId)) {
    return null;
  }

  // Return mock data with the requested shareId substituted
  return {
    ...MOCK_SHARE_DATA,
    shareId,
  };
}
