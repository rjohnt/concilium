"use client";

import { useEffect } from "react";

/**
 * Legacy-style modifier flags with "don't care" semantics.
 *
 * When a modifier is `undefined`, the handler does **not** check whether
 * that key is pressed — it matches regardless.  This lets you write
 * shortcuts like "I want Meta, and I don't care about Ctrl".
 *
 * @example
 * ```ts
 * // Meta must be pressed; Ctrl is irrelevant
 * useKeyboardShortcut("k", open, { meta: true })
 * ```
 */
interface Modifiers {
  meta?: boolean;
  ctrl?: boolean;
}

/**
 * Which modifier key (or combination) must be held for the shortcut.
 *
 * - `"meta"`      – Cmd on macOS, Windows key on Windows
 * - `"ctrl"`      – Ctrl key
 * - `"metaOrCtrl"` – either Meta **or** Ctrl (cross-platform convenience)
 */
type ModifierType = "meta" | "ctrl" | "metaOrCtrl";

/**
 * Registers a global `keydown` listener that fires `callback` when the
 * specified key is pressed together with the requested modifier(s).
 *
 * ## "Don't care" modifier semantics (legacy `Modifiers` object)
 *
 * When you pass a `Modifiers` object, any modifier whose value is
 * `undefined` is **not checked**.  This is intentional so you can write
 * shortcuts that work in a single handler regardless of modifier state.
 *
 * @param key           – Keyboard key name (case-insensitive), e.g. `"k"`, `"Escape"`
 * @param callback      – Function to run when the shortcut fires
 * @param modifiersOrType – Either a `Modifiers` object (legacy) or a `ModifierType` string
 * @param preventDefault – Whether to call `event.preventDefault()`.
 *                         Defaults to `true`.  Set to `false` when other
 *                         handlers need to see the event.
 *
 * @example
 * // Open palette with Meta+K **or** Ctrl+K (recommended)
 * useKeyboardShortcut("k", open, "metaOrCtrl")
 *
 * @example
 * // Only Meta+K, ignore Ctrl+K
 * useKeyboardShortcut("k", open, "meta")
 *
 * @example
 * // Require Meta to be held, don't care about Ctrl (legacy API)
 * useKeyboardShortcut("k", open, { meta: true })
 *
 * @example
 * // Require Meta held AND Ctrl NOT held
 * useKeyboardShortcut("k", open, { meta: true, ctrl: false })
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  modifiersOrType?: Modifiers | ModifierType,
  preventDefault = true,
) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const keyMatch = event.key.toLowerCase() === key.toLowerCase();
      if (!keyMatch) return;

      // ── Simple string modifier (preferred) ──────────────────────
      if (typeof modifiersOrType === "string") {
        let modMatch = false;
        switch (modifiersOrType) {
          case "meta":
            modMatch = event.metaKey && !event.ctrlKey;
            break;
          case "ctrl":
            modMatch = event.ctrlKey && !event.metaKey;
            break;
          case "metaOrCtrl":
            modMatch = event.metaKey || event.ctrlKey;
            break;
        }
        if (!modMatch) return;
      }
      // ── Legacy Modifiers object (don't-care semantics) ──────────
      else if (modifiersOrType) {
        const metaMatch =
          modifiersOrType.meta === undefined ||
          event.metaKey === modifiersOrType.meta;
        const ctrlMatch =
          modifiersOrType.ctrl === undefined ||
          event.ctrlKey === modifiersOrType.ctrl;
        if (!metaMatch || !ctrlMatch) return;
      }
      // ── No modifier specified → fire on bare key press ──────────
      // (allowed; matches any modifier state including none)

      if (preventDefault) {
        event.preventDefault();
      }
      callback();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback, modifiersOrType, preventDefault]);
}
