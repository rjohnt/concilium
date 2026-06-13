import type { Tag } from "@/lib/types";
import { Tag as TagIcon } from "lucide-react";

interface TagChipDisplayProps {
  tag: Tag;
  mode: "display";
}

interface TagChipToggleProps {
  tag: Tag;
  mode: "toggle";
  selected: boolean;
  onToggle: (tagId: string) => void;
}

type TagChipProps = TagChipDisplayProps | TagChipToggleProps;

/**
 * TagChip – a versatile tag/label pill component.
 *
 * "display" mode: a read-only badge (span).
 * "toggle" mode: a button with aria-pressed for multi-select forms and filters.
 */
export function TagChip(props: TagChipProps) {
  const { tag, mode } = props;

  if (mode === "display") {
    return (
      <span
        className={`badge border ${tag.color}`}
        aria-label={tag.label}
      >
        {tag.label}
      </span>
    );
  }

  // mode === "toggle"
  const { selected, onToggle } = props;

  return (
    <button
      type="button"
      onClick={() => onToggle(tag.id)}
      aria-pressed={selected}
      className={`badge border cursor-pointer transition-all duration-150 select-none ${
        selected
          ? `${tag.color} ring-1 ring-[var(--coral-400)] ring-offset-1 ring-offset-[var(--bg-app)]`
          : "border-border-subtle text-ink-muted hover:text-ink-primary hover:border-border-default"
      }`}
    >
      {selected && <TagIcon size={10} aria-hidden />}
      {tag.label}
    </button>
  );
}
