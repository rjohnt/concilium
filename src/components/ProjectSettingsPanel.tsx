"use client";

import { useState, useEffect, useCallback } from "react";
import { X, FolderGit2 } from "lucide-react";
import { Project, SandboxProvider, SANDBOX_PROVIDERS } from "@/lib/types";

interface ProjectSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDER_LABELS: Record<SandboxProvider, string> = {
  local: "Local",
  docker: "Docker",
  daytona: "Daytona",
};

/**
 * Minimal project settings: name, repo URL, default branch, sandbox provider,
 * and a create-PR toggle. Edits the first project (creating it on first save)
 * via /api/projects.
 */
export function ProjectSettingsPanel({ isOpen, onClose }: ProjectSettingsPanelProps) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [sandboxProvider, setSandboxProvider] = useState<SandboxProvider>("local");
  const [createPr, setCreatePr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyProject = useCallback((project: Project) => {
    setProjectId(project.id);
    setName(project.name);
    setRepoUrl(project.repoUrl ?? "");
    setDefaultBranch(project.defaultBranch || "main");
    setSandboxProvider(project.sandboxProvider);
    setCreatePr(project.createPr);
  }, []);

  // Load the project when the panel opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSaved(false);

    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: { projects: Project[] }) => {
        if (cancelled) return;
        if (data.projects.length > 0) applyProject(data.projects[0]);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load project settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, applyProject]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);

    const payload = {
      name: name.trim(),
      repoUrl: repoUrl.trim() || null,
      defaultBranch: defaultBranch.trim() || "main",
      sandboxProvider,
      createPr,
    };

    try {
      const res = await fetch(
        projectId ? `/api/projects?id=${encodeURIComponent(projectId)}` : "/api/projects",
        {
          method: projectId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      const data: { project: Project } = await res.json();
      applyProject(data.project);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save project settings.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full bg-elevated border border-border-visible rounded-lg px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted/50 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md mx-4 mt-16 sm:mt-0 sm:mx-0 max-h-[80vh] overflow-y-auto rounded-xl bg-raised border border-border-visible shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-raised/95 backdrop-blur-sm rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <FolderGit2 size={18} className="text-gold" />
            <h2 className="text-base font-semibold text-ink-primary">Project Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-elevated transition-colors"
            aria-label="Close project settings"
          >
            <X size={16} className="text-ink-muted" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {loading ? (
            <p className="text-sm text-ink-muted py-6 text-center">Loading…</p>
          ) : (
            <>
              <div>
                <label htmlFor="project-name" className="block text-xs font-medium text-ink-muted mb-1.5">
                  Project name
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My project"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="project-repo-url" className="block text-xs font-medium text-ink-muted mb-1.5">
                  Repository URL
                </label>
                <input
                  id="project-repo-url"
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/org/repo"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="project-default-branch" className="block text-xs font-medium text-ink-muted mb-1.5">
                  Default branch
                </label>
                <input
                  id="project-default-branch"
                  type="text"
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  placeholder="main"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="project-sandbox-provider" className="block text-xs font-medium text-ink-muted mb-1.5">
                  Sandbox provider
                </label>
                <select
                  id="project-sandbox-provider"
                  value={sandboxProvider}
                  onChange={(e) => setSandboxProvider(e.target.value as SandboxProvider)}
                  className={inputClass}
                >
                  {SANDBOX_PROVIDERS.map((provider) => (
                    <option key={provider} value={provider}>
                      {PROVIDER_LABELS[provider]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Create-PR toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-deep/60 border border-border-subtle/60">
                <div>
                  <p className="text-sm font-medium text-ink-primary">Open a pull request</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    After a successful build, open a PR instead of committing to the branch
                  </p>
                </div>
                <button
                  onClick={() => setCreatePr((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    createPr ? "bg-gold" : "bg-elevated border border-border-visible"
                  }`}
                  role="switch"
                  aria-checked={createPr}
                  aria-label="Create pull request after build"
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      createPr ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-400" role="alert">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                {saved && <span className="text-xs text-olive">Saved</span>}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gold hover:bg-gold-light text-[#1a1714] transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
