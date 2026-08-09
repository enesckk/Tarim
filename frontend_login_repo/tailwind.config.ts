import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          bg: "#060807",
          surface: "#0A0D0A",
          card: "#0F130F",
          white: "#F5F5F5",
          muted: "#A8A8A8",
          gold: "#D7B36A",
          "gold-warm": "#D8A441",
          olive: "#121712",
          "olive-mid": "#1E261E",
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-outfit)", "SF Pro Display", "Neue Haas Grotesk", "Geist", "sans-serif"],
      },
      boxShadow: {
        "apple-gold": "0 0 25px rgba(215, 179, 106, 0.15)",
        "apple-glow": "0 0 40px rgba(216, 164, 65, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
