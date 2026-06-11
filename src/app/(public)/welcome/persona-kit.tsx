import { Code, Compass, Microscope, PenTool, type LucideIcon } from "lucide-react";
import styles from "./welcome.module.css";

/* ------------------------------------------------------------------ */
/* Persona meta — repo roles mapped onto the marketing kit's palette   */
/* Shared by the marketing page and the self-playing hero demo. These  */
/* are pure presentational helpers (no hooks), so they render in both   */
/* server and client components.                                        */
/* ------------------------------------------------------------------ */

export type RoleKey = "engineer" | "designer" | "product" | "qa";

export interface RoleMeta {
  label: string;
  name: string;
  color: string;
  icon: LucideIcon;
  blurb: string;
}

export const ROLE: Record<RoleKey, RoleMeta> = {
  engineer: {
    label: "Engineer",
    name: "Ada",
    color: "var(--persona-eng-500)",
    icon: Code,
    blurb: "Scaffolds services, writes the code, opens the PR.",
  },
  designer: {
    label: "Designer",
    name: "Iris",
    color: "var(--persona-des-500)",
    icon: PenTool,
    blurb: "Shapes the surface, builds the empty-states, keeps it warm.",
  },
  product: {
    label: "Product Owner",
    name: "Pam",
    color: "var(--persona-prod-500)",
    icon: Compass,
    blurb: "Holds the thread, writes the spec, keeps the goal in view.",
  },
  qa: {
    label: "QA",
    name: "Ray",
    color: "var(--persona-res-500)",
    icon: Microscope,
    blurb: "Checks the edge cases, writes the criteria, validates.",
  },
};

export const ROLE_ORDER: RoleKey[] = ["engineer", "designer", "product", "qa"];

const AVATAR_SIZES = { sm: 30, md: 40, lg: 52 } as const;

export function PersonaAvatar({
  role,
  size = "md",
  tagIcon = false,
}: {
  role: RoleKey;
  size?: keyof typeof AVATAR_SIZES;
  tagIcon?: boolean;
}) {
  const meta = ROLE[role];
  const px = AVATAR_SIZES[size];
  const TagIcon = meta.icon;
  const initials = meta.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={styles.pav}
      style={
        {
          "--pav-size": `${px}px`,
          "--pav-color": meta.color,
        } as React.CSSProperties
      }
    >
      <span className={styles.pavFace} style={{ fontSize: Math.round(px * 0.4) }}>
        {initials}
      </span>
      {tagIcon && (
        <span className={styles.pavTag}>
          <TagIcon strokeWidth={2.5} />
        </span>
      )}
    </span>
  );
}

export function PersonaBadge({ role }: { role: RoleKey }) {
  const meta = ROLE[role];
  return (
    <span
      className={`${styles.pbadge} ${styles.pbadgeOutline}`}
      style={{ "--pb-color": meta.color } as React.CSSProperties}
    >
      <span className={styles.pbadgeDot} />
      {meta.label}
    </span>
  );
}
