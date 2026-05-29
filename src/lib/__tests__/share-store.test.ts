/**
 * Unit Tests — DEV-8: share-store
 *
 * Tests fetchShareData(shareId):
 * - Returns valid ShareData for valid UUID v4 share IDs
 * - Returns null for invalid UUIDs
 * - Returns null for empty string
 * - Returns null for non-UUID strings
 * - Returns null for wrong-version UUIDs
 * - Returns null for empty string / undefined-like
 * - Mock data includes vehicle, timeline, sellerNotes, createdAt
 */

import { describe, it, expect } from "vitest";
import { fetchShareData } from "../share-store";

// ============================================================================
// fetchShareData — valid UUIDs
// ============================================================================

describe("fetchShareData — valid UUIDs", () => {
  it("returns ShareData for a valid UUID v4 share ID", () => {
    const result = fetchShareData(
      "a1b2c3d4-e5f6-4000-8000-000000000001",
    );

    expect(result).not.toBeNull();
    expect(result!.shareId).toBe(
      "a1b2c3d4-e5f6-4000-8000-000000000001",
    );
    expect(result!.vehicle).toBeDefined();
    expect(result!.vehicle.make).toBe("Porsche");
    expect(result!.vehicle.model).toBe("911 Carrera");
    expect(result!.vehicle.year).toBe(1987);
    expect(result!.vehicle.vin).toBe("WP0AB0910HS122001");
    expect(result!.vehicle.trim).toBe("Coupe");
    expect(result!.vehicle.exteriorColor).toBe("Guards Red");
    expect(result!.vehicle.interiorColor).toBe("Black Leather");
    expect(result!.vehicle.mileage).toBe(68000);
    expect(result!.vehicle.price).toBe(89500);
  });

  it("substitutes the provided shareId into the returned data", () => {
    const customId = "b2c3d4e5-f6a7-4001-9001-111111111111";
    const result = fetchShareData(customId);

    expect(result).not.toBeNull();
    expect(result!.shareId).toBe(customId);
    // The rest of the data is the mock data
    expect(result!.vehicle.make).toBe("Porsche");
  });

  it("returns timeline events with expected structure", () => {
    const result = fetchShareData(
      "a1b2c3d4-e5f6-4000-8000-000000000001",
    );

    expect(result).not.toBeNull();
    expect(result!.timeline).toBeInstanceOf(Array);
    expect(result!.timeline.length).toBeGreaterThanOrEqual(1);

    const firstEvent = result!.timeline[0];
    expect(firstEvent.id).toMatch(/^evt-/);
    expect(firstEvent.date).toBeDefined();
    expect(firstEvent.title).toBeDefined();
    expect(firstEvent.description).toBeDefined();
    expect(firstEvent.category).toBeDefined();
    expect(firstEvent.photos).toBeInstanceOf(Array);
  });

  it("returns sellerNotes as a non-empty string", () => {
    const result = fetchShareData(
      "a1b2c3d4-e5f6-4000-8000-000000000001",
    );

    expect(result).not.toBeNull();
    expect(typeof result!.sellerNotes).toBe("string");
    expect(result!.sellerNotes.length).toBeGreaterThan(0);
  });

  it("returns a valid createdAt ISO string", () => {
    const result = fetchShareData(
      "a1b2c3d4-e5f6-4000-8000-000000000001",
    );

    expect(result).not.toBeNull();
    expect(result!.createdAt).toBeDefined();
    // Should parse as a valid date
    expect(new Date(result!.createdAt).getTime()).not.toBeNaN();
  });
});

// ============================================================================
// fetchShareData — invalid UUIDs
// ============================================================================

describe("fetchShareData — invalid UUIDs", () => {
  it("returns null for an empty string", () => {
    const result = fetchShareData("");
    expect(result).toBeNull();
  });

  it("returns null for a non-UUID string like 'abc'", () => {
    const result = fetchShareData("abc");
    expect(result).toBeNull();
  });

  it("returns null for a random sentence", () => {
    const result = fetchShareData(
      "this is definitely not a uuid",
    );
    expect(result).toBeNull();
  });

  it("returns null for a string that looks like a UUID but has wrong characters", () => {
    const result = fetchShareData(
      "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    );
    expect(result).toBeNull();
  });

  it("returns null for a UUID v1 (non-v4) formatted string", () => {
    // UUID v1 has version nibble = 1 instead of 4
    const result = fetchShareData(
      "a1b2c3d4-e5f6-1000-8000-000000000001",
    );
    expect(result).toBeNull();
  });

  it("returns null for a UUID with wrong variant", () => {
    // Variant must start with 8, 9, a, or b
    const result = fetchShareData(
      "a1b2c3d4-e5f6-4000-c000-000000000001",
    );
    expect(result).toBeNull();
  });

  it("returns null for string with dashes but not a UUID", () => {
    const result = fetchShareData("a-b-c-d-e");
    expect(result).toBeNull();
  });

  it("returns null for a string that's too long (extra characters after UUID)", () => {
    const result = fetchShareData(
      "a1b2c3d4-e5f6-4000-8000-000000000001-extra",
    );
    expect(result).toBeNull();
  });

  it("returns null for a string missing dashes", () => {
    const result = fetchShareData(
      "a1b2c3d4e5f640008000000000000001",
    );
    expect(result).toBeNull();
  });

  it("returns null for null-ish edge case (undefined passed as string)", () => {
    // TypeScript would prevent this, but runtime safety
    const result = fetchShareData(
      undefined as unknown as string,
    );
    expect(result).toBeNull();
  });
});

// ============================================================================
// fetchShareData — edge cases
// ============================================================================

describe("fetchShareData — edge cases", () => {
  it("handles uppercased valid UUID", () => {
    const result = fetchShareData(
      "A1B2C3D4-E5F6-4000-8000-000000000001",
    );

    expect(result).not.toBeNull();
    expect(result!.shareId).toBe(
      "A1B2C3D4-E5F6-4000-8000-000000000001",
    );
  });

  it("handles mixed-case valid UUID", () => {
    const result = fetchShareData(
      "A1b2C3d4-E5f6-4000-8000-000000000001",
    );

    expect(result).not.toBeNull();
    expect(result!.shareId).toBe(
      "A1b2C3d4-E5f6-4000-8000-000000000001",
    );
    expect(result!.vehicle.make).toBe("Porsche");
  });

  it("returns distinct results for different valid UUIDs", () => {
    const r1 = fetchShareData(
      "a1b2c3d4-e5f6-4000-8000-000000000001",
    );
    const r2 = fetchShareData(
      "b2c3d4e5-f6a7-4001-9001-111111111111",
    );

    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    expect(r1!.shareId).not.toBe(r2!.shareId);
    // Vehicle data should be identical (same mock)
    expect(r1!.vehicle.make).toBe(r2!.vehicle.make);
  });
});
