"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, CircleX, Info, TriangleAlert, X } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number; // ms, default 4000, 0 = no auto-dismiss
  action?: {
    label: string;
    onClick: () => void;
  };
}

type AddToastInput = Omit<ToastMessage, "id"> & { id?: string };

interface ToastContextValue {
  addToast: (message: AddToastInput) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

// ── ID Generation ──────────────────────────────────────────────────────────

let idCounter = 0;
function generateId(): string {
  return `toast-${Date.now()}-${++idCounter}`;
}

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_TOASTS = 5;
const DEFAULT_DURATION = 4000;

const VARIANT_STYLES: Record<
  ToastVariant,
  { bg: string; border: string; text: string; icon: string }
> = {
  success: {
    bg: "bg-olive/10",
    border: "border-olive/40",
    text: "text-olive",
    icon: "text-olive",
  },
  error: {
    bg: "bg-cardinal/10",
    border: "border-cardinal/40",
    text: "text-cardinal",
    icon: "text-cardinal",
  },
  info: {
    bg: "bg-blue-steel/10",
    border: "border-blue-steel/40",
    text: "text-blue-steel",
    icon: "text-blue-steel",
  },
  warning: {
    bg: "bg-gold/10",
    border: "border-gold/40",
    text: "text-gold",
    icon: "text-gold",
  },
};

const VARIANT_ICONS: Record<ToastVariant, typeof CircleCheck> = {
  success: CircleCheck,
  error: CircleX,
  info: Info,
  warning: TriangleAlert,
};

// ── Context ────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}

// ── ToastItem ──────────────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const styles = VARIANT_STYLES[toast.variant];
  const Icon = VARIANT_ICONS[toast.variant];
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    const duration = toast.duration ?? DEFAULT_DURATION;
    if (duration <= 0) return;
    const timer = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, x: 60, scale: 0.95 },
        transition: { duration: 0.2, ease: "easeOut" as const },
      };

  return (
    <motion.div
      {...animationProps}
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-sm ${styles.bg} ${styles.border}`}
    >
      <Icon size={18} className={`flex-shrink-0 mt-0.5 ${styles.icon}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${styles.text}`}>{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-ink-muted mt-0.5">{toast.description}</p>
        )}
        {toast.action && (
          <button
            onClick={() => {
              toast.action!.onClick();
              onDismiss(toast.id);
            }}
            className={`mt-2 text-xs font-medium ${styles.text} hover:underline focus:outline-none`}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-overlay/50 transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

// ── ToastContainer ─────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  dismissToast,
}: {
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
}) {
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── ToastProvider ──────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (input: AddToastInput): string => {
      const id = input.id ?? generateId();
      const toast: ToastMessage = {
        id,
        variant: input.variant,
        title: input.title,
        description: input.description,
        duration: input.duration,
        action: input.action,
      };

      setToasts((prev) => {
        // Dedup by id
        if (prev.some((t) => t.id === id)) return prev;
        const next = [...prev, toast];
        // Enforce max 5: remove oldest (first in array)
        while (next.length > MAX_TOASTS) {
          next.shift();
        }
        return next;
      });

      return id;
    },
    [],
  );

  // Escape key dismisses the topmost (newest) toast
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setToasts((prev) => {
        if (prev.length === 0) return prev;
        return prev.slice(0, -1);
      });
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, dismissToast, dismissAll }}>
      {children}
      <ToastContainer toasts={toasts} dismissToast={dismissToast} />
    </ToastContext.Provider>
  );
}
