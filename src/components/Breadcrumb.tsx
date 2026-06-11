"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbProps {
  customLabels?: Record<string, string>;
  className?: string;
}

const SHALLOW_PAGES = new Set(["/", "/new", "/login", "/signup"]);

const SHALLOW_PREFIXES: string[] = [];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildCrumbs(
  segments: string[],
  customLabels: Record<string, string>,
) {
  const crumbs: { label: string; href?: string }[] = [];

  // First segment always: Dashboard -> link to /
  crumbs.push({
    label: customLabels["/"] || "Dashboard",
    href: "/",
  });

  if (segments.length === 0) return crumbs;

  const [route, id] = segments;

  if (route === "prompt") {
    // Dashboard > Ticket TIX-001 > Prompt Session
    const ticketLabel =
      customLabels[`ticket/${id}`] || `Ticket ${id}`;
    crumbs.push({ label: ticketLabel, href: `/ticket/${id}` });
    crumbs.push({
      label: customLabels["prompt"] || "Prompt Session",
    });
  } else {
    // Dashboard > Route > ID
    const routeLabel = customLabels[route] || capitalize(route);
    crumbs.push({ label: routeLabel, href: `/${route}` });

    const idLabel =
      customLabels[`${route}/${id}`] || customLabels[id] || id;
    crumbs.push({ label: idLabel });
  }

  return crumbs;
}

export function Breadcrumb({
  customLabels = {},
  className = "",
}: BreadcrumbProps) {
  const pathname = usePathname();

  // Auto-hide on shallow pages
  if (SHALLOW_PAGES.has(pathname)) return null;

  // Auto-hide on shallow prefix matches (e.g. /share/abc-123)
  if (SHALLOW_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  const segments = pathname.split("/").filter(Boolean);

  // Also hide if pathname has no meaningful segments
  if (segments.length === 0) return null;

  const crumbs = buildCrumbs(segments, customLabels);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <li
            key={crumb.href || crumb.label}
            className="flex items-center gap-1.5"
          >
            {i > 0 && (
              <ChevronRight
                size={14}
                className="text-ink-ghost shrink-0"
              />
            )}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-ink-muted hover:text-ink-primary transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-gold font-medium">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
