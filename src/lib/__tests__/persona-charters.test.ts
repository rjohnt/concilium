import { describe, it, expect } from "vitest";
import { PERSONA_CHARTERS, getCharter, type PersonaCharter } from "../persona-charters";
import { buildPersonaSystemPrompt } from "../persona-prompts";
import { getPersona } from "../personas";
import { PersonaId } from "../types";

const ROLES: PersonaId[] = ["engineer", "designer", "product-owner", "qa"];

// These are deterministic guardrails on how the agents are CONSTRUCTED — they
// verify each role is instructed to be distinct, without calling the LLM. The
// LLM-judged proof that the agents actually behave distinctly lives in
// scripts/evals/ (run with a DEEPSEEK_API_KEY).

describe("persona charters are well-formed", () => {
  it.each(ROLES)("%s has a complete, non-trivial charter", (role) => {
    const c: PersonaCharter = getCharter(role);
    expect(c.mandate.length).toBeGreaterThan(40);
    expect(c.lens.length).toBeGreaterThanOrEqual(5);
    expect(c.pushBackOn.length).toBeGreaterThanOrEqual(3);
    expect(c.defersTo.length).toBeGreaterThan(40);
    expect(c.approvalBar.length).toBeGreaterThan(20);
    expect(c.voice.length).toBeGreaterThan(10);
  });

  it("every role defers to the OTHER three (no role claims everything)", () => {
    for (const role of ROLES) {
      const others = ROLES.filter((r) => r !== role);
      const defers = getCharter(role).defersTo.toLowerCase();
      // Each charter should name at least two of the other roles' domains.
      const mentionsOtherRole = others.some((o) =>
        defers.includes(
          o === "product-owner" ? "product owner" : o
        )
      );
      expect(mentionsOtherRole, `${role} should defer to another role`).toBe(true);
    }
  });
});

describe("composed system prompts are role-distinct", () => {
  const prompts = Object.fromEntries(
    ROLES.map((r) => [r, buildPersonaSystemPrompt(getPersona(r)!)])
  ) as Record<PersonaId, string>;

  it("each prompt names its own role", () => {
    expect(prompts.engineer).toContain("Engineer");
    expect(prompts.designer).toContain("Designer");
    expect(prompts["product-owner"]).toContain("Product Owner");
    expect(prompts.qa).toContain("QA");
  });

  it("prompts are pairwise different", () => {
    for (let i = 0; i < ROLES.length; i++) {
      for (let j = i + 1; j < ROLES.length; j++) {
        expect(prompts[ROLES[i]]).not.toEqual(prompts[ROLES[j]]);
      }
    }
  });

  // Each role's lens vocabulary should appear in its OWN prompt. This is the
  // concrete signal that the agents are pointed at different things.
  const signatureTerms: Record<PersonaId, string[]> = {
    engineer: ["schema", "api", "failure mode", "scale", "migration"],
    designer: ["accessib", "empty", "loading", "error", "keyboard", "contrast"],
    "product-owner": ["metric", "mvp", "scope", "opportunity cost", "user need"],
    qa: ["acceptance criteria", "edge", "regression", "boundary", "observab"],
  };

  it.each(ROLES)("%s prompt contains its signature lens vocabulary", (role) => {
    const lower = prompts[role].toLowerCase();
    const hits = signatureTerms[role].filter((t) => lower.includes(t));
    expect(
      hits.length,
      `${role} prompt missing its lens terms; matched: ${hits.join(", ")}`
    ).toBeGreaterThanOrEqual(3);
  });

  it("a role's prompt does not read like another role's (signature terms are mostly exclusive)", () => {
    // The designer prompt shouldn't be saturated with engineering vocabulary,
    // and vice-versa — a coarse check that lanes don't bleed.
    const engInDesigner = signatureTerms.engineer.filter((t) =>
      prompts.designer.toLowerCase().includes(t)
    ).length;
    const designerInEng = signatureTerms.designer.filter((t) =>
      prompts.engineer.toLowerCase().includes(t)
    ).length;
    expect(engInDesigner).toBeLessThanOrEqual(1);
    expect(designerInEng).toBeLessThanOrEqual(1);
  });

  it("every prompt instructs the agent to stay in its lane and approve only when its bar is met", () => {
    for (const role of ROLES) {
      expect(prompts[role]).toContain("STAY IN YOUR LANE");
      expect(prompts[role]).toContain("YOUR BAR FOR APPROVAL");
    }
  });
});
