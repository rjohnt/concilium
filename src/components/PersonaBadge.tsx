import { PersonaId } from "@/lib/types";
import { getPersona } from "@/lib/personas";
import { PersonaIcon } from "./PersonaIcon";
import { Check } from "lucide-react";

const paletteMap: Record<PersonaId, { color: string; tint: string }> = {
  engineer: { color: "var(--persona-eng-500)", tint: "var(--persona-eng-100)" },
  designer: { color: "var(--persona-des-500)", tint: "var(--persona-des-100)" },
  "product-owner": { color: "var(--persona-prod-500)", tint: "var(--persona-prod-100)" },
  qa: { color: "var(--persona-res-500)", tint: "var(--persona-res-100)" },
};

export function PersonaBadge({
  personaId,
  approved,
  size = "sm",
}: {
  personaId: PersonaId;
  approved?: boolean;
  size?: "sm" | "lg";
}) {
  const persona = getPersona(personaId);
  const palette = paletteMap[personaId] ?? paletteMap.engineer;
  const personaLabel = persona?.label ?? personaId;
  const personaExpertise = persona?.expertise ?? "";
  const iconSize = size === "lg" ? 16 : 14;
  const sizeClasses =
    size === "lg"
      ? "h-8 px-3 text-sm gap-2 whitespace-nowrap"
      : "h-7 px-2.5 text-xs gap-1.5 whitespace-nowrap";

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sizeClasses} transition-colors`}
      style={
        approved
          ? { backgroundColor: palette.color, color: "#fff" }
          : { backgroundColor: palette.tint, color: palette.color }
      }
      title={`${personaLabel}: ${personaExpertise}`}
    >
      <PersonaIcon
        personaId={personaId}
        size={iconSize}
        className={approved ? "!text-white" : ""}
      />
      <span>{personaLabel}</span>
      {approved && <Check size={iconSize} className="ml-0.5" />}
    </span>
  );
}
