import "@testing-library/jest-dom/vitest";

// Ensure localStorage is available in jsdom test environment.
// jsdom's localStorage requires a non-opaque origin; vitest config
// sets the URL, but some versions need this fallback.
if (typeof globalThis.localStorage === "undefined" || typeof (globalThis.localStorage as any)?.getItem !== "function") {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (index: number) => [...store.keys()][index] ?? null,
  };
}
