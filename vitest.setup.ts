import '@testing-library/jest-dom/vitest'

// jsdom does not implement scrollIntoView, which is used by CommandPalette
Element.prototype.scrollIntoView = vi.fn() as unknown as Element['scrollIntoView'];

