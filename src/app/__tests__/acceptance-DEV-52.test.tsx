import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// ── localStorage mock (must be set up BEFORE importing store) ─────────
// The store module calls loadTickets() at import time, which uses
// localStorage. We must stub it first — same pattern as store.test.ts.

function getMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

const mockStorage = getMockStorage();
vi.stubGlobal("localStorage", mockStorage);
vi.stubGlobal("window", {
  addEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

// ── Now safe to import store (loadTickets runs with mocked localStorage) ──

import {
  clearStorage,
  createTicket,
  addFeedback,
} from "@/lib/store";
import { getAllPersonas } from "@/lib/personas";
import DashboardPage from "../page";

// ── Helpers ────────────────────────────────────────────────────────────

/** Set up 5 tickets with varied feedback for persona-filter testing. */
function setupTicketsWithFeedback() {
  // T1: in-review, has feedback from engineer + designer
  const t1 = createTicket("Dark mode toggle", "Add dark mode support");
  addFeedback(t1.id, "engineer", "Looks feasible", true);
  addFeedback(t1.id, "designer", "Nice design tokens", true);

  // T2: in-review, has feedback from product-owner only
  const t2 = createTicket("Collab cursors", "Real-time cursors");
  addFeedback(t2.id, "product-owner", "High priority for enterprise", true);

  // T3: draft, no feedback
  createTicket("PDF export", "Export dashboard as PDF");

  // T4: draft, no feedback
  createTicket("Rate limiting", "API rate limiting by tenant");

  // T5: in-review, feedback from qa + engineer
  const t5 = createTicket("Search overhaul", "Redesign search");
  addFeedback(t5.id, "qa", "Edge cases: empty query, special chars", true);
  addFeedback(t5.id, "engineer", "Use fuse.js for fuzzy matching", true);
}

/** Render the dashboard after seeding tickets. */
function renderDashboard() {
  return render(<DashboardPage />);
}

/** Find a persona filter toggle button by its label text.
 *  Uses getByRole to target only <button> elements, avoiding
 *  collision with PersonaBadge <span>s inside TicketCards. */
function getPersonaButton(label: string) {
  return screen.getByRole("button", { name: new RegExp(label, "i") });
}

/** Click a persona filter toggle button by label. */
function clickPersona(label: string) {
  fireEvent.click(getPersonaButton(label));
}

/** Assert a ticket title is visible in the list. */
function expectTicketVisible(title: string) {
  expect(screen.getByText(title)).toBeInTheDocument();
}

/** Assert a ticket title is NOT visible. */
function expectTicketHidden(title: string) {
  expect(screen.queryByText(title)).toBeNull();
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("DEV-52: Persona reviewed-by filter (acceptance)", () => {
  beforeEach(() => {
    mockStorage.clear();
    clearStorage();
  });

  // ── AC1: Persona filter row below priority filter ───────────────────

  describe("AC1 — Persona filter row appears below priority with 4 toggle buttons", () => {
    it("renders the persona filter section with label", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      expect(screen.getByText("Persona:")).toBeInTheDocument();
    });

    it("renders all 4 persona toggle buttons", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      const personas = getAllPersonas();
      for (const persona of personas) {
        // Use getByRole to only match <button> elements, not
        // PersonaBadge <span>s inside TicketCards.
        expect(
          screen.getByRole("button", { name: new RegExp(persona.label, "i") })
        ).toBeInTheDocument();
      }
    });

    it("places persona filter row after priority filter row in the DOM", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      const priorityLabel = screen.getByText("Priority:");
      const personaLabel = screen.getByText("Persona:");

      // Priority label should appear before Persona label in document order
      expect(
        priorityLabel.compareDocumentPosition(personaLabel) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });
  });

  // ── AC2: Each persona shows icon + label ───────────────────────────

  describe("AC2 — Each persona button shows icon + label from personas.ts", () => {
    it.each(getAllPersonas().map((p) => [p.id, p.label] as const))(
      "persona %s renders icon and label %s",
      (_id, label) => {
        setupTicketsWithFeedback();
        renderDashboard();

        const button = screen.getByRole("button", {
          name: new RegExp(label, "i"),
        });
        expect(button).toBeInTheDocument();
        // Persona icon is rendered as SVG (lucide icon), verify it exists
        const svg = button.querySelector("svg");
        expect(svg).not.toBeNull();
        expect(button.textContent).toContain(label);
      }
    );
  });

  // ── AC3: Mode toggle with brand-colored active state ────────────────

  describe("AC3 — Mode toggle buttons with brand-colored active state", () => {
    it("renders 'Reviewed by' and 'Awaiting review' toggle buttons", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      expect(
        screen.getByRole("button", { name: /Reviewed by/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Awaiting review/i })
      ).toBeInTheDocument();
    });

    it('defaults to "Reviewed by" mode active', () => {
      setupTicketsWithFeedback();
      renderDashboard();

      const reviewedByBtn = screen.getByRole("button", {
        name: /Reviewed by/i,
      });
      const awaitingBtn = screen.getByRole("button", {
        name: /Awaiting review/i,
      });

      // Active mode gets brand-colored classes
      expect(reviewedByBtn.className).toContain("bg-brand-900/50");
      expect(reviewedByBtn.className).toContain("text-brand-400");
      // Inactive mode should NOT have those classes
      expect(awaitingBtn.className).not.toContain("bg-brand-900/50");
    });

    it("switches active state when clicking 'Awaiting review'", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      const awaitingBtn = screen.getByRole("button", {
        name: /Awaiting review/i,
      });
      fireEvent.click(awaitingBtn);

      expect(awaitingBtn.className).toContain("bg-brand-900/50");
      expect(awaitingBtn.className).toContain("text-brand-400");

      const reviewedByBtn = screen.getByRole("button", {
        name: /Reviewed by/i,
      });
      expect(reviewedByBtn.className).not.toContain("bg-brand-900/50");
    });

    it("switches back to 'Reviewed by' when clicked again", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      fireEvent.click(
        screen.getByRole("button", { name: /Awaiting review/i })
      );
      fireEvent.click(screen.getByRole("button", { name: /Reviewed by/i }));

      const reviewedByBtn = screen.getByRole("button", {
        name: /Reviewed by/i,
      });
      expect(reviewedByBtn.className).toContain("bg-brand-900/50");
    });
  });

  // ── AC4: "Reviewed by" mode shows tickets WITH persona feedback ─────

  describe('AC4 — "Reviewed by" mode: shows tickets with feedback from selected personas', () => {
    it("filters to only tickets reviewed by selected persona (Engineer)", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      // Initially all 5 tickets visible
      expectTicketVisible("Dark mode toggle");
      expectTicketVisible("Collab cursors");
      expectTicketVisible("PDF export");
      expectTicketVisible("Rate limiting");
      expectTicketVisible("Search overhaul");

      clickPersona("Engineer");

      // T1 (engineer+designer) and T5 (engineer+qa) have engineer feedback
      expectTicketVisible("Dark mode toggle");
      expectTicketVisible("Search overhaul");

      // T2 (po only), T3 (none), T4 (none) → hidden
      expectTicketHidden("Collab cursors");
      expectTicketHidden("PDF export");
      expectTicketHidden("Rate limiting");
    });

    it("filters to tickets reviewed by Product Owner", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      clickPersona("Product Owner");

      // Only T2 has product-owner feedback
      expectTicketVisible("Collab cursors");
      expectTicketHidden("Dark mode toggle");
      expectTicketHidden("Search overhaul");
    });

    it("shows tickets reviewed by ANY selected persona (OR logic within personas)", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      clickPersona("Engineer");
      clickPersona("Designer");

      // T1 has both, T5 has engineer → both should show
      expectTicketVisible("Dark mode toggle");
      expectTicketVisible("Search overhaul");
      // T2 has neither → hidden
      expectTicketHidden("Collab cursors");
    });

    it("clearing all persona selections shows all tickets again", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      clickPersona("Engineer");
      expectTicketHidden("Collab cursors");

      // Deselect Engineer
      clickPersona("Engineer");

      // All tickets should be visible again
      expectTicketVisible("Dark mode toggle");
      expectTicketVisible("Collab cursors");
      expectTicketVisible("PDF export");
      expectTicketVisible("Rate limiting");
      expectTicketVisible("Search overhaul");
    });

    it("selecting a persona with no matching tickets shows empty state", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      // Filter to draft only (T3, T4 have no feedback at all)
      fireEvent.click(screen.getByRole("button", { name: /Draft/ }));

      // Now click Engineer persona — no draft tickets have engineer feedback
      clickPersona("Engineer");

      expect(
        screen.getByText("No tickets reviewed by selected personas")
      ).toBeInTheDocument();
    });
  });

  // ── AC5: "Awaiting review" mode shows tickets WITHOUT feedback ─────

  describe('AC5 — "Awaiting review" mode: shows tickets without feedback from selected personas', () => {
    it("shows tickets NOT reviewed by the selected persona", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      // Switch to "Awaiting review" mode
      fireEvent.click(
        screen.getByRole("button", { name: /Awaiting review/i })
      );

      // Select Engineer — show tickets WITHOUT engineer feedback
      clickPersona("Engineer");

      // T2 (po only), T3 (none), T4 (none) → visible
      expectTicketVisible("Collab cursors");
      expectTicketVisible("PDF export");
      expectTicketVisible("Rate limiting");

      // T1 (has engineer), T5 (has engineer) → hidden
      expectTicketHidden("Dark mode toggle");
      expectTicketHidden("Search overhaul");
    });

    it("shows all tickets when no persona is selected in awaiting mode", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      fireEvent.click(
        screen.getByRole("button", { name: /Awaiting review/i })
      );

      // No persona selected → filter is inactive → all tickets shown
      expectTicketVisible("Dark mode toggle");
      expectTicketVisible("Collab cursors");
      expectTicketVisible("PDF export");
      expectTicketVisible("Rate limiting");
      expectTicketVisible("Search overhaul");
    });

    it("shows empty state when all tickets have feedback from the selected persona", () => {
      clearStorage();
      mockStorage.clear();
      const t = createTicket("Only ticket", "desc");
      addFeedback(t.id, "engineer", "feedback 1", true);

      renderDashboard();

      fireEvent.click(
        screen.getByRole("button", { name: /Awaiting review/i })
      );

      clickPersona("Engineer");

      // Only ticket has engineer feedback → none awaiting engineer review
      expect(
        screen.getByText("No tickets awaiting review by selected personas")
      ).toBeInTheDocument();
    });
  });

  // ── AC6: Persona counts shown on buttons ────────────────────────────

  describe("AC6 — Persona counts shown on buttons", () => {
    it("shows feedback entry counts on persona buttons", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      // Engineer has 2 feedback entries (T1, T5) → count "2"
      const engineerBtn = getPersonaButton("Engineer");
      expect(engineerBtn.textContent).toMatch(/2/);

      // Designer has 1 feedback entry (T1) → count "1"
      const designerBtn = getPersonaButton("Designer");
      expect(designerBtn.textContent).toMatch(/1/);

      // Product Owner has 1 feedback entry (T2) → count "1"
      const poBtn = getPersonaButton("Product Owner");
      expect(poBtn.textContent).toMatch(/1/);

      // QA has 1 feedback entry (T5) → count "1"
      const qaBtn = getPersonaButton("QA");
      expect(qaBtn.textContent).toMatch(/1/);
    });

    it("hides count badge when persona has no feedback entries", () => {
      clearStorage();
      mockStorage.clear();
      const t = createTicket("Solo ticket", "desc");
      addFeedback(t.id, "engineer", "feedback", true);

      renderDashboard();

      // QA has 0 feedback entries — count badge should NOT be rendered
      const qaBtn = getPersonaButton("QA");
      // The count badge is only rendered when count > 0 (conditional span).
      // There should be no count number next to "QA"
      expect(qaBtn.textContent).not.toMatch(/QA\s*\d/);
    });

    it("updates counts when status filter changes", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      // All tickets: engineer count = 2 (T1, T5)
      const engineerBtnAll = getPersonaButton("Engineer");
      expect(engineerBtnAll.textContent).toMatch(/2/);

      // Filter to draft only: only T3, T4 — no engineer feedback
      fireEvent.click(screen.getByRole("button", { name: /Draft/ }));

      // After filtering to draft, engineer count is 0, badge hidden
      const engineerBtnDraft = getPersonaButton("Engineer");
      expect(engineerBtnDraft.textContent).not.toMatch(/Engineer\s*\d/);
    });
  });

  // ── AC7: AND logic with status/priority/search filters ──────────────

  describe("AC7 — AND logic with status, priority, and search filters", () => {
    it("combines persona filter with status filter (AND)", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      // Filter to "In Review" status
      fireEvent.click(screen.getByRole("button", { name: /In Review/ }));

      // Should show T1, T2, T5 (all in-review)
      expectTicketVisible("Dark mode toggle");
      expectTicketVisible("Collab cursors");
      expectTicketVisible("Search overhaul");
      expectTicketHidden("PDF export");
      expectTicketHidden("Rate limiting");

      // Add persona filter: Engineer
      clickPersona("Engineer");

      // AND: in-review AND engineer feedback → T1, T5 only
      expectTicketVisible("Dark mode toggle");
      expectTicketVisible("Search overhaul");
      expectTicketHidden("Collab cursors");
    });

    it("combines persona filter with priority filter (AND)", () => {
      clearStorage();
      mockStorage.clear();

      const t1 = createTicket("Urgent bug", "Fix critical issue", 0);
      addFeedback(t1.id, "engineer", "Must fix", true);
      const t2 = createTicket("Nice to have", "Low priority feature", 3);
      addFeedback(t2.id, "designer", "Looks good", true);
      const t3 = createTicket("Regular task", "Normal priority", 2);
      addFeedback(t3.id, "engineer", "Standard", true);

      renderDashboard();

      // Click the priority "Urgent" button in the priority filter row.
      // Use getByRole scoped to the priority filter: target <button> with exact text "Urgent".
      const priorityButtons = screen.getAllByRole("button", {
        name: /^Urgent$/,
      });
      // There are two: one in priority filter, one as ticket badge (but badge is a <span>, not button).
      // Actually the priority filter has `<button>Urgent</button>` and the ticket card
      // priority badge is `<span class="badge ...">Urgent</span>`, so only the filter
      // button should match getByRole("button").
      expect(priorityButtons).toHaveLength(1);
      fireEvent.click(priorityButtons[0]);

      // Only T1 (Urgent priority) visible
      expectTicketVisible("Urgent bug");
      expectTicketHidden("Nice to have");
      expectTicketHidden("Regular task");

      // Add persona filter: Engineer → T1 has engineer feedback → still visible
      clickPersona("Engineer");
      expectTicketVisible("Urgent bug");

      // Switch persona to Designer → T1 has no designer feedback → AND fails
      clickPersona("Engineer"); // deselect
      clickPersona("Designer");
      expect(
        screen.getByText("No tickets reviewed by selected personas")
      ).toBeInTheDocument();
    });

    it("combines persona filter with search filter (AND)", () => {
      // Use fake timers so we can control the 300ms search debounce.
      // Must be called BEFORE setupTicketsWithFeedback/renderDashboard
      // so the component's useEffect setTimeout is captured.
      vi.useFakeTimers();
      setupTicketsWithFeedback();
      renderDashboard();

      // Search for "dark" — triggers a debounced update (300ms setTimeout)
      const searchInput = screen.getByPlaceholderText(
        "Search tickets by title or description..."
      );
      fireEvent.change(searchInput, { target: { value: "dark" } });

      // Flush the 300ms debounce timer so the filtered state renders
      act(() => {
        vi.advanceTimersByTime(350);
      });

      // After debounce, "Dark mode toggle" should be visible,
      // "Collab cursors" should be hidden
      expect(screen.queryByText("Collab cursors")).toBeNull();
      expect(screen.getByText("Dark mode toggle")).toBeInTheDocument();

      // AND with persona filter: Product Owner
      // "Dark mode toggle" has engineer+designer feedback, NOT product-owner
      clickPersona("Product Owner");

      // Should show empty state (search takes priority in messages)
      expect(
        screen.getByText("No tickets match your search")
      ).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  // ── AC8: Empty state for persona filter ─────────────────────────────

  describe("AC8 — Empty state for persona filter", () => {
    it("shows 'No tickets reviewed by selected personas' in reviewed-by mode", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      fireEvent.click(screen.getByRole("button", { name: /Draft/ }));
      clickPersona("Engineer");

      expect(
        screen.getByText("No tickets reviewed by selected personas")
      ).toBeInTheDocument();
    });

    it("shows 'No tickets awaiting review by selected personas' in awaiting mode", () => {
      clearStorage();
      mockStorage.clear();
      const t = createTicket("Only ticket", "desc");
      addFeedback(t.id, "engineer", "feedback", true);

      renderDashboard();

      fireEvent.click(
        screen.getByRole("button", { name: /Awaiting review/i })
      );

      clickPersona("Engineer");

      expect(
        screen.getByText("No tickets awaiting review by selected personas")
      ).toBeInTheDocument();
    });

    it("shows helpful description text in the empty state", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      fireEvent.click(screen.getByRole("button", { name: /Draft/ }));
      clickPersona("Engineer");

      expect(
        screen.getByText("Try selecting different personas or switching modes.")
      ).toBeInTheDocument();
    });
  });

  // ── AC9: No new files or components ─────────────────────────────────

  describe("AC9 — No new files or components (all inline in page.tsx)", () => {
    it("persona filter UI renders inline without a separate component import", () => {
      setupTicketsWithFeedback();
      renderDashboard();

      // Persona filter section label is rendered
      expect(screen.getByText("Persona:")).toBeInTheDocument();

      // All 4 persona buttons exist (as direct inline elements in page.tsx)
      const personas = getAllPersonas();
      for (const persona of personas) {
        expect(
          screen.getByRole("button", { name: new RegExp(persona.label, "i") })
        ).toBeInTheDocument();
      }

      // Verify the persona filter row is sandwiched between priority filter
      // and ticket list — confirmed by AC1 ordering test
    });
  });
});
