import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        peri: {
          50: "#F0F0FF",
          100: "#E0E1FF",
          200: "#C7C8FF",
          300: "#B5BAFF",
          400: "#9FA1FF",
          450: "#8B8DF7",
          500: "#7375E8",
          600: "#5050CE",
          700: "#3F3CAA",
          800: "#353181",
          900: "#29255B",
        },
        ink: {
          50: "#F8F9FC",
          100: "#EEEFF6",
          200: "#DFE1EC",
          300: "#C8CADA",
          400: "#9C9EB4",
          450: "#8D8EA5",
          500: "#71738E",
          600: "#52536F",
          700: "#363654",
          800: "#23233E",
          900: "#141429",
        },
        sky: {
          50: "#E5F6FF",
          100: "#AEE2FF",
          500: "#1F77AD",
          600: "#11598D",
          700: "#0C426E",
        },
        mint: {
          50: "#EFFDF2",
          100: "#D9F9DF",
          200: "#AEE0BE",
          500: "#2F935E",
          600: "#1D7247",
          700: "#155B3A",
        },
        rose: {
          50: "#FFEBEE",
          100: "#FDD8DE",
          200: "#F4B9C3",
          500: "#CB2A4A",
          600: "#A71B37",
          700: "#85142B",
        },
        amber: {
          50: "#FFF7E5",
          100: "#FDEAC4",
          200: "#F5CC84",
          500: "#B6690C",
          600: "#935106",
          700: "#743D06",
        },
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        full: "9999px",
      },
      boxShadow: {
        "harmony-1": "0 1px 2px rgba(20,20,41,0.06)",
        "harmony-2": "0 2px 8px rgba(20,20,41,0.08)",
        "harmony-3": "0 8px 24px rgba(20,20,41,0.10)",
      },
      fontSize: {
        display: ["2.5rem", { lineHeight: "3rem" }],
        h1: ["2rem", { lineHeight: "2.5rem" }],
        h2: ["1.5rem", { lineHeight: "2rem" }],
        h3: ["1.25rem", { lineHeight: "1.75rem" }],
        "body-lg": ["1.125rem", { lineHeight: "1.75rem" }],
        body: ["1rem", { lineHeight: "1.5rem" }],
        "body-sm": ["0.875rem", { lineHeight: "1.25rem" }],
        caption: ["0.8125rem", { lineHeight: "1.125rem" }],
        label: ["0.875rem", { lineHeight: "1.25rem" }],
        button: ["1rem", { lineHeight: "1.5rem" }],
        "button-sm": ["0.875rem", { lineHeight: "1.25rem" }],
        overline: ["0.75rem", { lineHeight: "1rem" }],
        "numeric-lg": ["1.25rem", { lineHeight: "1.75rem" }],
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
};

export default config;
