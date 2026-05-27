"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

export interface ToastProps {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
  onClose: (id: string) => void;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const borderColorMap = {
  success: "border-l-gold",
  error: "border-l-cardinal",
  info: "border-l-blue-steel",
};

const iconColorMap = {
  success: "text-gold",
  error: "text-cardinal",
  info: "text-blue-steel",
};

export function Toast({ id, message, type = "info", onClose }: ToastProps) {
  const [exiting, setExiting] = useState(false);
  const [entering, setEntering] = useState(true);

  useEffect(() => {
    // Trigger enter animation on next frame
    const enterFrame = requestAnimationFrame(() => {
      setEntering(false);
    });
    return () => cancelAnimationFrame(enterFrame);
  }, []);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onClose(id), 300);
  };

  const Icon = iconMap[type];

  return (
    <div
      className={`
        bg-raised border border-border-visible rounded-xl p-4
        border-l-4 ${borderColorMap[type]}
        flex items-start gap-3 shadow-lg
        min-w-80 max-w-96
        transition-all duration-300 ease-out
        ${entering ? "translate-x-full opacity-0" : ""}
        ${exiting ? "translate-x-full opacity-0" : ""}
        ${!entering && !exiting ? "translate-x-0 opacity-100" : ""}
      `}
      role="alert"
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${iconColorMap[type]}`} />
      <p className="flex-1 text-sm text-ink-primary leading-snug">{message}</p>
      <button
        onClick={handleClose}
        className="shrink-0 text-ink-muted hover:text-ink-primary transition-colors mt-0.5"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
}
