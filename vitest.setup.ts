import "@testing-library/jest-dom/vitest";

// jsdom does not implement scrollIntoView, which is used by CommandPalette
Element.prototype.scrollIntoView = vi.fn() as unknown as Element["scrollIntoView"];

// Mock framer-motion AnimatePresence to immediately remove exiting children
// since jsdom does not support real animations.
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});
