/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ===== Concilium DS palette ===== */
        warm: {
          50: "var(--warm-50)",
          100: "var(--warm-100)",
          150: "var(--warm-150)",
          200: "var(--warm-200)",
          300: "var(--warm-300)",
          400: "var(--warm-400)",
        },
        coral: {
          50: "var(--coral-50)",
          100: "var(--coral-100)",
          200: "var(--coral-200)",
          400: "var(--coral-400)",
          500: "var(--coral-500)",
          600: "var(--coral-600)",
          700: "var(--coral-700)",
        },
        "persona-eng": {
          50: "var(--persona-eng-50)",
          100: "var(--persona-eng-100)",
          400: "var(--persona-eng-400)",
          500: "var(--persona-eng-500)",
        },
        "persona-des": {
          50: "var(--persona-des-50)",
          100: "var(--persona-des-100)",
          400: "var(--persona-des-400)",
          500: "var(--persona-des-500)",
        },
        "persona-prod": {
          50: "var(--persona-prod-50)",
          100: "var(--persona-prod-100)",
          400: "var(--persona-prod-400)",
          500: "var(--persona-prod-500)",
        },
        "persona-res": {
          50: "var(--persona-res-50)",
          100: "var(--persona-res-100)",
          400: "var(--persona-res-400)",
          500: "var(--persona-res-500)",
        },
        success: {
          100: "var(--success-100)",
          500: "var(--success-500)",
        },
        warning: {
          100: "var(--warning-100)",
          500: "var(--warning-500)",
        },
        danger: {
          100: "var(--danger-100)",
          500: "var(--danger-500)",
        },
        info: {
          100: "var(--info-100)",
          500: "var(--info-500)",
        },

        /* ===== Shadcn-style names ===== */
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--color-border-subtle)",
          visible: "var(--color-border-visible)",
        },
        input: "var(--input)",
        ring: "var(--ring)",
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: {
            DEFAULT: "var(--sidebar-primary)",
            foreground: "var(--sidebar-primary-foreground)",
          },
          accent: {
            DEFAULT: "var(--sidebar-accent)",
            foreground: "var(--sidebar-accent-foreground)",
          },
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },

        /* ===== Backward-compatible aliases ===== */
        brand: {
          50: "var(--color-brand-50)",
          100: "var(--color-brand-100)",
          200: "var(--color-brand-200)",
          300: "var(--color-brand-300)",
          400: "var(--color-brand-400)",
          500: "var(--color-brand-500)",
          600: "var(--color-brand-600)",
          700: "var(--color-brand-700)",
          800: "var(--color-brand-800)",
          900: "var(--color-brand-900)",
        },
        deep: "var(--color-deep)",
        base: "var(--color-base)",
        raised: "var(--color-raised)",
        elevated: "var(--color-elevated)",
        overlay: "var(--color-overlay)",
        ink: {
          900: "var(--ink-900)",
          700: "var(--ink-700)",
          500: "var(--ink-500)",
          400: "var(--ink-400)",
          300: "var(--ink-300)",
          primary: "var(--color-ink-primary)",
          secondary: "var(--color-ink-secondary)",
          muted: "var(--color-ink-muted)",
          ghost: "var(--color-ink-ghost)",
        },
        gold: {
          DEFAULT: "var(--color-gold)",
          light: "var(--color-gold-light)",
          dim: "var(--color-gold-dim)",
        },
        cardinal: "var(--color-cardinal)",
        olive: "var(--color-olive)",
        "blue-steel": "var(--color-blue-steel)",
      },
      fontFamily: {
        sans: ["var(--font-hanken)", "Hanken Grotesk", "system-ui", "sans-serif"],
        heading: ["var(--font-bricolage)", "Bricolage Grotesque", "Hanken Grotesk", "system-ui", "sans-serif"],
        display: ["var(--font-bricolage)", "Bricolage Grotesque", "Hanken Grotesk", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        focus: "var(--shadow-focus)",
      },
      transitionTimingFunction: {
        "out-soft": "var(--ease-out)",
        spring: "var(--ease-spring)",
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
