/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
        sans: ['"DM Sans"', "sans-serif"],
      },
      colors: {
        bg: {
          base: "#0d0f14",
          surface: "#13161e",
          raised: "#1a1e2a",
          border: "#252a38",
        },
        accent: {
          blue: "#4f9cf9",
          green: "#3dd68c",
          amber: "#f5a623",
          red: "#f25f5c",
        },
        text: {
          primary: "#e8eaf0",
          secondary: "#8b92a8",
          muted: "#4e5568",
        },
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease forwards",
        "slide-in": "slide-in 0.3s ease forwards",
      },
    },
  },
  plugins: [],
};
