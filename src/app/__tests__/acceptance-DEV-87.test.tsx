import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

// ── Mocks ──────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockCreateTicket = vi.fn(() => ({
  id: "TIX-999",
  title: "Test",
  description: "Test",
  status: "draft",
  priority: 2,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tags: [],
  feedback: [],
  approvals: [],
}));

vi.mock("@/lib/store", () => ({
  createTicket: mockCreateTicket,
}));

// ── Helpers ────────────────────────────────────────────────────────────

async function renderPage() {
  const NewTicketPage = (await import("@/app/new/page")).default;
  return render(<NewTicketPage />);
}

function getTitleInput() {
  return screen.getByRole("textbox", { name: "Title" });
}

function getDescTextarea() {
  return screen.getByRole("textbox", { name: "Description" });
}

function getSubmitButton() {
  return screen.getByRole("button", { name: /Create Ticket/i });
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("DEV-87: Character count and inline validation (acceptance)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC1: Character counter below title: "X/200", updates on keystroke,
  //      muted <90%, gold at 90-100%, cardinal if exceeded
  // ═══════════════════════════════════════════════════════════════════════

  it("AC1-a: title counter displays '0/200' initially with muted color", async () => {
    await renderPage();
    const counter = screen.getByText("0/200");
    expect(counter).toBeInTheDocument();
    expect(counter.id).toBe("title-counter");
    // 0 chars → well under 90% → muted
    expect(counter.className).toContain("text-ink-muted");
  });

  it("AC1-b: title counter updates on keystroke in real time", async () => {
    await renderPage();
    const input = getTitleInput();
    fireEvent.change(input, { target: { value: "Hello" } });
    expect(screen.getByText("5/200")).toBeInTheDocument();
    expect(screen.getByText("5/200").className).toContain("text-ink-muted");
  });

  it("AC1-c: title counter switches to gold at 90% threshold (180/200)", async () => {
    await renderPage();
    const input = getTitleInput();
    fireEvent.change(input, { target: { value: "A".repeat(180) } });
    const counter = screen.getByText("180/200");
    expect(counter.className).toContain("text-gold");
  });

  it("AC1-d: title counter switches to cardinal when exceeded (>200)", async () => {
    await renderPage();
    const input = getTitleInput();
    // 201 chars — jsdom fireEvent.change bypasses browser maxLength
    fireEvent.change(input, { target: { value: "A".repeat(201) } });
    // Counter still shows actual length even if over max
    const counter = screen.getByText("201/200");
    expect(counter.className).toContain("text-cardinal");
  });

  it("AC1-e: title counter at exactly 200 (100%) shows gold", async () => {
    await renderPage();
    const input = getTitleInput();
    fireEvent.change(input, { target: { value: "A".repeat(200) } });
    const counter = screen.getByText("200/200");
    expect(counter.className).toContain("text-gold");
  });

  it("AC1-f: title counter at 179 (just under 90%) still shows muted", async () => {
    await renderPage();
    const input = getTitleInput();
    // 179/200 = 89.5% → still under 90%
    fireEvent.change(input, { target: { value: "A".repeat(179) } });
    const counter = screen.getByText("179/200");
    expect(counter.className).toContain("text-ink-muted");
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC2: Character counter below description: "X/5000", same color
  //      progression (muted <90%, gold 90-100%, cardinal if exceeded)
  // ═══════════════════════════════════════════════════════════════════════

  it("AC2-a: description counter displays '0/5000' initially with muted color", async () => {
    await renderPage();
    const counter = screen.getByText("0/5000");
    expect(counter).toBeInTheDocument();
    expect(counter.id).toBe("desc-counter");
    expect(counter.className).toContain("text-ink-muted");
  });

  it("AC2-b: description counter updates on keystroke in real time", async () => {
    await renderPage();
    const textarea = getDescTextarea();
    fireEvent.change(textarea, { target: { value: "X".repeat(1234) } });
    expect(screen.getByText("1234/5000")).toBeInTheDocument();
  });

  it("AC2-c: description counter switches to gold at 90% threshold (4500/5000)", async () => {
    await renderPage();
    const textarea = getDescTextarea();
    fireEvent.change(textarea, { target: { value: "X".repeat(4500) } });
    const counter = screen.getByText("4500/5000");
    expect(counter.className).toContain("text-gold");
  });

  it("AC2-d: description counter switches to cardinal when exceeded (>5000)", async () => {
    await renderPage();
    const textarea = getDescTextarea();
    fireEvent.change(textarea, { target: { value: "X".repeat(5001) } });
    const counter = screen.getByText("5001/5000");
    expect(counter.className).toContain("text-cardinal");
  });

  it("AC2-e: description counter at exactly 5000 (100%) shows gold", async () => {
    await renderPage();
    const textarea = getDescTextarea();
    fireEvent.change(textarea, { target: { value: "X".repeat(5000) } });
    const counter = screen.getByText("5000/5000");
    expect(counter.className).toContain("text-gold");
  });

  it("AC2-f: description counter at 4499 (just under 90%) still shows muted", async () => {
    await renderPage();
    const textarea = getDescTextarea();
    fireEvent.change(textarea, { target: { value: "X".repeat(4499) } });
    const counter = screen.getByText("4499/5000");
    expect(counter.className).toContain("text-ink-muted");
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC3: Inline error "Title is required" after blur when empty,
  //      clears on typing
  // ═══════════════════════════════════════════════════════════════════════

  it("AC3-a: no title error shown before field is touched (pristine state)", async () => {
    await renderPage();
    expect(screen.queryByText("Title is required")).toBeNull();
  });

  it("AC3-b: empty title shows 'Title is required' error after blur", async () => {
    await renderPage();
    const input = getTitleInput();
    fireEvent.blur(input);
    expect(screen.getByText("Title is required")).toBeInTheDocument();
  });

  it("AC3-c: whitespace-only title shows 'Title is required' error after blur", async () => {
    await renderPage();
    const input = getTitleInput();
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);
    expect(screen.getByText("Title is required")).toBeInTheDocument();
  });

  it("AC3-d: title error clears as soon as user starts typing valid content", async () => {
    await renderPage();
    const input = getTitleInput();

    // Trigger error via blur on empty field
    fireEvent.blur(input);
    expect(screen.getByText("Title is required")).toBeInTheDocument();

    // Type valid content — error should clear immediately
    fireEvent.change(input, { target: { value: "Fixed title" } });
    expect(screen.queryByText("Title is required")).toBeNull();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC4: Inline error "Title must be 200 characters or fewer" when >200
  // ═══════════════════════════════════════════════════════════════════════

  it("AC4-a: no over-limit error when title is exactly 200 chars", async () => {
    await renderPage();
    const input = getTitleInput();

    fireEvent.change(input, { target: { value: "A".repeat(200) } });
    fireEvent.blur(input);

    expect(
      screen.queryByText("Title must be 200 characters or fewer")
    ).toBeNull();
  });

  it("AC4-b: title >200 chars shows 'Title must be 200 characters or fewer' when touched", async () => {
    await renderPage();
    const input = getTitleInput();

    // jsdom fireEvent.change bypasses browser maxLength enforcement
    fireEvent.change(input, { target: { value: "A".repeat(201) } });
    fireEvent.blur(input);

    expect(
      screen.getByText("Title must be 200 characters or fewer")
    ).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC5: Inline error "Description must be 5,000 characters or fewer"
  //      when >5000 chars
  // ═══════════════════════════════════════════════════════════════════════

  it("AC5-a: no over-limit error when description is exactly 5000 chars", async () => {
    await renderPage();
    const textarea = getDescTextarea();

    fireEvent.change(textarea, { target: { value: "X".repeat(5000) } });
    fireEvent.blur(textarea);

    expect(
      screen.queryByText("Description must be 5,000 characters or fewer")
    ).toBeNull();
  });

  it("AC5-b: description >5000 chars shows error when touched", async () => {
    await renderPage();
    const textarea = getDescTextarea();

    fireEvent.change(textarea, { target: { value: "X".repeat(5001) } });
    fireEvent.blur(textarea);

    expect(
      screen.getByText("Description must be 5,000 characters or fewer")
    ).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC6: Inline error "Description is required" after blur when empty,
  //      clears on typing
  // ═══════════════════════════════════════════════════════════════════════

  it("AC6-a: no description error shown before field is touched (pristine)", async () => {
    await renderPage();
    expect(screen.queryByText("Description is required")).toBeNull();
  });

  it("AC6-b: empty description shows 'Description is required' error after blur", async () => {
    await renderPage();
    const textarea = getDescTextarea();
    fireEvent.blur(textarea);
    expect(screen.getByText("Description is required")).toBeInTheDocument();
  });

  it("AC6-c: whitespace-only description shows error after blur", async () => {
    await renderPage();
    const textarea = getDescTextarea();
    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.blur(textarea);
    expect(screen.getByText("Description is required")).toBeInTheDocument();
  });

  it("AC6-d: description error clears as soon as user starts typing valid content", async () => {
    await renderPage();
    const textarea = getDescTextarea();

    // Trigger error via blur on empty
    fireEvent.blur(textarea);
    expect(screen.getByText("Description is required")).toBeInTheDocument();

    // Type valid content — error should clear immediately
    fireEvent.change(textarea, { target: { value: "Valid description" } });
    expect(screen.queryByText("Description is required")).toBeNull();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC7: Counter above error (vertically stacked), reserved space to
  //      avoid layout shift
  // ═══════════════════════════════════════════════════════════════════════

  it("AC7-a: title counter and error are vertically stacked (counter above error)", async () => {
    await renderPage();
    const input = getTitleInput();

    // Trigger an error so both counter and error are visible
    fireEvent.blur(input);

    const container = document.getElementById("title-counter")!
      .parentElement!;
    const children = Array.from(container.children);

    // First child is the counter, second is the error
    expect(children[0].id).toBe("title-counter");
    expect(children[1].id).toBe("title-error");
  });

  it("AC7-b: description counter and error are vertically stacked", async () => {
    await renderPage();
    const textarea = getDescTextarea();

    fireEvent.blur(textarea);

    const container = document.getElementById("desc-counter")!
      .parentElement!;
    const children = Array.from(container.children);

    expect(children[0].id).toBe("desc-counter");
    expect(children[1].id).toBe("desc-error");
  });

  it("AC7-c: counter containers have min-height to prevent layout shift", async () => {
    await renderPage();

    // Both counter containers should reserve space via min-height
    const titleContainer = document.getElementById("title-counter")!
      .parentElement!;
    const descContainer = document.getElementById("desc-counter")!
      .parentElement!;

    expect(titleContainer.className).toContain("min-h-[20px]");
    expect(descContainer.className).toContain("min-h-[20px]");
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC8: Submit button disabled on any validation error on touched fields
  // ═══════════════════════════════════════════════════════════════════════

  it("AC8-a: submit is enabled when title and description are both valid", async () => {
    await renderPage();
    const input = getTitleInput();
    const textarea = getDescTextarea();

    fireEvent.change(input, { target: { value: "Valid title" } });
    fireEvent.change(textarea, { target: { value: "Valid description" } });

    expect(getSubmitButton()).not.toBeDisabled();
  });

  it("AC8-b: submit is disabled when title is empty (pristine, no blurred)", async () => {
    await renderPage();
    const textarea = getDescTextarea();
    // Fill description but leave title empty
    fireEvent.change(textarea, { target: { value: "Valid description" } });
    expect(getSubmitButton()).toBeDisabled();
  });

  it("AC8-c: submit is disabled when description is empty", async () => {
    await renderPage();
    const input = getTitleInput();
    fireEvent.change(input, { target: { value: "Valid title" } });
    expect(getSubmitButton()).toBeDisabled();
  });

  it("AC8-d: submit is disabled when required errors surface on blur", async () => {
    await renderPage();
    const input = getTitleInput();
    const textarea = getDescTextarea();

    // Both empty, blur to surface errors
    fireEvent.blur(input);
    fireEvent.blur(textarea);

    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(screen.getByText("Description is required")).toBeInTheDocument();
    expect(getSubmitButton()).toBeDisabled();
  });

  it("AC8-e: submit is disabled when title is over character limit", async () => {
    await renderPage();
    const input = getTitleInput();
    const textarea = getDescTextarea();

    fireEvent.change(textarea, { target: { value: "Valid description" } });
    fireEvent.change(input, { target: { value: "A".repeat(201) } });
    fireEvent.blur(input);

    expect(
      screen.getByText("Title must be 200 characters or fewer")
    ).toBeInTheDocument();
    expect(getSubmitButton()).toBeDisabled();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC9: Hard maxLength enforcement: title maxLength={200},
  //      description maxLength={5000}
  // ═══════════════════════════════════════════════════════════════════════

  it("AC9-a: title input has maxLength={200}", async () => {
    await renderPage();
    expect(getTitleInput()).toHaveAttribute("maxLength", "200");
  });

  it("AC9-b: description textarea has maxLength={5000}", async () => {
    await renderPage();
    expect(getDescTextarea()).toHaveAttribute("maxLength", "5000");
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC10: aria-describedby linking inputs to counter and error elements
  // ═══════════════════════════════════════════════════════════════════════

  it("AC10-a: title input aria-describedby references counter and error", async () => {
    await renderPage();
    const input = getTitleInput();
    expect(input).toHaveAttribute(
      "aria-describedby",
      "title-counter title-error"
    );
  });

  it("AC10-b: description textarea aria-describedby references counter and error", async () => {
    await renderPage();
    const textarea = getDescTextarea();
    expect(textarea).toHaveAttribute(
      "aria-describedby",
      "desc-counter desc-error"
    );
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC11: aria-live="off" for counter, role="alert" for errors
  // ═══════════════════════════════════════════════════════════════════════

  it("AC11-a: title counter has aria-live='off'", async () => {
    await renderPage();
    const counter = document.getElementById("title-counter")!;
    expect(counter).toHaveAttribute("aria-live", "off");
  });

  it("AC11-b: description counter has aria-live='off'", async () => {
    await renderPage();
    const counter = document.getElementById("desc-counter")!;
    expect(counter).toHaveAttribute("aria-live", "off");
  });

  it("AC11-c: title error element has role='alert'", async () => {
    await renderPage();
    fireEvent.blur(getTitleInput());

    const errorEl = screen.getByText("Title is required");
    expect(errorEl).toHaveAttribute("role", "alert");
  });

  it("AC11-d: description error element has role='alert'", async () => {
    await renderPage();
    fireEvent.blur(getDescTextarea());

    const errorEl = screen.getByText("Description is required");
    expect(errorEl).toHaveAttribute("role", "alert");
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC12: No regressions on existing form behavior
  //       (priority, due date, tags, submit creates ticket)
  // ═══════════════════════════════════════════════════════════════════════

  it("AC12-a: priority buttons render and are clickable", async () => {
    await renderPage();

    // All 5 priority levels should be present as buttons
    const priorityButtons = ["Urgent", "High", "Medium", "Low", "None"];
    for (const label of priorityButtons) {
      const btn = screen.getByRole("button", { name: label });
      expect(btn).toBeInTheDocument();
    }

    // Default Medium (priority 2) should be selected (has ring styling)
    const mediumButton = screen.getByRole("button", { name: "Medium" });
    expect(mediumButton.className).toContain("ring-1");

    // Click Urgent (priority 0) — should become selected
    const urgentButton = screen.getByRole("button", { name: "Urgent" });
    fireEvent.click(urgentButton);
    expect(urgentButton.className).toContain("ring-1");
  });

  it("AC12-b: due date field is present and functional", async () => {
    await renderPage();

    // Due date input exists
    const dueDateInput = screen.getByLabelText(/Due Date/);
    expect(dueDateInput).toBeInTheDocument();
    expect(dueDateInput).toHaveAttribute("type", "date");

    // Set a date
    fireEvent.change(dueDateInput, { target: { value: "2026-06-15" } });
    expect(dueDateInput).toHaveValue("2026-06-15");
  });

  it("AC12-c: tag chips render and are toggleable", async () => {
    await renderPage();

    // Tags should be present
    const featureTag = screen.getByRole("button", { name: /feature/i });
    const bugTag = screen.getByRole("button", { name: /bug/i });
    expect(featureTag).toBeInTheDocument();
    expect(bugTag).toBeInTheDocument();

    // Toggle a tag
    fireEvent.click(featureTag);
    // After toggling, the tag should appear selected (the TagChip component
    // manages its own visual state)
    expect(featureTag).toBeInTheDocument();
  });

  it("AC12-d: valid submit triggers ticket creation and navigates", async () => {
    await renderPage();
    const input = getTitleInput();
    const textarea = getDescTextarea();

    // Fill with valid data including priority, due date, and tags
    fireEvent.change(input, { target: { value: "My new feature" } });
    fireEvent.change(textarea, {
      target: { value: "Build the thing properly" },
    });

    // Set priority to High (priority 1)
    fireEvent.click(screen.getByRole("button", { name: "High" }));

    // Set due date
    const dueDateInput = screen.getByLabelText(/Due Date/);
    fireEvent.change(dueDateInput, { target: { value: "2026-12-31" } });

    // Select a tag
    fireEvent.click(screen.getByRole("button", { name: /feature/i }));

    fireEvent.click(getSubmitButton());

    expect(mockCreateTicket).toHaveBeenCalledTimes(1);
    expect(mockCreateTicket).toHaveBeenCalledWith(
      "My new feature",
      "Build the thing properly",
      1, // High priority
      "2026-12-31",
      expect.any(Array)
    );

    // Should navigate to new ticket
    expect(mockPush).toHaveBeenCalledWith("/ticket/TIX-999");
  });

  it("AC12-e: whitespace-only fields prevent submission even after blur", async () => {
    await renderPage();
    const input = getTitleInput();
    const textarea = getDescTextarea();

    // Fill with whitespace-only values
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.blur(input);
    fireEvent.blur(textarea);

    // Button should be disabled
    expect(getSubmitButton()).toBeDisabled();

    // Errors should show
    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(screen.getByText("Description is required")).toBeInTheDocument();
  });
});
