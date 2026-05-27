"use client";

import { useState, useMemo } from "react";
import { Eye, Edit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MarkdownPreviewProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  textareaClassName?: string;
  previewClassName?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

function parseMarkdown(markdown: string): string {
  if (!markdown.trim()) return "";

  const lines = markdown.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let inUl = false;
  let inOl = false;

  for (const line of lines) {
    // Code block start/end
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        result.push(
          `<pre class="bg-deep/80 rounded-lg p-3 my-2 overflow-x-auto border border-border-subtle"><code class="text-sm font-mono text-ink-primary">${escapeHtml(codeBlockContent.join("\n"))}</code></pre>`
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Empty line — close lists
    if (line.trim() === "") {
      if (inUl) { result.push("</ul>"); inUl = false; }
      if (inOl) { result.push("</ol>"); inOl = false; }
      continue;
    }

    // Process inline formatting (order matters: code before bold/italic)
    let processed = escapeHtml(line);

    // Inline code (must run before bold/italic to avoid matching * inside code)
    processed = processed.replace(
      /`([^`]+)`/g,
      '<code class="bg-overlay px-1.5 py-0.5 rounded text-xs font-mono text-gold-light">$1</code>'
    );

    // Bold
    processed = processed.replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="font-semibold text-ink-primary">$1</strong>'
    );

    // Italic (run after bold so ** isn't partially matched)
    processed = processed.replace(
      /\*(.+?)\*/g,
      '<em class="italic text-ink-secondary">$1</em>'
    );

    // Links [text](url)
    processed = processed.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-gold hover:text-gold-light underline decoration-gold/40 hover:decoration-gold">$1</a>'
    );

    // Headings
    if (/^### (.+)/.test(processed)) {
      if (inUl) { result.push("</ul>"); inUl = false; }
      if (inOl) { result.push("</ol>"); inOl = false; }
      processed = processed.replace(
        /^### (.+)/,
        '<h3 class="text-base font-semibold text-ink-primary mt-3 mb-1">$1</h3>'
      );
      result.push(processed);
    } else if (/^## (.+)/.test(processed)) {
      if (inUl) { result.push("</ul>"); inUl = false; }
      if (inOl) { result.push("</ol>"); inOl = false; }
      processed = processed.replace(
        /^## (.+)/,
        '<h2 class="text-lg font-semibold text-ink-primary mt-3 mb-1">$1</h2>'
      );
      result.push(processed);
    } else if (/^# (.+)/.test(processed)) {
      if (inUl) { result.push("</ul>"); inUl = false; }
      if (inOl) { result.push("</ol>"); inOl = false; }
      processed = processed.replace(
        /^# (.+)/,
        '<h1 class="text-xl font-bold text-ink-primary mt-3 mb-2">$1</h1>'
      );
      result.push(processed);
    } else if (/^[\-\*] (.+)/.test(processed)) {
      // Unordered list
      if (inOl) { result.push("</ol>"); inOl = false; }
      if (!inUl) { result.push('<ul class="list-disc list-outside pl-5 space-y-0.5 my-1 marker:text-ink-muted">'); inUl = true; }
      processed = processed.replace(
        /^[\-\*] (.+)/,
        '<li class="text-ink-secondary pl-1">$1</li>'
      );
      result.push(processed);
    } else if (/^\d+\. (.+)/.test(processed)) {
      // Ordered list
      if (inUl) { result.push("</ul>"); inUl = false; }
      if (!inOl) { result.push('<ol class="list-decimal list-outside pl-5 space-y-0.5 my-1 marker:text-ink-muted">'); inOl = true; }
      processed = processed.replace(
        /^\d+\. (.+)/,
        '<li class="text-ink-secondary pl-1">$1</li>'
      );
      result.push(processed);
    } else {
      // Regular paragraph
      if (inUl) { result.push("</ul>"); inUl = false; }
      if (inOl) { result.push("</ol>"); inOl = false; }
      result.push(`<p class="text-ink-secondary leading-relaxed">${processed}</p>`);
    }
  }

  // Close any remaining open blocks
  if (inUl) result.push("</ul>");
  if (inOl) result.push("</ol>");
  if (inCodeBlock && codeBlockContent.length > 0) {
    result.push(
      `<pre class="bg-deep/80 rounded-lg p-3 my-2 overflow-x-auto border border-border-subtle"><code class="text-sm font-mono text-ink-primary">${escapeHtml(codeBlockContent.join("\n"))}</code></pre>`
    );
  }

  return result.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function MarkdownPreview({
  value,
  onChange,
  placeholder,
  rows = 4,
  className = "",
  textareaClassName = "",
  previewClassName = "",
  textareaRef,
  onKeyDown,
}: MarkdownPreviewProps) {
  const [previewMode, setPreviewMode] = useState(false);

  const renderedHtml = useMemo(() => parseMarkdown(value), [value]);

  return (
    <div className={className}>
      {/* Toolbar: toggle + hint */}
      <div className="flex items-center justify-end gap-2 mb-1.5">
        <span className="text-[11px] text-ink-muted/70 select-none">
          Markdown supported
        </span>
        <button
          type="button"
          onClick={() => setPreviewMode((p) => !p)}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-ink-muted hover:text-ink-primary hover:bg-elevated transition-colors select-none"
        >
          {previewMode ? (
            <>
              <Edit size={12} />
              Edit
            </>
          ) : (
            <>
              <Eye size={12} />
              Preview
            </>
          )}
        </button>
      </div>

      {/* Content area */}
      <AnimatePresence mode="wait">
        {previewMode ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.995 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.995 }}
            transition={{ duration: 0.12 }}
            className={`w-full rounded-lg px-4 py-3 text-sm overflow-y-auto ${previewClassName}`}
            style={{ minHeight: `${Math.max(rows * 24 + 24, 60)}px` }}
            dangerouslySetInnerHTML={{
              __html:
                renderedHtml ||
                '<p class="text-ink-muted italic text-sm">Nothing to preview</p>',
            }}
          />
        ) : (
          <motion.textarea
            key="edit"
            initial={{ opacity: 0, scale: 0.995 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.995 }}
            transition={{ duration: 0.12 }}
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={rows}
            className={`w-full rounded-lg px-4 py-3 text-sm resize-none ${textareaClassName}`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
