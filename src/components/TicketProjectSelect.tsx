"use client";

import { useEffect, useState } from "react";
import { Project } from "@/lib/types";

interface TicketProjectSelectProps {
  /** Currently assigned project id, or null for a standalone ticket. */
  value: string | null;
  /** Called with the new project id (null to unassign). */
  onChange: (projectId: string | null) => void;
}

/**
 * Project assignment for a ticket — the link that makes a build target the
 * project's repo (clone, push concilium/<ticket>, open a PR). Without an
 * assigned project, builds run in a standalone local workspace.
 */
export function TicketProjectSelect({ value, onChange }: TicketProjectSelectProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: { projects: Project[] }) => {
        if (!cancelled) setProjects(data.projects);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const assigned = projects.find((p) => p.id === value);

  return (
    <div>
      <p className="text-xs font-medium text-ink-muted mb-2">Project</p>
      <select
        aria-label="Ticket project"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="bg-elevated border border-border-visible rounded-lg px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      >
        <option value="">No project</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
        {/* Keep an unknown assignment visible instead of silently clearing it */}
        {value && !assigned && <option value={value}>{value}</option>}
      </select>
      <p className="mt-1.5 text-xs text-ink-muted">
        {loadError
          ? "Couldn't load projects."
          : assigned?.repoUrl
            ? `Builds clone ${assigned.repoUrl} and push a ticket branch.`
            : "Assign a project with a repository to push build branches."}
      </p>
    </div>
  );
}
