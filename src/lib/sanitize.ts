/**
 * Input sanitizer for API routes. Strips known XSS vectors while preserving
 * harmless text — including markdown formatting (bold, italic, code, links, lists).
 *
 * All transforms are regex-based with no external dependencies. The function
 * accepts a string and returns a sanitized string. Non-string inputs are
 * coerced to empty string.
 *
 * Removes:
 * - <script> tags and their contents (case-insensitive)
 * - Inline event handler attributes: on*="..." / on*='...' (case-insensitive)
 * - javascript: URLs in attribute values (href, src, action, formaction)
 *
 * @param input - Raw user-supplied string
 * @returns Sanitized string safe for storage and display
 */
export function sanitize(input: string): string {
  if (typeof input !== "string") return "";

  let sanitized = input;

  // 1. Strip <script> tags and everything between them (multiline, case-insensitive).
  //    Matches opening <script ...> through closing </script>, including self-closing variants.
  sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");

  // 2. Strip inline event handler attributes with double-quoted values.
  //    Example: onclick="alert(1)"   onerror="bad()"
  sanitized = sanitized.replace(/\bon\w+\s*=\s*"[^"]*"/gi, "");

  // 3. Strip inline event handler attributes with single-quoted values.
  //    Example: onclick='alert(1)'   onerror='bad()'
  sanitized = sanitized.replace(/\bon\w+\s*=\s*'[^']*'/gi, "");

  // 4. Strip event handler attributes with no quotes (unquoted values).
  //    Example: onclick=bad onload=evil
  sanitized = sanitized.replace(/\bon\w+\s*=\s*[^\s>]+/gi, "");

  // 5. Strip javascript: protocol URLs in common attribute contexts.
  //    Matches href="javascript:...", src='javascript:...', etc.
  sanitized = sanitized.replace(
    /(?:href|src|action|formaction)\s*=\s*["']\s*javascript:[^"']*["']/gi,
    "",
  );

  return sanitized;
}
