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

// Mock next/navigation for tests that render dashboard pages directly.
// Individual tests can override with their own mocks if needed.
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
}));
