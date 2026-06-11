import { PersonaId } from "@/lib/types";
import { Code, PenTool, Compass, Microscope } from "lucide-react";

const iconMap: Record<PersonaId, React.ComponentType<{ size?: number; className?: string }>> = {
  engineer: Code,
  designer: PenTool,
  "product-owner": Compass,
  qa: Microscope,
};

const colorMap: Record<PersonaId, string> = {
  engineer: "text-[var(--persona-eng-500)]",
  designer: "text-[var(--persona-des-500)]",
  "product-owner": "text-[var(--persona-prod-500)]",
  qa: "text-[var(--persona-res-500)]",
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
