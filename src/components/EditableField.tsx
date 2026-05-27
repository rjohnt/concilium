"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";

interface EditableFieldProps {
  value: string;
  onSave: (newValue: string) => void;
  label: string;
  type?: "input" | "textarea";
  placeholder?: string;
  className?: string;
  displayClassName?: string;
}

export function EditableField({
  value,
  onSave,
  label,
  type = "input",
  placeholder = "",
  className = "",
  displayClassName = "",
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync draft when value changes externally
  useEffect(() => {
    setDraft(value);
  }, [value]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editing) {
      if (type === "textarea") {
        textareaRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    }
  }, [editing, type]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError(`${label} cannot be empty`);
      return;
    }
    if (trimmed !== value) {
      onSave(trimmed);
    }
    setEditing(false);
    setError(null);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && type === "input") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
    // Allow Shift+Enter for newlines in textarea
    if (e.key === "Enter" && e.shiftKey && type === "textarea") {
      return; // allow newline
    }
  };

  if (editing) {
    return (
      <div className={`${className}`}>
        {type === "textarea" ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={4}
            className="w-full bg-[#1a1714] border border-gold/40 rounded-lg px-3 py-2 text-ink-primary placeholder:text-ink-muted/50 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 resize-y text-sm leading-relaxed"
            aria-label={label}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-[#1a1714] border border-gold/40 rounded-lg px-3 py-2 text-ink-primary placeholder:text-ink-muted/50 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 text-2xl font-bold"
            aria-label={label}
          />
        )}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gold hover:bg-gold-light text-[#1a1714] transition-colors"
            aria-label={`Save ${label}`}
          >
            <Check size={14} />
            Save
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-elevated hover:bg-overlay text-ink-secondary hover:text-ink-primary border border-border-visible transition-colors"
            aria-label={`Cancel editing ${label}`}
          >
            <X size={14} />
            Cancel
          </button>
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`group relative ${className}`}>
      <div className={displayClassName}>{value || <span className="text-ink-muted italic">{placeholder}</span>}</div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        className="absolute -right-2 -top-1 p-1.5 rounded-lg text-ink-muted opacity-0 group-hover:opacity-100 hover:text-gold-light hover:bg-elevated transition-all focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gold/30"
        aria-label={`Edit ${label}`}
      >
        <Pencil size={14} />
      </button>
    </div>
  );
}
