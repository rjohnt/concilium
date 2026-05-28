import { PersonaId } from "@/lib/types";
import { Wrench, Palette, NotebookText, FlaskConical } from "lucide-react";
import { getPersona } from "@/lib/personas";

const iconMap: Record<PersonaId, React.ComponentType<{ size?: number; className?: string }>> = {
  engineer: Wrench,
  designer: Palette,
  "product-owner": NotebookText,
  qa: FlaskConical,
};

interface PersonaIconProps {
  personaId: PersonaId;
  size?: number;
  className?: string;
}

export function PersonaIcon({ personaId, size = 16, className = "" }: PersonaIconProps) {
  const Icon = iconMap[personaId];
  const persona = getPersona(personaId);
  return <Icon size={size} className={`${persona.iconColor} ${className}`} />;
}
