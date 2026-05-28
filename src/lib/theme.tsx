"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type ThemeMode = "dark" | "light";

interface ThemeContextValue {
  mode: ThemeMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "concilium-theme";

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  // 1. Check localStorage for explicit user preference
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;

  // 2. Fall back to system preference
  if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";

  // 3. Default to dark
  return "dark";
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "light") {
    root.setAttribute("data-theme", "light");
    root.classList.add("light");
    root.classList.remove("dark");
  } else {
    root.removeAttribute("data-theme");
    root.classList.add("dark");
    root.classList.remove("light");
  }
  // Store preference
  localStorage.setItem(STORAGE_KEY, mode);
}

export function ThemeProvider({ children }: { children: ReactNode }): React.ReactElement | null {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  // On mount, read initial preference
  useEffect(() => {
    const initial = getInitialMode();
    setMode(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  // Listen for system preference changes (only when no explicit user preference)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Only auto-switch if user hasn't explicitly chosen
      if (!stored) {
        const newMode = e.matches ? "light" : "dark";
        setMode(newMode);
        applyTheme(newMode);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  // Prevent hydration mismatch by not rendering context-dependent children
  // until we know the theme
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
