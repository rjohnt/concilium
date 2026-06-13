"use client";

import { useState, useEffect, useCallback } from "react";
import { PersonaId } from "@/lib/types";
import { getAllPersonas, PERSONAS } from "@/lib/personas";
import { getTemplate, setTemplate, resetTemplate, getAllTemplates } from "@/lib/templateStore";
import { X, RotateCcw, Eye, Settings, Copy, Check } from "lucide-react";

// Persona-aware accent colors matching the app's palette
const PERSONA_ACCENTS: Record<PersonaId, string> = {
  engineer: "border-[color-mix(in_oklab,var(--persona-eng-500)_50%,transparent)] bg-[var(--persona-eng-50)] text-[var(--persona-eng-500)]",
  designer: "border-[color-mix(in_oklab,var(--persona-des-500)_50%,transparent)] bg-[var(--persona-des-50)] text-[var(--persona-des-500)]",
  "product-owner": "border-[color-mix(in_oklab,var(--persona-prod-500)_50%,transparent)] bg-[var(--persona-prod-50)] text-[var(--persona-prod-500)]",
  qa: "border-[color-mix(in_oklab,var(--persona-res-500)_50%,transparent)] bg-[var(--persona-res-50)] text-[var(--persona-res-500)]",
};

const PERSONA_TAB_ACCENTS: Record<PersonaId, string> = {
  engineer:
    "data-[state=active]:border-[var(--persona-eng-500)] data-[state=active]:text-[var(--persona-eng-500)]",
  designer:
    "data-[state=active]:border-[var(--persona-des-500)] data-[state=active]:text-[var(--persona-des-500)]",
  "product-owner":
    "data-[state=active]:border-[var(--persona-prod-500)] data-[state=active]:text-[var(--persona-prod-500)]",
  qa: "data-[state=active]:border-[var(--persona-res-500)] data-[state=active]:text-[var(--persona-res-500)]",
};

// Sample values for template variable preview
const SAMPLE_VALUES: Record<string, string> = {
  "{{ticket.title}}": "Add dark mode toggle to settings",
  "{{ticket.description}}":
    "Users want a toggle in the settings panel to switch between light and dark themes. The preference should persist across sessions.",
  "{{otherFeedback}}":
    "Designer: Dark mode should follow the existing design tokens.\nProduct Owner: High priority — top user request.\nQA: Needs cross-browser and accessibility testing.",
  "{{persona.name}}": "Engineer",
  "{{persona.expertise}}":
    "Technical feasibility, architecture, implementation approach, and code quality.",
};

const VARIABLE_HINTS = [
  "{{ticket.title}}",
  "{{ticket.description}}",
  "{{otherFeedback}}",
  "{{persona.name}}",
  "{{persona.expertise}}",
];

interface TemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateEditor({ isOpen, onClose }: TemplateEditorProps) {
  const [activePersona, setActivePersona] = useState<PersonaId>("engineer");
  const [editingText, setEditingText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [customized, setCustomized] = useState<Record<PersonaId, boolean>>({} as Record<PersonaId, boolean>);
  const [savedFlash, setSavedFlash] = useState(false);
  const [copiedHint, setCopiedHint] = useState<string | null>(null);

  const personas = getAllPersonas();

  // Load templates and track which are customized
  const refreshState = useCallback(() => {
    const templates = getAllTemplates();
    const currentCustomized = {} as Record<PersonaId, boolean>;
    for (const p of personas) {
      currentCustomized[p.id] = templates[p.id] !== PERSONAS[p.id].promptTemplate;
    }
    setCustomized(currentCustomized);
    setEditingText(templates[activePersona] ?? PERSONAS[activePersona].promptTemplate);
  }, [activePersona, personas]);

  useEffect(() => {
    if (isOpen) refreshState();
  }, [isOpen, activePersona, refreshState]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    setTemplate(activePersona, editingText);
    setCustomized((prev) => ({
      ...prev,
      [activePersona]: editingText !== PERSONAS[activePersona].promptTemplate,
    }));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleReset = () => {
    resetTemplate(activePersona);
    setEditingText(PERSONAS[activePersona].promptTemplate);
    setCustomized((prev) => ({ ...prev, [activePersona]: false }));
  };

  const handleTabChange = (personaId: PersonaId) => {
    // Auto-save current before switching
    if (editingText !== getTemplate(activePersona)) {
      setTemplate(activePersona, editingText);
      setCustomized((prev) => ({
        ...prev,
        [activePersona]: editingText !== PERSONAS[activePersona].promptTemplate,
      }));
    }
    setActivePersona(personaId);
    setEditingText(getTemplate(personaId));
    setShowPreview(false);
  };

  const insertVariable = (variable: string) => {
    setEditingText((prev) => prev + " " + variable);
  };

  const handleCopyHint = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedHint(variable);
    setTimeout(() => setCopiedHint(null), 1500);
  };

  // Build preview by replacing variables with sample values
  const previewText = editingText.replace(
    /\{\{(ticket\.title|ticket\.description|otherFeedback|persona\.name|persona\.expertise)\}\}/g,
    (_match, key) => SAMPLE_VALUES[`{{${key}}}`] ?? `[${key}]`
  );

  const activePersonaData = personas.find((p) => p.id === activePersona)!;
  const isCustomized = customized[activePersona] ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-deep/95 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-raised border border-border-visible rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
              <Settings size={16} className="text-gold" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink-primary">
                Prompt Templates
              </h2>
              <p className="text-xs text-ink-muted">
                Customize how each persona weighs in on tickets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-overlay transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-ink-muted" />
          </button>
        </div>

        {/* Persona Tabs */}
        <div className="flex border-b border-border-subtle shrink-0 overflow-x-auto">
          {personas.map((persona) => (
            <button
              key={persona.id}
              onClick={() => handleTabChange(persona.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${
                  activePersona === persona.id
                    ? `${PERSONA_TAB_ACCENTS[persona.id]} border-b-2 -mb-[1px]`
                    : "border-transparent text-ink-muted hover:text-ink-secondary"
                }`}
            >
              <span>{persona.emoji}</span>
              <span>{persona.label}</span>
              {customized[persona.id] && (
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Variable hint chips */}
          <div>
            <p className="text-xs text-ink-muted mb-2 font-medium uppercase tracking-wider">
              Available Variables
            </p>
            <div className="flex flex-wrap gap-2">
              {VARIABLE_HINTS.map((v) => (
                <div key={v} className="flex items-center gap-1">
                  <button
                    onClick={() => insertVariable(v)}
                    className="px-2.5 py-1 rounded-md text-xs font-mono bg-elevated border border-border-subtle text-ink-secondary hover:text-gold hover:border-gold/30 transition-colors cursor-pointer"
                    title={`Insert ${v}`}
                  >
                    {v}
                  </button>
                  <button
                    onClick={() => handleCopyHint(v)}
                    className="p-1 rounded hover:bg-overlay transition-colors"
                    title="Copy variable"
                  >
                    {copiedHint === v ? (
                      <Check size={12} className="text-olive" />
                    ) : (
                      <Copy size={12} className="text-ink-ghost" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-ink-muted font-medium uppercase tracking-wider">
                {activePersonaData.emoji} {activePersonaData.label} Template
                {isCustomized && (
                  <span className="ml-2 text-gold">(customized)</span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors ${
                    showPreview
                      ? "bg-gold/10 text-gold border border-gold/20"
                      : "text-ink-muted hover:text-ink-secondary border border-transparent"
                  }`}
                >
                  <Eye size={14} />
                  Preview
                </button>
              </div>
            </div>

            {showPreview ? (
              <div className="p-4 rounded-lg bg-deep border border-border-subtle min-h-[200px]">
                <pre className="text-sm text-ink-primary whitespace-pre-wrap font-sans leading-relaxed">
                  {previewText}
                </pre>
              </div>
            ) : (
              <textarea
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                className="w-full min-h-[220px] p-4 rounded-lg bg-base border border-border-subtle text-sm text-ink-primary font-mono leading-relaxed resize-y focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-colors"
                placeholder="Enter your custom prompt template..."
                spellCheck={false}
              />
            )}
          </div>

          {/* Persona info card */}
          <div
            className={`p-3 rounded-lg border ${PERSONA_ACCENTS[activePersona]}`}
          >
            <p className="text-xs font-medium mb-1">
              {activePersonaData.emoji} {activePersonaData.label} Expertise
            </p>
            <p className="text-xs opacity-80">{activePersonaData.expertise}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle shrink-0">
          <button
            onClick={handleReset}
            disabled={!isCustomized}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-ink-muted hover:text-cardinal disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw size={14} />
            Reset to default
          </button>

          <div className="flex items-center gap-3">
            {savedFlash && (
              <span className="text-xs text-olive animate-in fade-in">
                ✓ Saved
              </span>
            )}
            <button
              onClick={handleSave}
              className="btn-primary text-sm px-6 py-2 rounded-lg"
            >
              Save Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
