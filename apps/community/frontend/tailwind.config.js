import brand from "../../../packages/brand/tailwind-preset.cjs";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [brand],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../portal/portal-source/src/application/BookingsPortal.jsx",
    "../../portal/portal-source/src/application/payments/InvoiceReceipt.jsx",
    "../../portal/portal-source/src/ui.jsx",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
