"use client";

import { useEffect } from "react";

/**
 * Warns users before leaving the page when they have unsaved changes.
 *
 * - Adds a `beforeunload` listener on `window` when `hasUnsaved` is true.
 * - Removes the listener when `hasUnsaved` becomes false or the component unmounts.
 *
 * @param hasUnsaved – Whether the current form/view has unsaved changes.
 */
export function useUnsavedChangesWarning(hasUnsaved: boolean): void {
  useEffect(() => {
    if (!hasUnsaved) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Legacy: some browsers require returnValue to be set
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved]);
}
