/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "var(--color-brand-50, #fdf8ed)",
          100: "var(--color-brand-100, #f9edc5)",
          200: "var(--color-brand-200, #f2db8a)",
          300: "var(--color-brand-300, #e0c86a)",
          400: "var(--color-brand-400, #d4b75a)",
          500: "var(--color-brand-500, #c9a84c)",
          600: "var(--color-brand-600, #b3943e)",
          700: "var(--color-brand-700, #8a7030)",
          800: "var(--color-brand-800, #6b5624)",
          900: "var(--color-brand-900, #4a3b18)",
        },
        deep: "var(--color-deep, #1a1714)",
        base: "var(--color-base, #211e1a)",
        raised: "var(--color-raised, #29251f)",
        elevated: "var(--color-elevated, #302b24)",
        overlay: "var(--color-overlay, #3a352d)",
        ink: {
          primary: "var(--color-ink-primary, #e8e4db)",
          secondary: "var(--color-ink-secondary, #b8b2a6)",
          muted: "var(--color-ink-muted, #7a7468)",
          ghost: "var(--color-ink-ghost, #4a4540)",
        },
        gold: {
          DEFAULT: "var(--color-gold, #c9a84c)",
          light: "var(--color-gold-light, #e0c86a)",
          dim: "var(--color-gold-dim, #8a7030)",
        },
        cardinal: "var(--color-cardinal, #b84545)",
        olive: "var(--color-olive, #6b8f5e)",
        "blue-steel": "var(--color-blue-steel, #6b8fa8)",
        border: {
          subtle: "var(--color-border-subtle, #2e2a24)",
          visible: "var(--color-border-visible, #3d3830)",
        },
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
