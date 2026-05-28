import { PersonaId } from "@/lib/types";
import { Wrench, Palette, NotebookText, FlaskConical } from "lucide-react";

const iconMap: Record<PersonaId, React.ComponentType<{ size?: number; className?: string }>> = {
  engineer: Wrench,
  designer: Palette,
  "product-owner": NotebookText,
  qa: FlaskConical,
};

const colorMap: Record<PersonaId, string> = {
  engineer: "text-blue-400",
  designer: "text-purple-400",
  "product-owner": "text-emerald-400",
  qa: "text-amber-400",
};

interface PersonaIconProps {
  personaId: PersonaId;
  size?: number;
  className?: string;
}

export function PersonaIcon({ personaId, size = 16, className = "" }: PersonaIconProps) {
  const Icon = iconMap[personaId];
  const defaultColor = colorMap[personaId];
  return <Icon size={size} className={`${defaultColor} ${className}`} />;
}
