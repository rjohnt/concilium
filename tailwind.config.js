/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf8ed",
          100: "#f9edc5",
          200: "#f2db8a",
          300: "#e0c86a",
          400: "#d4b75a",
          500: "#c9a84c",
          600: "#b3943e",
          700: "#8a7030",
          800: "#6b5624",
          900: "#4a3b18",
        },
        deep: "#1a1714",
        base: "#211e1a",
        raised: "#29251f",
        elevated: "#302b24",
        overlay: "#3a352d",
        ink: {
          primary: "#e8e4db",
          secondary: "#b8b2a6",
          muted: "#7a7468",
          ghost: "#4a4540",
        },
        gold: {
          DEFAULT: "#c9a84c",
          light: "#e0c86a",
          dim: "#8a7030",
        },
        cardinal: "#b84545",
        olive: "#6b8f5e",
        "blue-steel": "#6b8fa8",
        border: {
          subtle: "#2e2a24",
          visible: "#3d3830",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
