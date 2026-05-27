import { Persona, PersonaId } from "@/lib/types";
import { getPersona } from "@/lib/personas";

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
  const sizeClasses =
    size === "lg" ? "px-3 py-1 text-sm gap-2" : "px-2 py-0.5 text-xs gap-1";

  return (
    <span
      className={`inline-flex items-center rounded-full ${sizeClasses} ${
        approved ? `${persona.color} text-white` : "bg-gray-800 text-gray-400"
      } transition-colors`}
      title={`${persona.label}: ${persona.expertise}`}
    >
      <span>{persona.emoji}</span>
      <span>{persona.label}</span>
      {approved && <span className="ml-0.5">✓</span>}
    </span>
  );
}
