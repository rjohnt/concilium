"use client";

import { useEffect } from "react";

interface Modifiers {
  meta?: boolean;
  ctrl?: boolean;
}

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  modifiers?: Modifiers,
) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const keyMatch = event.key.toLowerCase() === key.toLowerCase();

      if (!keyMatch) return;

      const metaMatch =
        modifiers?.meta === undefined || event.metaKey === modifiers.meta;
      const ctrlMatch =
        modifiers?.ctrl === undefined || event.ctrlKey === modifiers.ctrl;

      if (metaMatch && ctrlMatch) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback, modifiers]);
}
