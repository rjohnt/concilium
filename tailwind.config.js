/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#dbe4ff",
          200: "#bac8ff",
          300: "#91a7ff",
          400: "#748ffc",
          500: "#5c7cfa",
          600: "#4c6ef5",
          700: "#4263eb",
          800: "#3b5bdb",
          900: "#364fc7",
        },
        ink: {
          primary: "#f5f0e8",
          secondary: "#b8a99a",
          muted: "#7a6e63",
        },
        cardinal: {
          DEFAULT: "#b91c3b",
          400: "#fb7185",
          900: "#881337",
        },
        elevated: {
          DEFAULT: "#2a2420",
        },
      },
    },
  },
  plugins: [],
};
