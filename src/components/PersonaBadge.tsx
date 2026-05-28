import { Persona, PersonaId } from "@/lib/types";
import { getPersona } from "@/lib/personas";
import { PersonaIcon } from "./PersonaIcon";
import { Check } from "lucide-react";

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
  const iconSize = size === "lg" ? 16 : 14;
  const sizeClasses =
    size === "lg" ? "px-3 py-1 text-sm gap-2" : "px-2 py-0.5 text-xs gap-1";

  return (
    <span
      className={`inline-flex items-center rounded-full ${sizeClasses} ${
        approved
          ? `${persona.color} ${persona.textColor}`
          : "bg-overlay text-ink-muted"
      } transition-colors`}
      title={`${persona.label}: ${persona.expertise}`}
    >
      <PersonaIcon personaId={personaId} size={iconSize} />
      <span>{persona.label}</span>
      {approved && <Check size={iconSize} className="ml-0.5" />}
    </span>
  );
}
