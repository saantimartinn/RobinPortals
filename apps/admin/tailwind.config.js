/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("../../packages/brand/tailwind-preset.cjs")],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};
