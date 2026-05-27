import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { parseMarkdown, MarkdownPreview } from "../MarkdownPreview";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  AnimatePresence: ({
    children,
  }: {
    children: React.ReactNode;
    mode?: string;
  }) => <div data-testid="animate-presence">{children}</div>,
  motion: {
    div: ({
      children,
      dangerouslySetInnerHTML,
      ...props
    }: React.ComponentProps<"div"> & {
      key?: React.Key;
      dangerouslySetInnerHTML?: { __html: string };
    }) => (
      <div
        data-testid="preview-container"
        dangerouslySetInnerHTML={dangerouslySetInnerHTML}
        {...props}
      >
        {children}
      </div>
    ),
    textarea: ({
      children,
      value,
      placeholder,
      onChange,
      ...props
    }: React.ComponentProps<"textarea"> & { key?: React.Key }) => (
      <textarea
        data-testid="edit-textarea"
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        {...props}
      >
        {children}
      </textarea>
    ),
  },
}));

// ============================================================================
// parseMarkdown unit tests
// ============================================================================

describe("parseMarkdown", () => {
  describe("formatting", () => {
    it("renders bold text with ** markers", () => {
      const result = parseMarkdown("hello **world** here");
      expect(result).toContain("<strong");
      expect(result).toContain("world");
    });

    it("renders italic text with * markers", () => {
      const result = parseMarkdown("hello *world* here");
      expect(result).toContain("<em");
      expect(result).toContain("world");
    });

    it("renders inline code with backtick markers", () => {
      const result = parseMarkdown("use `const x = 1` here");
      expect(result).toContain('<code class="bg-overlay');
      expect(result).toContain("const x = 1");
    });

    it("renders a standard https link", () => {
      const result = parseMarkdown("[GitHub](https://github.com)");
      expect(result).toContain('href="https://github.com"');
      expect(result).toContain("GitHub");
    });

    it("renders code blocks with triple backticks", () => {
      const result = parseMarkdown("```\nconst hello = 'world';\nconsole.log(hello);\n```");
      expect(result).toContain("<pre");
      expect(result).toContain("<code");
      expect(result).toContain("hello");
      expect(result).toContain("console.log");
    });

    it("renders unordered lists", () => {
      const result = parseMarkdown("- Item one\n- Item two");
      expect(result).toContain("<ul");
      expect(result).toContain("<li");
      expect(result).toContain("Item one");
      expect(result).toContain("Item two");
    });

    it("renders ordered lists", () => {
      const result = parseMarkdown("1. First\n2. Second");
      expect(result).toContain("<ol");
      expect(result).toContain("<li");
      expect(result).toContain("First");
      expect(result).toContain("Second");
    });

    it("returns empty string for empty input", () => {
      const result = parseMarkdown("");
      expect(result).toBe("");
    });

    it("returns empty string for whitespace-only input", () => {
      const result = parseMarkdown("   \n  \n  ");
      expect(result).toBe("");
    });
  });

  describe("security: link URL sanitization", () => {
    it('replaces javascript: URLs with href="#"', () => {
      const result = parseMarkdown("[click](javascript:alert(1))");
      expect(result).toContain('href="#"');
      expect(result).not.toContain("javascript:");
    });

    it('replaces data: URLs with href="#"', () => {
      const result = parseMarkdown('[x](data:text/html,<script>alert(1)</script>)');
      expect(result).toContain('href="#"');
      expect(result).not.toContain("data:");
    });

    it("allows https: URLs through unchanged", () => {
      const result = parseMarkdown("[safe](https://example.com/page)");
      expect(result).toContain('href="https://example.com/page"');
    });

    it("allows http: URLs through unchanged", () => {
      const result = parseMarkdown("[safe](http://example.com)");
      expect(result).toContain('href="http://example.com"');
    });

    it("allows mailto: URLs through unchanged", () => {
      const result = parseMarkdown("[email](mailto:user@example.com)");
      expect(result).toContain('href="mailto:user@example.com"');
    });

    it("allows relative URLs starting with / through unchanged", () => {
      const result = parseMarkdown("[home](/dashboard)");
      expect(result).toContain('href="/dashboard"');
    });

    it("allows anchor links starting with # through unchanged", () => {
      const result = parseMarkdown("[section](#features)");
      expect(result).toContain('href="#features"');
    });

    it('blocks vbscript: URLs', () => {
      const result = parseMarkdown('[x](vbscript:msgbox(1))');
      expect(result).toContain('href="#"');
      expect(result).not.toContain("vbscript:");
    });

    it("blocks unknown protocol URLs", () => {
      const result = parseMarkdown('[x](ftp://evil.com)');
      expect(result).toContain('href="#"');
    });
  });
});

// ============================================================================
// MarkdownPreview component tests
// ============================================================================

describe("MarkdownPreview component", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the toggle button with 'Preview' label initially", () => {
    render(<MarkdownPreview {...defaultProps} />);
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("toggles from edit to preview mode on button click", () => {
    render(<MarkdownPreview {...defaultProps} value="**bold text**" />);

    // Initially in edit mode — textarea should be visible
    expect(screen.getByTestId("edit-textarea")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();

    // Click to toggle to preview mode
    fireEvent.click(screen.getByText("Preview"));

    // Now button should say "Edit"
    expect(screen.getByText("Edit")).toBeInTheDocument();
    // Preview container should be visible
    expect(screen.getByTestId("preview-container")).toBeInTheDocument();
    // Rendered markdown should include the bold text
    expect(screen.getByTestId("preview-container").innerHTML).toContain(
      "bold text"
    );
  });

  it("toggles back to edit mode from preview mode", () => {
    render(<MarkdownPreview {...defaultProps} value="some text" />);

    // Go to preview
    fireEvent.click(screen.getByText("Preview"));
    expect(screen.getByText("Edit")).toBeInTheDocument();

    // Go back to edit
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByTestId("edit-textarea")).toBeInTheDocument();
  });

  it("shows 'Nothing to preview' when value is empty in preview mode", () => {
    render(<MarkdownPreview {...defaultProps} value="" />);

    fireEvent.click(screen.getByText("Preview"));

    expect(screen.getByTestId("preview-container").innerHTML).toContain(
      "Nothing to preview"
    );
  });

  it("calls onChange when user types in textarea", () => {
    const onChange = vi.fn();
    render(<MarkdownPreview {...defaultProps} onChange={onChange} />);

    const textarea = screen.getByTestId("edit-textarea");
    fireEvent.change(textarea, { target: { value: "new text" } });

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
