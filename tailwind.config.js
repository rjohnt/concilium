/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        deep: "var(--color-deep, #ffffff)",
        base: "var(--color-base, #ffffff)",
        raised: "var(--color-raised, #f8f9ff)",
        elevated: "var(--color-elevated, #f1f3f9)",
        overlay: "var(--color-overlay, #e8eaf6)",
        ink: {
          primary: "var(--color-ink-primary, #0d0f1a)",
          secondary: "var(--color-ink-secondary, #374151)",
          muted: "var(--color-ink-muted, #6b7280)",
          ghost: "var(--color-ink-ghost, #9ca3af)",
        },
        gold: {
          DEFAULT: "var(--color-gold, #4f46e5)",
          light: "var(--color-gold-light, #6366f1)",
          dim: "var(--color-gold-dim, #818cf4)",
        },
        cardinal: "var(--color-cardinal, #dc2626)",
        olive: "var(--color-olive, #059669)",
        "blue-steel": "var(--color-blue-steel, #2563eb)",
        border: {
          subtle: "var(--color-border-subtle, #e8eaf6)",
          visible: "var(--color-border-visible, #d0d4f0)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({ addUtilities }) {
      addUtilities({
        ".scrollbar-none": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
        },
        ".scrollbar-none::-webkit-scrollbar": {
          display: "none",
        },
      });
    },
  ],
};
