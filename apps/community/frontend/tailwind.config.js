import brand from "../../../packages/brand/tailwind-preset.cjs";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [brand],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
