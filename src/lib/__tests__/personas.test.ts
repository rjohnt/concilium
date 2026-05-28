import { describe, it, expect } from "vitest";
import { PERSONAS, getPersona, getAllPersonas } from "../personas";

describe("PERSONAS", () => {
  it("has all four persona types", () => {
    const ids = getAllPersonas().map((p) => p.id);
    expect(ids).toContain("engineer");
    expect(ids).toContain("designer");
    expect(ids).toContain("product-owner");
    expect(ids).toContain("qa");
    expect(ids.length).toBe(4);
  });

  it("engineer has pastel light-theme color fields", () => {
    const p = getPersona("engineer");
    expect(p.color).toBe("bg-blue-100");
    expect(p.textColor).toBe("text-blue-700");
    expect(p.iconColor).toBe("text-blue-600");
    expect(p.borderColor).toBe("border-blue-300");
    expect(p.ringColor).toBe("ring-blue-400");
    expect(p.glowColor).toBe("shadow-blue-300/30");
    expect(p.bgGlow).toBe("bg-blue-50");
  });

  it("designer has pastel light-theme color fields", () => {
    const p = getPersona("designer");
    expect(p.color).toBe("bg-purple-100");
    expect(p.textColor).toBe("text-purple-700");
    expect(p.iconColor).toBe("text-purple-600");
    expect(p.borderColor).toBe("border-purple-300");
    expect(p.ringColor).toBe("ring-purple-400");
    expect(p.glowColor).toBe("shadow-purple-300/30");
    expect(p.bgGlow).toBe("bg-purple-50");
  });

  it("product-owner has pastel light-theme color fields", () => {
    const p = getPersona("product-owner");
    expect(p.color).toBe("bg-emerald-100");
    expect(p.textColor).toBe("text-emerald-700");
    expect(p.iconColor).toBe("text-emerald-600");
    expect(p.borderColor).toBe("border-emerald-300");
    expect(p.ringColor).toBe("ring-emerald-400");
    expect(p.glowColor).toBe("shadow-emerald-300/30");
    expect(p.bgGlow).toBe("bg-emerald-50");
  });

  it("qa has pastel light-theme color fields", () => {
    const p = getPersona("qa");
    expect(p.color).toBe("bg-amber-100");
    expect(p.textColor).toBe("text-amber-700");
    expect(p.iconColor).toBe("text-amber-600");
    expect(p.borderColor).toBe("border-amber-300");
    expect(p.ringColor).toBe("ring-amber-400");
    expect(p.glowColor).toBe("shadow-amber-300/30");
    expect(p.bgGlow).toBe("bg-amber-50");
  });

  it("every persona has all 7 color fields defined", () => {
    const colorFields: Array<keyof ReturnType<typeof getPersona>> = [
      "color",
      "textColor",
      "iconColor",
      "borderColor",
      "ringColor",
      "glowColor",
      "bgGlow",
    ];
    for (const persona of getAllPersonas()) {
      for (const field of colorFields) {
        expect(persona[field]).toBeTypeOf("string");
        expect(persona[field].length).toBeGreaterThan(0);
      }
    }
  });

  it("every persona retains emoji and expertise", () => {
    const p = getPersona("engineer");
    expect(p.emoji).toBe("⚙️");
    expect(p.expertise).toContain("Technical feasibility");

    const d = getPersona("designer");
    expect(d.emoji).toBe("🎨");
    expect(d.expertise).toContain("User experience");
  });
});
